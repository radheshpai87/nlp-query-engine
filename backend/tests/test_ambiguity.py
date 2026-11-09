from typing import Any

from fastapi.testclient import TestClient

from app.engine.ambiguity_engine import AmbiguityEngine
from app.models.ambiguity import (
    AmbiguityType,
    PendingClarification,
)
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.schema_repository import SchemaRepository


def test_evaluate_query_vague_predicate() -> None:
    engine = AmbiguityEngine()

    # 1. High value predicate
    res_high = engine.evaluate_query(
        query="Show me high-value customers",
        connections={},
        snapshots={},
    )
    assert res_high.is_ambiguous is True
    assert len(res_high.clarifications) == 1
    clar = res_high.clarifications[0]
    assert clar.ambiguity_type == AmbiguityType.VAGUE_PREDICATE
    assert clar.parameter_name == "high_value_threshold"
    assert len(clar.options) >= 3
    assert any(opt.is_recommended for opt in clar.options)

    # 2. Cheap / budget predicate
    res_cheap = engine.evaluate_query(
        query="Find cheap products in warehouse",
        connections={},
        snapshots={},
    )
    assert res_cheap.is_ambiguous is True
    assert res_cheap.clarifications[0].parameter_name == "cheap_price_threshold"


def test_evaluate_query_temporal_ambiguity() -> None:
    engine = AmbiguityEngine()

    # Ambiguous "recently"
    res_recent = engine.evaluate_query(
        query="Show customers who purchased recently",
        connections={},
        snapshots={},
    )
    assert res_recent.is_ambiguous is True
    assert res_recent.clarifications[0].ambiguity_type == AmbiguityType.MISSING_TIME_WINDOW
    assert res_recent.clarifications[0].parameter_name == "time_window"

    # Unambiguous: explicit date range "last 7 days"
    res_explicit = engine.evaluate_query(
        query="Show customers who purchased in the last 7 days",
        connections={},
        snapshots={},
    )
    assert res_explicit.is_ambiguous is False
    assert len(res_explicit.clarifications) == 0


def test_evaluate_query_multiple_ambiguities_combined() -> None:
    engine = AmbiguityEngine()

    # The canonical prompt example:
    # "Show me high-value customers who recently purchased electronics."
    res = engine.evaluate_query(
        query="Show me high-value customers who recently purchased electronics",
        connections={},
        snapshots={},
    )
    assert res.is_ambiguous is True
    param_names = [c.parameter_name for c in res.clarifications]
    assert "high_value_threshold" in param_names
    assert "time_window" in param_names
    assert len(res.clarifications) == 2


def test_evaluate_query_ambiguous_metric() -> None:
    engine = AmbiguityEngine()

    # Snapshot with multiple revenue columns
    conn = DatabaseConnection(
        id="conn-1",
        workspace_id="ws-1",
        name="Postgres",
        db_type=DatabaseType.POSTGRESQL,
    )
    snapshot = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-1",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-1",
                name="orders",
                fields=[
                    SchemaField(name="id", data_type="integer"),
                    SchemaField(name="total_amount", data_type="numeric"),
                    SchemaField(name="subtotal", data_type="numeric"),
                    SchemaField(name="status", data_type="varchar"),
                ],
            )
        ],
    )

    res = engine.evaluate_query(
        query="Show top 5 products by revenue this month",
        connections={"conn-1": conn},
        snapshots={"conn-1": snapshot},
    )
    assert res.is_ambiguous is True
    assert any(c.ambiguity_type == AmbiguityType.AMBIGUOUS_METRIC for c in res.clarifications)


def test_evaluate_query_multiple_sources() -> None:
    engine = AmbiguityEngine()

    # Multiple connections with customers entity
    conn_pg = DatabaseConnection(
        id="conn-pg",
        workspace_id="ws-1",
        name="Production Postgres",
        db_type=DatabaseType.POSTGRESQL,
    )
    conn_mongo = DatabaseConnection(
        id="conn-mongo",
        workspace_id="ws-1",
        name="Archive Mongo",
        db_type=DatabaseType.MONGODB,
    )

    snap_pg = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-pg",
        fingerprint="fp-pg",
        objects=[SchemaObject(connection_id="conn-pg", name="customers", fields=[])],
    )
    snap_mongo = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-mongo",
        fingerprint="fp-mongo",
        objects=[SchemaObject(connection_id="conn-mongo", name="customers", fields=[])],
    )

    res = engine.evaluate_query(
        query="List all customers",
        connections={"conn-pg": conn_pg, "conn-mongo": conn_mongo},
        snapshots={"conn-pg": snap_pg, "conn-mongo": snap_mongo},
    )

    assert res.is_ambiguous is True
    src_clar = next(
        c for c in res.clarifications if c.ambiguity_type == AmbiguityType.MULTIPLE_SOURCES
    )
    assert src_clar.parameter_name == "target_source"
    assert len(src_clar.options) >= 2


def test_resolve_clarification() -> None:
    engine = AmbiguityEngine()

    clar1 = PendingClarification(
        ambiguity_type=AmbiguityType.VAGUE_PREDICATE,
        parameter_name="high_value_threshold",
        question="What threshold?",
        default_value=1000,
    )
    clar2 = PendingClarification(
        ambiguity_type=AmbiguityType.MISSING_TIME_WINDOW,
        parameter_name="time_window",
        question="What time window?",
        default_value="30d",
    )

    # 1. Resolve first with selected option
    res1 = engine.resolve_clarification(
        clarification=clar1,
        selected_value=500,
        remaining_clarifications=[clar1, clar2],
    )
    assert res1.resolved is True
    assert res1.resolved_value == 500
    assert len(res1.remaining_clarifications) == 1
    assert res1.ready_to_execute is False

    # 2. Resolve second with custom input
    res2 = engine.resolve_clarification(
        clarification=clar2,
        selected_value="30d",
        custom_input="last_14_days",
        remaining_clarifications=[clar2],
    )
    assert res2.resolved is True
    assert res2.resolved_value == "last_14_days"
    assert len(res2.remaining_clarifications) == 0
    assert res2.ready_to_execute is True


def test_ambiguity_api_endpoints(
    client: TestClient,
    test_user: User,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
    mock_db: Any,
) -> None:
    conn_repo = ConnectionRepository(db=mock_db)
    schema_repo = SchemaRepository(db=mock_db)

    conn = conn_repo.create(
        DatabaseConnection(
            workspace_id=test_workspace.id,
            name="PG DB",
            db_type=DatabaseType.POSTGRESQL,
        )
    )
    schema_repo.create(
        SchemaSnapshot(
            workspace_id=test_workspace.id,
            connection_id=conn.id,
            fingerprint="fp-amb-test",
            objects=[
                SchemaObject(
                    connection_id=conn.id,
                    name="orders",
                    fields=[
                        SchemaField(name="id", data_type="int"),
                        SchemaField(name="amount", data_type="numeric"),
                    ],
                )
            ],
        )
    )

    # 1. Evaluate ambiguous query
    eval_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/ambiguity/evaluate",
        json={"query": "Show me high-value customers who recently purchased"},
        headers=user_auth_headers,
    )
    assert eval_resp.status_code == 200
    data = eval_resp.json()
    assert data["is_ambiguous"] is True
    assert len(data["clarifications"]) == 2
    first_clar = data["clarifications"][0]

    # 2. Resolve the clarification via API
    resolve_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/ambiguity/resolve",
        json={
            "request": {
                "clarification_id": first_clar["id"],
                "selected_value": 750,
            },
            "pending_clarifications": data["clarifications"],
        },
        headers=user_auth_headers,
    )
    assert resolve_resp.status_code == 200
    res_data = resolve_resp.json()
    assert res_data["resolved"] is True
    assert res_data["resolved_value"] == 750
    assert len(res_data["remaining_clarifications"]) == 1
    assert res_data["ready_to_execute"] is False
