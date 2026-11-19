import base64
import json
import re
from typing import Any

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import get_settings

# PII patterns
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d{4}[- ]?){3}\d{4}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
EMAIL_REGEX = re.compile(r"\b([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b")
SENSITIVE_KEY_NAMES = {
    "password",
    "passwd",
    "secret",
    "token",
    "access_token",
    "api_key",
    "apikey",
    "private_key",
    "ssn",
    "credit_card",
    "card_number",
    "cvv",
    "cvc",
}


def get_cipher() -> Fernet:
    """Generate or retrieve a Fernet cipher from ENCRYPTION_KEY or SECRET_KEY."""
    settings = get_settings()
    key_str = settings.ENCRYPTION_KEY or settings.SECRET_KEY

    # Ensure key is a valid 32-byte url-safe base64 string
    try:
        raw_key = key_str.encode("utf-8")
        base64.urlsafe_b64decode(raw_key)
        if len(base64.urlsafe_b64decode(raw_key)) == 32:
            return Fernet(raw_key)
    except Exception:
        pass

    # Derive 32-byte Fernet key deterministically using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"nlp-query-engine-salt-v1",
        iterations=100_000,
    )
    derived = base64.urlsafe_b64encode(kdf.derive(key_str.encode("utf-8")))
    return Fernet(derived)


def encrypt_secret(plain_text: str) -> str:
    """Encrypt a database credential or secret at rest."""
    if not plain_text:
        return ""
    cipher = get_cipher()
    return cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_secret(cipher_text: str) -> str:
    """Decrypt an encrypted credential."""
    if not cipher_text:
        return ""
    cipher = get_cipher()
    return cipher.decrypt(cipher_text.encode("utf-8")).decode("utf-8")


def redact_connection_string(conn_str: str) -> str:
    """Redact passwords and secrets from connection strings for display or logging."""
    from app.core.logging import SENSITIVE_PATTERNS

    redacted = conn_str
    for pattern in SENSITIVE_PATTERNS:
        redacted = pattern.sub(r"\1***REDACTED***\3", redacted)
    return redacted


def mask_sensitive_value(key_name: str, value: Any) -> Any:
    """Mask sensitive PII and confidential values (passwords, tokens, credit cards, SSNs)."""
    if value is None:
        return None

    clean_key = key_name.lower().strip()
    if clean_key in ("credit_card", "card_number", "card"):
        if isinstance(value, str):
            raw = value.replace(" ", "").replace("-", "")
            if len(raw) >= 4:
                return f"****-****-****-{raw[-4:]}"
        return "****-****-****-****"

    if clean_key in SENSITIVE_KEY_NAMES:
        return "***MASKED***"

    if isinstance(value, str):
        # Mask credit cards: preserve last 4 digits
        def mask_cc(match: re.Match[str]) -> str:
            raw = match.group(0).replace(" ", "").replace("-", "")
            return f"****-****-****-{raw[-4:]}"

        # Mask SSN
        def mask_ssn(match: re.Match[str]) -> str:
            raw = match.group(0)
            return f"***-**-{raw[-4:]}"

        # Mask Email: e.g., r***@domain.com
        def mask_email(match: re.Match[str]) -> str:
            user, domain = match.group(1), match.group(2)
            prefix = user[0] if user else "*"
            return f"{prefix}***@{domain}"

        res = CREDIT_CARD_REGEX.sub(mask_cc, value)
        res = SSN_REGEX.sub(mask_ssn, res)
        if "email" in clean_key:
            res = EMAIL_REGEX.sub(mask_email, res)
        return res

    if isinstance(value, dict):
        return {k: mask_sensitive_value(k, v) for k, v in value.items()}

    if isinstance(value, list):
        return [mask_sensitive_value(key_name, v) for v in value]

    return value


def mask_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Mask sensitive columns and PII patterns across a batch of tabular result records."""
    masked_list: list[dict[str, Any]] = []
    for row in records:
        masked_row: dict[str, Any] = {}
        for k, v in row.items():
            masked_row[k] = mask_sensitive_value(k, v)
        masked_list.append(masked_row)
    return masked_list


class SecurityCheckResult:
    def __init__(self, passed: bool, message: str = "") -> None:
        self.passed = passed
        self.message = message


class QuerySecurityScanner:
    """Deep security scanner enforcing strictly read-only execution across SQL, MQL, and Elasticsearch."""

    DISALLOWED_SQL_PATTERNS = [
        re.compile(r"\b(insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+table|drop\s+database)\b", re.IGNORECASE),
        re.compile(r"\b(alter\s+table|create\s+table|create\s+database|truncate\s+table)\b", re.IGNORECASE),
        re.compile(r"\b(grant\s+|revoke\s+|execute\s+|call\s+)\b", re.IGNORECASE),
        re.compile(r"\b(into\s+outfile|into\s+dumpfile|load_file|load\s+data)\b", re.IGNORECASE),
        re.compile(r"\b(pg_sleep|pg_terminate_backend|dblink|xp_cmdshell)\b", re.IGNORECASE),
    ]

    ALLOWED_MQL_STAGES = {
        "$match",
        "$project",
        "$group",
        "$sort",
        "$limit",
        "$skip",
        "$unwind",
        "$lookup",
        "$count",
        "$facet",
        "$addfields",
        "$set",
        "$replaceroot",
        "$bucket",
        "$sample",
    }

    DISALLOWED_MQL_STAGES = {
        "$out",
        "$merge",
        "$where",
        "$accumulator",
        "$function",
    }

    @classmethod
    def scan_sql(cls, sql: str) -> SecurityCheckResult:
        """Scan raw SQL query ensuring it is strictly a single read-only SELECT statement."""
        if not sql or not sql.strip():
            return SecurityCheckResult(passed=False, message="SQL query cannot be empty.")

        clean_sql = sql.strip().rstrip(";")

        # Disallow stacked semicolon queries
        if ";" in clean_sql:
            return SecurityCheckResult(
                passed=False, message="Multiple statements / semicolon stacking is prohibited."
            )

        # Check disallowed regex patterns
        for pattern in cls.DISALLOWED_SQL_PATTERNS:
            match = pattern.search(clean_sql)
            if match:
                return SecurityCheckResult(
                    passed=False,
                    message=f"Disallowed SQL mutation or dangerous directive detected: '{match.group(0)}'.",
                )

        # Must start with SELECT or WITH
        first_word = clean_sql.lstrip().split()[0].upper()
        if first_word not in ("SELECT", "WITH"):
            return SecurityCheckResult(
                passed=False,
                message=f"Only SELECT or WITH queries are permitted. Got '{first_word}'.",
            )

        return SecurityCheckResult(passed=True, message="SQL query passed security scan.")

    @classmethod
    def scan_mql(cls, pipeline: list[dict[str, Any]]) -> SecurityCheckResult:
        """Scan MongoDB aggregation pipeline ensuring only safe, read-only stages are used."""
        if not isinstance(pipeline, list):
            return SecurityCheckResult(passed=False, message="MQL pipeline must be a list of stage objects.")

        for idx, stage in enumerate(pipeline):
            if not isinstance(stage, dict):
                return SecurityCheckResult(passed=False, message=f"Stage at index {idx} must be a dictionary.")

            for stage_name in stage.keys():
                stage_lower = stage_name.lower()
                if stage_lower in cls.DISALLOWED_MQL_STAGES:
                    return SecurityCheckResult(
                        passed=False,
                        message=f"Disallowed mutating/code-execution MQL stage: '{stage_name}'.",
                    )
                if not stage_lower.startswith("$"):
                    return SecurityCheckResult(
                        passed=False,
                        message=f"Invalid MQL pipeline stage: '{stage_name}'. Must start with '$'.",
                    )
                if stage_lower not in cls.ALLOWED_MQL_STAGES:
                    return SecurityCheckResult(
                        passed=False,
                        message=f"MQL stage '{stage_name}' is not in permitted read-only whitelist.",
                    )

            # Inspect stage values for $where or inline JS functions
            stage_str = json.dumps(stage).lower()
            if "$where" in stage_str or "function(" in stage_str:
                return SecurityCheckResult(
                    passed=False,
                    message="JavaScript execution ($where, function) is strictly prohibited.",
                )

        return SecurityCheckResult(passed=True, message="MQL pipeline passed security scan.")

    @classmethod
    def scan_elasticsearch(cls, query_body: dict[str, Any]) -> SecurityCheckResult:
        """Scan Elasticsearch query body ensuring no inline scripts or mutating directives."""
        if not isinstance(query_body, dict):
            return SecurityCheckResult(passed=False, message="Elasticsearch query must be a dictionary.")

        body_str = json.dumps(query_body).lower()

        # Reject scripts without false-positive matching on field names like "description"
        if (
            '"script"' in body_str
            or '"script_fields"' in body_str
            or '"script_score"' in body_str
            or '"inline"' in body_str
            or "source" in query_body.get("script", {})
        ):
            return SecurityCheckResult(
                passed=False, message="Elasticsearch inline scripting is prohibited."
            )

        return SecurityCheckResult(passed=True, message="Elasticsearch query passed security scan.")
