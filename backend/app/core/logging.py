import logging
import re
import sys

from app.core.config import get_settings

# Patterns to mask sensitive fields from logs
SENSITIVE_PATTERNS = [
    re.compile(r"(password['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(secret['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(api[_-]?key['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(token['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(mongodb(?:\+srv)?://[^:]+:)([^@]+)(@)", re.IGNORECASE),
    re.compile(r"(postgres(?:ql)?://[^:]+:)([^@]+)(@)", re.IGNORECASE),
]


class RedactingFormatter(logging.Formatter):
    """Custom logging formatter that strips/redacts credentials and connection secrets."""

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern in SENSITIVE_PATTERNS:
            msg = pattern.sub(r"\1***REDACTED***\3", msg)
        return msg


def setup_logging() -> logging.Logger:
    settings = get_settings()
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    logger = logging.getLogger("nlp_query_engine")
    logger.setLevel(log_level)

    # Avoid adding handlers repeatedly
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        formatter = RedactingFormatter(
            fmt="%(asctime)s | %(levelname)-7s | [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
