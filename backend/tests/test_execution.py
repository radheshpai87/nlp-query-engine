from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.adapters.elasticsearch import ElasticsearchAdapter
from app.adapters.mongodb import MongoAdapter
from app.adapters.postgres import PostgresAdapter
from app.core.exceptions import AppError
from app.engine.evaluator import CrossDatabaseEvaluator, infer_data_type
from app.engine.generators.models import CrossDatabaseJoinStep, JoinStrategyType
from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import (
    ColumnRef,
    ComparisonOperator,
    FilterPredicate,
    SortDirection,
    SortExpression,
)
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.schema_repository import SchemaRepository


def test_infer_data_type() -> None:
    assert infer_data_type([1, 2, 3]) == "integer"
    assert infer_data_type([1.5, 2.5]) == "float"
    assert infer_data_type([True, False]) == "boolean"
    assert infer_data_type(["hello", "world"]) == "string"
    assert infer_data_type(["2026-10-22T12:00:00Z"]) == "datetime"
    assert infer_data_type([{"key": "val"}]) == "object"
    assert infer_data_type([None, None]) == "string"


def test_cross_database_evaluator_hash_join() -> None:
    left_rows = [
        {"customer_id": 1, "name": "Alice"},
        {"customer_id": 2, "name": "Bob"},
        {"customer_id": 3, "name": "Charlie"},
    ]
    right_rows = [
        {"id": 1, "total": 100},
        {"id": 1, "total": 150},
        {"id": 2, "total": 200},
        {"id": 4, "total": 500},
    ]

    evaluator = CrossDatabaseEvaluator()

    # Inner hash join
    inner_joined = evaluator.hash_join(
        left_rows=left_rows,
        right_rows=right_rows,
        left_key="customer_id",
        right_key="id",
        is_left_outer=False,
    )

    assert len(inner_joined) == 3
    assert {"customer_id": 1, "name": "Alice", "id": 1, "total": 100} in inner_joined
    assert {"customer_id": 1, "name": "Alice", "id": 1, "total": 150} in inner_joined
    assert {"customer_id": 2, "name": "Bob", "id": 2, "total": 200} in inner_joined

    # Left outer hash join (Charlie has no orders, should remain)
    left_outer = evaluator.hash_join(
        left_rows=left_rows,
        right_rows=right_rows,
        left_key="customer_id",
        right_key="id",
        is_left_outer=True,
    )
    assert len(left_outer) == 4
    charlie_record = next(r for r in left_outer if r["name"] == "Charlie")
    assert "total" not in charlie_record or charlie_record.get("total") is None


def test_cross_database_evaluator_filter_and_sort() -> None:
    rows = [
        {"id": 1, "score": 85, "city": "Bengaluru"},
        {"id": 2, "score": 92, "city": "Mumbai"},
        {"id": 3, "score": 78, "city": "Bengaluru"},
        {"id": 4, "score": 60, "city": "Delhi"},
    ]

    evaluator = CrossDatabaseEvaluator()

    # Filter score >= 80
    filtered = evaluator.apply_filter(
        rows,
        FilterPredicate(
            field=ColumnRef(table="t", column="score"),
            operator=ComparisonOperator.GTE,
            value=80,
        ),
    )
    assert len(filtered) == 2
    assert {r["id"] for r in filtered} == {1, 2}

    # Sort score DESC
    sorted_rows = evaluator.apply_sort(
        rows,
        [SortExpression(field=ColumnRef(table="t", column="score"), direction=SortDirection.DESC)],
    )
    assert [r["id"] for r in sorted_rows] == [2, 1, 3, 4]


def test_cross_database_evaluator_full_pipeline() -> None:
    customers = [
        {"id": "c1", "name": "Alice", "city": "Bengaluru"},
        {"id": "c2", "name": "Bob", "city": "Delhi"},
    ]
    orders = [
        {"customer_id": "c1", "amount": 250, "status": "completed"},
        {"customer_id": "c2", "amount": 100, "status": "completed"},
    ]

    sub_results: list[tuple[str, list[dict[str, Any]]]] = [
        ("customers", customers),
        ("orders", orders),
    ]

    join_steps = [
        CrossDatabaseJoinStep(
            left_source_id="customers",
            right_source_id="orders",
            left_key="id",
            right_key="customer_id",
            strategy=JoinStrategyType.HASH_JOIN,
        )
    ]

    evaluator = CrossDatabaseEvaluator()
    results = evaluator.evaluate(
        sub_results=sub_results,
        join_steps=join_steps,
        projections=[
            ColumnRef(table="customers", column="name"),
            ColumnRef(table="orders", column="amount", alias="order_amount"),
        ],
        filters=[
            FilterPredicate(
                field=ColumnRef(table="orders", column="amount"),
                operator=ComparisonOperator.GT,
                value=150,
            )
        ],
        limit=10,
    )

    assert len(results) == 1
    assert results[0] == {"name": "Alice", "order_amount": 250}

    columns_meta = evaluator.infer_columns_metadata(results)
    assert len(columns_meta) == 2
    assert columns_meta[0].name == "name"
    assert columns_meta[0].data_type == "string"
    assert columns_meta[1].name == "order_amount"
    assert columns_meta[1].data_type == "integer"


def test_postgres_adapter_rejects_mutations() -> None:
    adapter = PostgresAdapter(connection_id="conn-1", name="PG Target")

    with pytest.raises(AppError, match="Disallowed mutating SQL keyword 'DROP'"):
        adapter.execute_query("DROP TABLE users;")

    with pytest.raises(AppError, match="Disallowed mutating SQL keyword 'DELETE'"):
        adapter.execute_query("DELETE FROM customers WHERE id = 1;")

    with pytest.raises(AppError, match="Only read-only SELECT"):
        adapter.execute_query("INSERT INTO customers VALUES (1, 'Alice');")


def test_mongodb_adapter_rejects_mutations() -> None:
    adapter = MongoAdapter(connection_id="conn-2", name="Mongo Target")

    with pytest.raises(AppError, match="Disallowed MongoDB aggregation stage '\\$out'"):
        adapter.execute_query({"collection": "orders", "pipeline": [{"$out": "backup_orders"}]})

    with pytest.raises(AppError, match="Disallowed MongoDB aggregation stage '\\$merge'"):
        adapter.execute_query({"collection": "orders", "pipeline": [{"$merge": "new_orders"}]})


def test_elasticsearch_adapter_flattens_aggregations() -> None:
    adapter = ElasticsearchAdapter(connection_id="conn-3", name="ES Target")

    mock_client = MagicMock()
    mock_client.options.return_value = mock_client
    mock_client.search.return_value = {
        "aggregations": {
            "group_by_category": {
                "buckets": [
                    {"key": "electronics", "doc_count": 15, "avg_price": {"value": 299.99}},
                    {"key": "books", "doc_count": 30, "avg_price": {"value": 19.50}},
                ]
            }
        }
    }
    adapter._client = mock_client

    rows = adapter.execute_query({"index": "products", "query_body": {"aggs": {}}})
    assert len(rows) == 2
    assert rows[0] == {"category": "electronics", "count": 15, "avg_price": 299.99}
    assert rows[1] == {"category": "books", "count": 30, "avg_price": 19.50}


def test_execution_api_workflow(
    client: TestClient,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
    mock_db: Any,
) -> None:
    # 1. Setup mock database connection
    conn_repo = ConnectionRepository(db=mock_db)
    conn = DatabaseConnection(
        workspace_id=test_workspace.id,
        name="Mock Postgres Analytics",
        db_type=DatabaseType.POSTGRESQL,
        host="localhost",
        port=5432,
        database="testdb",
        username="postgres",
    )
    saved_conn = conn_repo.create(conn)

    schema_repo = SchemaRepository(db=mock_db)
    snapshot = SchemaSnapshot(
        workspace_id=test_workspace.id,
        connection_id=saved_conn.id,
        fingerprint="fp-mock-1",
        objects=[
            SchemaObject(
                connection_id=saved_conn.id,
                name="products",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="product", data_type="varchar"),
                    SchemaField(name="revenue", data_type="numeric"),
                ],
            )
        ],
        total_objects=1,
    )
    schema_repo.create(snapshot)

    # 2. Mock adapter execution to return simulated tabular records
    mock_rows = [
        {"id": 101, "product": "Laptop", "revenue": 1200.50},
        {"id": 102, "product": "Mouse", "revenue": 25.00},
    ]

    with patch(
        "app.services.execution_service.ExecutionService._get_adapter_for_connection"
    ) as mock_get_adapter:
        mock_adapter = MagicMock()
        mock_adapter.execute_query.return_value = mock_rows
        mock_get_adapter.return_value = mock_adapter

        plan_builder = (
            LogicalPlanBuilder(workspace_id=test_workspace.id)
            .from_source(saved_conn.id, "products", alias="p")
            .project("p", "id")
            .project("p", "product")
            .project("p", "revenue")
            .limit(10)
        )
        plan = plan_builder.build()

        request_payload = {
            "logical_plan": plan.model_dump(mode="json"),
            "natural_query": "Top products by revenue",
        }

        # Execute query endpoint
        res = client.post(
            f"/api/v1/workspaces/{test_workspace.id}/query/execute",
            json=request_payload,
            headers=user_auth_headers,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["workspace_id"] == test_workspace.id
        assert data["row_count"] == 2
        assert len(data["columns"]) == 3
        assert data["columns"][0]["name"] == "id"
        assert data["columns"][1]["name"] == "product"
        assert data["columns"][2]["name"] == "revenue"
        assert data["rows"] == mock_rows
        assert data["status"] == "success"

        execution_id = data["execution_id"]

        # List executions endpoint
        list_res = client.get(
            f"/api/v1/workspaces/{test_workspace.id}/query/executions",
            headers=user_auth_headers,
        )
        assert list_res.status_code == 200
        exec_list = list_res.json()
        assert len(exec_list) >= 1
        assert exec_list[0]["id"] == execution_id
        assert exec_list[0]["natural_query"] == "Top products by revenue"

        # Get specific execution endpoint
        get_res = client.get(
            f"/api/v1/workspaces/{test_workspace.id}/query/executions/{execution_id}",
            headers=user_auth_headers,
        )
        assert get_res.status_code == 200
        assert get_res.json()["id"] == execution_id
