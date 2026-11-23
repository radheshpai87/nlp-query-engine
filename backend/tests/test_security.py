from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import AppError
from app.core.rate_limit import SlidingWindowRateLimiter
from app.core.security import (
    QuerySecurityScanner,
    decrypt_secret,
    encrypt_secret,
    mask_records,
    mask_sensitive_value,
    redact_connection_string,
)
from app.engine.generators.models import CompiledSQLQuery
from app.engine.ir.builder import LogicalPlanBuilder
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.models.workspace import Workspace
from app.repositories.audit_repository import AuditRepository
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.execution_repository import ExecutionRepository
from app.repositories.schema_repository import SchemaRepository
from app.services.audit_service import AuditService
from app.services.execution_service import ExecutionService


def test_encryption_and_decryption_cycle() -> None:
    secret = "SuperSecretDbPassword123!"
    encrypted = encrypt_secret(secret)
    assert encrypted != secret
    assert isinstance(encrypted, str)
    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret


def test_redact_connection_string() -> None:
    uri = "postgresql://dbuser:super_secret_pw@localhost:5432/production_db"
    redacted = redact_connection_string(uri)
    assert "super_secret_pw" not in redacted
    assert "***REDACTED***" in redacted
    assert "localhost:5432" in redacted

    mongo_uri = "mongodb://admin:pass123@localhost:27017/analytics"
    redacted_mongo = redact_connection_string(mongo_uri)
    assert "pass123" not in redacted_mongo
    assert "***REDACTED***" in redacted_mongo


def test_mask_sensitive_value_and_records() -> None:
    # 1. Direct sensitive keys
    assert mask_sensitive_value("password", "plaintext123") == "***MASKED***"
    assert mask_sensitive_value("api_key", "sk-123456789") == "***MASKED***"
    assert mask_sensitive_value("token", "jwt.token.here") == "***MASKED***"

    # 2. PII patterns
    assert mask_sensitive_value("card", "4111-2222-3333-4444") == "****-****-****-4444"
    assert mask_sensitive_value("ssn_num", "123-45-6789") == "***-**-6789"
    assert mask_sensitive_value("user_email", "alice@example.com") == "a***@example.com"

    # 3. Tabular batch masking
    records = [
        {"id": 1, "name": "Alice", "password": "pass", "credit_card": "5555-4444-3333-2222"},
        {"id": 2, "name": "Bob", "secret": "shh", "credit_card": "4111-1111-1111-1234"},
    ]
    masked = mask_records(records)
    assert masked[0]["password"] == "***MASKED***"
    assert masked[0]["credit_card"] == "****-****-****-2222"
    assert masked[1]["secret"] == "***MASKED***"
    assert masked[1]["name"] == "Bob"


def test_query_security_scanner_sql() -> None:
    # Allowed SELECT queries
    res_select = QuerySecurityScanner.scan_sql("SELECT id, name FROM users WHERE id = 1")
    assert res_select.passed is True

    res_with = QuerySecurityScanner.scan_sql("WITH cte AS (SELECT id FROM orders) SELECT * FROM cte")
    assert res_with.passed is True

    # Blocked write/DDL mutations
    assert QuerySecurityScanner.scan_sql("INSERT INTO users VALUES (1, 'Eve')").passed is False
    assert QuerySecurityScanner.scan_sql("UPDATE users SET name = 'Hacked'").passed is False
    assert QuerySecurityScanner.scan_sql("DELETE FROM users WHERE id = 1").passed is False
    assert QuerySecurityScanner.scan_sql("DROP TABLE users").passed is False
    assert QuerySecurityScanner.scan_sql("ALTER TABLE users DROP COLUMN name").passed is False
    assert QuerySecurityScanner.scan_sql("TRUNCATE TABLE users").passed is False

    # Blocked SQL injections & stacked queries
    assert QuerySecurityScanner.scan_sql("SELECT 1; DROP TABLE users;").passed is False
    assert QuerySecurityScanner.scan_sql("SELECT * FROM users INTO OUTFILE '/tmp/dump'").passed is False
    assert QuerySecurityScanner.scan_sql("SELECT pg_sleep(10)").passed is False


def test_query_security_scanner_mql() -> None:
    # Allowed read-only stages
    safe_pipeline: list[dict[str, Any]] = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
        {"$limit": 10},
    ]
    assert QuerySecurityScanner.scan_mql(safe_pipeline).passed is True

    # Blocked write/code execution stages
    assert QuerySecurityScanner.scan_mql([{"$out": "new_collection"}]).passed is False
    assert QuerySecurityScanner.scan_mql([{"$merge": {"into": "target"}}]).passed is False
    assert QuerySecurityScanner.scan_mql([{"$where": "this.amount > 100"}]).passed is False


def test_query_security_scanner_elasticsearch() -> None:
    # Allowed query
    assert QuerySecurityScanner.scan_elasticsearch({"query": {"term": {"status": "active"}}}).passed is True

    # Blocked inline scripts
    assert QuerySecurityScanner.scan_elasticsearch({"script": "doc['price'].value * 2"}).passed is False
    assert QuerySecurityScanner.scan_elasticsearch({"query": {"match_all": {}}, "script_fields": {}}).passed is False


def test_sliding_window_rate_limiter() -> None:
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=1.0)
    key = "user-123"

    assert limiter.is_allowed(key) is True
    assert limiter.get_remaining(key) == 1
    assert limiter.is_allowed(key) is True
    assert limiter.get_remaining(key) == 0
    # 3rd request in same window rejected
    assert limiter.is_allowed(key) is False

    # Another key is independent
    assert limiter.is_allowed("user-456") is True


def test_rate_limit_dependency_and_client_identifier() -> None:
    from fastapi import HTTPException
    from starlette.requests import Request
    from app.core.rate_limit import get_client_identifier, rate_limit_dependency

    # 1. Test client identifier with Authorization header
    scope_auth = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": [(b"authorization", b"Bearer test-token-123")],
    }
    req_auth = Request(scope_auth)
    assert get_client_identifier(req_auth) == "auth:Bearer test-token-123"

    # 2. Test client identifier with X-Forwarded-For
    scope_xff = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": [(b"x-forwarded-for", b"203.0.113.195, 70.41.3.18")],
    }
    req_xff = Request(scope_xff)
    assert get_client_identifier(req_xff) == "ip:203.0.113.195"

    # 3. Test rate limit dependency enforcement and 429 headers
    test_limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60.0)
    checker = rate_limit_dependency(test_limiter)

    checker(req_auth)  # 1st request allowed

    import pytest
    with pytest.raises(HTTPException) as exc_info:
        checker(req_auth)  # 2nd request exceeded

    assert exc_info.value.status_code == 429
    assert "Rate limit exceeded" in exc_info.value.detail
    assert exc_info.value.headers["Retry-After"] == "60"
    assert exc_info.value.headers["X-RateLimit-Limit"] == "1"
    assert exc_info.value.headers["X-RateLimit-Remaining"] == "0"



def test_execution_service_blocks_mutating_sql(
    test_workspace: Workspace,
    mock_db: Any,
) -> None:
    conn_repo = ConnectionRepository(db=mock_db)
    conn = conn_repo.create(
        DatabaseConnection(
            workspace_id=test_workspace.id,
            name="PG Target",
            db_type=DatabaseType.POSTGRESQL,
            host="localhost",
            database="db",
            username="u",
        )
    )
    schema_repo = SchemaRepository(db=mock_db)
    schema_repo.create(
        SchemaSnapshot(
            workspace_id=test_workspace.id,
            connection_id=conn.id,
            fingerprint="fp-pg",
            objects=[
                SchemaObject(
                    connection_id=conn.id,
                    name="users",
                    fields=[SchemaField(name="id", data_type="integer", is_primary_key=True)],
                )
            ],
            total_objects=1,
        )
    )

    exec_service = ExecutionService(
        connection_repo=conn_repo,
        execution_repo=ExecutionRepository(db=mock_db),
        plan_service=MagicMock(),
        audit_service=AuditService(audit_repo=AuditRepository(db=mock_db)),
    )

    plan = LogicalPlanBuilder(workspace_id=test_workspace.id).from_source(conn.id, "users").build()

    # Artificially mock compiler to return malicious SQL
    with patch("app.engine.compiler.MultiDialectCompiler.compile") as mock_compile:
        malicious_compilation = MagicMock()
        malicious_compilation.is_cross_database = False
        malicious_compilation.single_query = CompiledSQLQuery(
            connection_id=conn.id,
            sql="DROP TABLE users;",
            parameterized_sql="DROP TABLE users;",
            target_table="users",
        )
        mock_compile.return_value = malicious_compilation

        with pytest.raises(AppError, match="Security policy violation"):
            exec_service.execute_plan(
                workspace_id=test_workspace.id,
                user_id="user-1",
                plan=plan,
            )
