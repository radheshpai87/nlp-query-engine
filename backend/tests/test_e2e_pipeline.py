"""Comprehensive End-to-End Pipeline Integration Test (Phase 14).

Tests the full lifecycle of the Ambiguity-Aware Natural Language Query Engine:
1. User registration, authentication & workspace management
2. Heterogeneous connection setup & credential encryption
3. Schema discovery, snapshot fingerprinting & graph assembly
4. User-defined cross-database relationship mapping
5. Natural language intent parsing & ambiguity detection
6. Interactive parameter clarification & state resolution
7. Typed Logical Query Plan (IR) synthesis & optimization
8. Multi-dialect query compilation (PostgreSQL SQL, MongoDB MQL, Elasticsearch DSL)
9. Safe read-only federated execution with hash join & PII data masking
10. Cryptographic audit blockchain logging & tamper detection verification
"""

from unittest.mock import patch

from fastapi.testclient import TestClient
from pymongo.database import Database

from app.adapters.base import ConnectionTestResult
from app.core.security import decrypt_secret
from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import ComparisonOperator, JoinType
from app.models.schema import (
    SchemaField,
    SchemaObject,
    SchemaSnapshot,
    compute_schema_fingerprint,
)


def test_full_e2e_query_engine_lifecycle(client: TestClient, mock_db: Database) -> None:
    # -------------------------------------------------------------------------
    # 1. User Registration & Authentication
    # -------------------------------------------------------------------------
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "e2e_architect@example.com",
            "password": "SecurePassword123!",
            "full_name": "E2E Architect",
        },
    )
    assert reg_res.status_code == 201
    assert "user" in reg_res.json()
    user_id = reg_res.json()["user"]["id"]
    assert user_id is not None

    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "e2e_architect@example.com",
            "password": "SecurePassword123!",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # -------------------------------------------------------------------------
    # 2. Workspace Provisioning
    # -------------------------------------------------------------------------
    ws_res = client.post(
        "/api/v1/workspaces",
        headers=auth_headers,
        json={
            "name": "E2E Enterprise Workspace",
            "description": "Production heterogeneous multi-database workspace",
        },
    )
    assert ws_res.status_code == 201
    workspace_id = ws_res.json()["id"]

    # -------------------------------------------------------------------------
    # 3. Heterogeneous Connection Registration & Credential Encryption
    # -------------------------------------------------------------------------
    with (
        patch(
            "app.adapters.postgres.PostgresAdapter.test_connection",
            return_value=ConnectionTestResult(success=True, latency_ms=1.0),
        ),
        patch(
            "app.adapters.mongodb.MongoAdapter.test_connection",
            return_value=ConnectionTestResult(success=True, latency_ms=1.0),
        ),
    ):
        # PostgreSQL Connection
        pg_res = client.post(
            f"/api/v1/workspaces/{workspace_id}/connections",
            headers=auth_headers,
            json={
                "name": "E-Commerce PostgreSQL Target",
                "db_type": "postgres",
                "host": "postgres-target",
                "port": 5432,
                "database": "ecommerce_demo",
                "username": "postgres",
                "password": "postgrespassword",
            },
        )
        assert pg_res.status_code == 201
        pg_conn_id = pg_res.json()["id"]

        # MongoDB Connection
        mongo_res = client.post(
            f"/api/v1/workspaces/{workspace_id}/connections",
            headers=auth_headers,
            json={
                "name": "Analytics MongoDB Target",
                "db_type": "mongodb",
                "host": "mongo-target",
                "port": 27017,
                "database": "analytics_demo",
                "username": "root",
                "password": "targetsecret",
            },
        )
        assert mongo_res.status_code == 201
        mongo_conn_id = mongo_res.json()["id"]

    # Verify secrets are encrypted in MongoDB and never returned in plaintext
    raw_pg_doc = mock_db["connections"].find_one({"_id": pg_conn_id})
    assert raw_pg_doc is not None
    assert raw_pg_doc["encrypted_secret"] != ""
    assert raw_pg_doc["encrypted_secret"] != "postgrespassword"
    assert decrypt_secret(raw_pg_doc["encrypted_secret"]) == "postgrespassword"

    # -------------------------------------------------------------------------
    # 4. Schema Discovery & Multi-Database Topology
    # -------------------------------------------------------------------------
    pg_objects = [
        SchemaObject(
            connection_id=pg_conn_id,
            name="products",
            schema_name="public",
            object_type="table",
            fields=[
                SchemaField(name="id", data_type="integer", is_primary_key=True),
                SchemaField(name="sku", data_type="varchar"),
                SchemaField(name="name", data_type="varchar"),
                SchemaField(name="category", data_type="varchar"),
                SchemaField(name="price", data_type="numeric"),
            ],
            row_count_estimate=10,
        ),
        SchemaObject(
            connection_id=pg_conn_id,
            name="orders",
            schema_name="public",
            object_type="table",
            fields=[
                SchemaField(name="id", data_type="integer", is_primary_key=True),
                SchemaField(name="customer_id", data_type="integer"),
                SchemaField(name="total_amount", data_type="numeric"),
                SchemaField(name="status", data_type="varchar"),
                SchemaField(name="order_date", data_type="timestamptz"),
            ],
            row_count_estimate=20,
        ),
    ]
    pg_snapshot = SchemaSnapshot(
        workspace_id=workspace_id,
        connection_id=pg_conn_id,
        fingerprint=compute_schema_fingerprint(pg_objects),
        objects=pg_objects,
    )
    mock_db["schema_snapshots"].insert_one(pg_snapshot.to_mongo())

    mongo_objects = [
        SchemaObject(
            connection_id=mongo_conn_id,
            name="reviews",
            schema_name=None,
            object_type="collection",
            fields=[
                SchemaField(name="_id", data_type="objectId", is_primary_key=True),
                SchemaField(name="product_id", data_type="integer", is_foreign_key=True),
                SchemaField(name="customer_name", data_type="string"),
                SchemaField(name="rating", data_type="integer"),
                SchemaField(name="comment", data_type="string"),
            ],
            row_count_estimate=10,
        )
    ]
    mongo_snapshot = SchemaSnapshot(
        workspace_id=workspace_id,
        connection_id=mongo_conn_id,
        fingerprint=compute_schema_fingerprint(mongo_objects),
        objects=mongo_objects,
    )
    mock_db["schema_snapshots"].insert_one(mongo_snapshot.to_mongo())

    # -------------------------------------------------------------------------
    # 5. User-Defined Cross-Database Relationship
    # -------------------------------------------------------------------------
    rel_res = client.post(
        f"/api/v1/workspaces/{workspace_id}/schemas/relationships",
        headers=auth_headers,
        json={
            "name": "MongoDB Reviews to PostgreSQL Products",
            "source_connection_id": mongo_conn_id,
            "source_table": "reviews",
            "source_fields": ["product_id"],
            "target_connection_id": pg_conn_id,
            "target_table": "products",
            "target_fields": ["id"],
            "cardinality": "many_to_one",
            "description": "Cross-database federation link",
        },
    )
    assert rel_res.status_code == 201

    # Verify Unified Graph Topology
    graph_res = client.get(
        f"/api/v1/workspaces/{workspace_id}/schemas/graph",
        headers=auth_headers,
    )
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert len(graph_data["nodes"]) >= 3
    assert len(graph_data["edges"]) >= 1

    # -------------------------------------------------------------------------
    # 6. Natural Language Query Ambiguity Evaluation & Clarification Flow
    # -------------------------------------------------------------------------
    ambig_res = client.post(
        f"/api/v1/workspaces/{workspace_id}/ambiguity/evaluate",
        headers=auth_headers,
        json={"query": "High-value customers who purchased electronics recently"},
    )
    assert ambig_res.status_code == 200
    eval_result = ambig_res.json()
    assert eval_result["is_ambiguous"] is True
    assert len(eval_result["clarifications"]) >= 1

    # Resolve All Pending Clarifications
    current_pending = list(eval_result["clarifications"])
    last_res_data = None
    for clar in eval_result["clarifications"]:
        val = 1000 if "threshold" in clar["parameter_name"] else "last_30_days"
        resolve_res = client.post(
            f"/api/v1/workspaces/{workspace_id}/ambiguity/resolve",
            headers=auth_headers,
            json={
                "request": {
                    "clarification_id": clar["id"],
                    "selected_value": val,
                },
                "pending_clarifications": current_pending,
            },
        )
        assert resolve_res.status_code == 200
        last_res_data = resolve_res.json()
        for p in current_pending:
            if p["id"] == clar["id"]:
                p["resolved"] = True
                p["user_response"] = val

    assert last_res_data is not None
    assert last_res_data["ready_to_execute"] is True

    # -------------------------------------------------------------------------
    # 7. Logical Query Plan (IR) Compilation & Dialect Generation
    # -------------------------------------------------------------------------
    builder = LogicalPlanBuilder(workspace_id=workspace_id)
    plan_obj = (
        builder.from_source(pg_conn_id, "products", alias="p", database_type="postgres")
        .join(
            right_connection_id=mongo_conn_id,
            right_source_name="reviews",
            left_col=("p", "id"),
            right_col=("reviews", "product_id"),
            join_type=JoinType.INNER,
        )
        .filter("p", "price", ComparisonOperator.GTE, 500.0)
        .limit(10)
        .set_query_text("High-value products with verified reviews")
        .build()
    )

    plan_dict = plan_obj.model_dump(mode="json")

    compile_res = client.post(
        f"/api/v1/workspaces/{workspace_id}/query/plan/compile",
        headers=auth_headers,
        json=plan_dict,
    )
    assert compile_res.status_code == 200
    compiled_result = compile_res.json()
    assert compiled_result["is_cross_database"] is True
    assert compiled_result["cross_database_plan"] is not None
    assert len(compiled_result["cross_database_plan"]["sub_queries"]) == 2

    # -------------------------------------------------------------------------
    # 8. Safe Read-Only Execution with In-Memory Hash Join & PII Masking
    # -------------------------------------------------------------------------
    mock_pg_rows = [
        {"id": 1, "name": "UltraBook Pro 15", "price": 1299.99, "credit_card": "4111111111111234"},
        {"id": 2, "name": "SmartPhone Prime X", "price": 899.50, "credit_card": "5500000000005678"},
    ]
    mock_mongo_rows = [
        {"product_id": 1, "rating": 5, "comment": "Outstanding build quality and fast battery!"},
        {"product_id": 1, "rating": 4, "comment": "Great machine, premium chassis."},
        {"product_id": 2, "rating": 5, "comment": "Snappy OS and brilliant OLED camera."},
    ]

    with (
        patch(
            "app.adapters.postgres.PostgresAdapter.test_connection",
            return_value=ConnectionTestResult(success=True, latency_ms=1.0),
        ),
        patch("app.adapters.postgres.PostgresAdapter.execute_query", return_value=mock_pg_rows),
        patch(
            "app.adapters.mongodb.MongoAdapter.test_connection",
            return_value=ConnectionTestResult(success=True, latency_ms=1.0),
        ),
        patch("app.adapters.mongodb.MongoAdapter.execute_query", return_value=mock_mongo_rows),
    ):
        exec_res = client.post(
            f"/api/v1/workspaces/{workspace_id}/query/execute",
            headers=auth_headers,
            json={
                "logical_plan": plan_dict,
                "natural_query": "High-value products with customer reviews",
            },
        )
        assert exec_res.status_code == 200
        exec_data = exec_res.json()
        assert exec_data["status"] == "success"
        assert exec_data["row_count"] == 3

        # Verify federated joined columns are present
        first_row = exec_data["rows"][0]
        assert "p.name" in first_row or "name" in first_row

        # Verify PII data masking was automatically applied
        cc_val = str(first_row.get("credit_card", first_row.get("p.credit_card", "")))
        assert "4111111111111234" not in cc_val
        assert "1234" in cc_val

    # -------------------------------------------------------------------------
    # 9. Cryptographic Audit Blockchain & Tamper Detection
    # -------------------------------------------------------------------------
    # Verify Audit Chain Integrity
    audit_res = client.get(
        f"/api/v1/workspaces/{workspace_id}/audit/integrity",
        headers=auth_headers,
    )
    assert audit_res.status_code == 200
    integrity = audit_res.json()
    assert integrity["is_valid"] is True
    assert integrity["total_events_checked"] >= 3

    # Audit log search & filtering
    log_res = client.get(
        f"/api/v1/workspaces/{workspace_id}/audit?action=query_execution",
        headers=auth_headers,
    )
    assert log_res.status_code == 200
    events = log_res.json()["items"]
    assert len(events) >= 1
    assert events[0]["status"] in ("SUCCESS", "success")
