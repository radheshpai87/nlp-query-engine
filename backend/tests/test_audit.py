import csv
import io
import json

from fastapi.testclient import TestClient
from pymongo.database import Database

from app.models.workspace import Workspace
from app.repositories.audit_repository import AuditRepository
from app.services.audit_service import AuditService


def test_audit_logging_with_secret_redaction(mock_db: Database) -> None:
    audit_repo = AuditRepository(db=mock_db)
    audit_service = AuditService(audit_repo=audit_repo)

    raw_details = {
        "postgres_uri": "postgresql://admin:super_secret_password@db.internal:5432/finance",
        "action_note": "Connected production database",
    }

    event = audit_service.log_event(
        workspace_id="ws-test-1",
        action="DATABASE_CONNECTED",
        resource_type="connection",
        resource_id="conn-999",
        details=raw_details,
    )

    assert event.id is not None
    persisted = audit_repo.get_by_id(event.id)
    assert persisted is not None
    assert "super_secret_password" not in persisted.details["postgres_uri"]
    assert "***REDACTED***" in persisted.details["postgres_uri"]
    assert persisted.event_hash is not None
    assert persisted.previous_hash == "GENESIS"


def test_audit_cryptographic_hash_chain(mock_db: Database) -> None:
    audit_repo = AuditRepository(db=mock_db)
    audit_service = AuditService(audit_repo=audit_repo)
    ws_id = "ws-chain-1"

    # Log 3 consecutive events
    e1 = audit_service.log_event(ws_id, "USER_LOGIN", "user", "u-1")
    e2 = audit_service.log_event(ws_id, "SCHEMA_INTROSPECTED", "schema", "s-1")
    e3 = audit_service.log_event(ws_id, "QUERY_EXECUTED", "query", "q-1")

    assert e1.previous_hash == "GENESIS"
    assert e2.previous_hash == e1.event_hash
    assert e3.previous_hash == e2.event_hash

    # Verify chain integrity
    integrity = audit_service.verify_integrity(ws_id)
    assert integrity["is_valid"] is True
    assert integrity["total_events_checked"] == 3
    assert len(integrity["tampered_event_ids"]) == 0


def test_audit_tamper_detection(mock_db: Database) -> None:
    audit_repo = AuditRepository(db=mock_db)
    audit_service = AuditService(audit_repo=audit_repo)
    ws_id = "ws-tamper-1"

    audit_service.log_event(ws_id, "EVENT_1", "res")
    e2 = audit_service.log_event(ws_id, "EVENT_2", "res")
    audit_service.log_event(ws_id, "EVENT_3", "res")

    # Artificially tamper with event 2 in the database collection directly
    audit_repo.collection.update_one(
        {"_id": e2.id},
        {"$set": {"action": "FORGED_ACTION_TAMPERED"}},
    )

    integrity = audit_service.verify_integrity(ws_id)
    assert integrity["is_valid"] is False
    assert e2.id in integrity["tampered_event_ids"]


def test_audit_query_and_search(mock_db: Database) -> None:
    audit_repo = AuditRepository(db=mock_db)
    audit_service = AuditService(audit_repo=audit_repo)
    ws_id = "ws-query-1"

    audit_service.log_event(ws_id, "USER_LOGIN", "auth", user_id="alice", status="SUCCESS")
    audit_service.log_event(ws_id, "CONNECTION_CREATED", "connection", user_id="bob", status="SUCCESS")
    audit_service.log_event(ws_id, "QUERY_REJECTED", "query", user_id="alice", status="DENIED")

    # Filter by user
    alice_events, count = audit_service.query_events(ws_id, user_id="alice")
    assert count == 2
    assert len(alice_events) == 2

    # Filter by status
    denied_events, count_denied = audit_service.query_events(ws_id, status="DENIED")
    assert count_denied == 1
    assert denied_events[0].action == "QUERY_REJECTED"

    # Search keyword
    searched, count_search = audit_service.query_events(ws_id, search="CONNECTION")
    assert count_search == 1
    assert searched[0].action == "CONNECTION_CREATED"


def test_audit_export_csv_and_json(mock_db: Database) -> None:
    audit_repo = AuditRepository(db=mock_db)
    audit_service = AuditService(audit_repo=audit_repo)
    ws_id = "ws-export-1"

    audit_service.log_event(ws_id, "SCHEMA_REFRESH", "schema", resource_id="sch-1")

    # Export JSON
    json_str = audit_service.export_events(ws_id, "json")
    parsed = json.loads(json_str)
    assert len(parsed) == 1
    assert parsed[0]["action"] == "SCHEMA_REFRESH"

    # Export CSV
    csv_str = audit_service.export_events(ws_id, "csv")
    reader = list(csv.reader(io.StringIO(csv_str)))
    assert len(reader) >= 2  # Header + 1 row
    headers = reader[0]
    assert "Action" in headers
    assert "Event Hash" in headers
    assert reader[1][2] == "SCHEMA_REFRESH"


def test_audit_api_endpoints(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    audit_service = AuditService(audit_repo=AuditRepository(db=mock_db))
    audit_service.log_event(
        workspace_id=test_workspace.id,
        action="TEST_ACTION",
        resource_type="workspace",
        details={"info": "sample event"},
    )

    # 1. GET /audit
    res = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/audit?search=TEST",
        headers=user_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["items"][0]["action"] == "TEST_ACTION"

    # 2. GET /audit/integrity
    res_integrity = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/audit/integrity",
        headers=user_auth_headers,
    )
    assert res_integrity.status_code == 200
    assert res_integrity.json()["is_valid"] is True

    # 3. GET /audit/export
    res_export = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/audit/export?format=csv",
        headers=user_auth_headers,
    )
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers["content-type"]
    assert "attachment;" in res_export.headers["content-disposition"]
