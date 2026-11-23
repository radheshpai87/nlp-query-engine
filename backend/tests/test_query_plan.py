from typing import Any

from fastapi.testclient import TestClient

from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.explainer import explain_logical_plan
from app.engine.ir.models import (
    ComparisonOperator,
    JoinType,
    LogicalQueryPlan,
    SortDirection,
    SourceNode,
)
from app.engine.optimizer import LogicalPlanOptimizer
from app.engine.validator import LogicalPlanValidator
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.schema_repository import SchemaRepository


def test_logical_plan_builder() -> None:
    builder = LogicalPlanBuilder(workspace_id="ws-test")
    plan = (
        builder.from_source("conn-1", "orders", alias="o", database_type="postgres")
        .join(
            right_connection_id="conn-1",
            right_source_name="customers",
            left_col=("o", "customer_id"),
            right_col=("customers", "id"),
            join_type=JoinType.INNER,
        )
        .filter("o", "total_amount", ComparisonOperator.GTE, 100.0)
        .group_by("customers", "name")
        .aggregate("sum", "o", "total_amount", alias="revenue")
        .sort("revenue", SortDirection.DESC)
        .limit(10)
        .set_query_text("Top 10 customers by revenue over 100")
        .build()
    )

    assert plan.workspace_id == "ws-test"
    assert plan.query_text == "Top 10 customers by revenue over 100"
    assert len(plan.sources) == 1
    assert plan.sources[0].source_name == "orders"
    assert len(plan.joins) == 1
    assert plan.joins[0].right_source.source_name == "customers"
    assert len(plan.filters) == 1
    assert plan.filters[0].operator == ComparisonOperator.GTE
    assert plan.filters[0].value == 100.0
    assert len(plan.aggregations) == 1
    assert plan.aggregations[0].alias == "revenue"
    assert plan.limit == 10
    assert plan.is_read_only is True


def test_plan_explainer() -> None:
    builder = LogicalPlanBuilder(workspace_id="ws-test")
    plan = (
        builder.from_source("conn-1", "orders", alias="orders")
        .filter("orders", "status", ComparisonOperator.EQ, "completed")
        .project("orders", "id")
        .project("orders", "total_amount")
        .sort(("orders", "total_amount"), SortDirection.DESC)
        .limit(5)
        .build()
    )

    explanation = explain_logical_plan(plan)
    assert len(explanation.steps) >= 4
    assert "Scan initial data from orders" in explanation.steps[0]
    assert any("Filter records where orders.status" in s for s in explanation.steps)
    assert any("Limit results to top 5 records" in s for s in explanation.steps)
    assert "orders" in explanation.involved_sources
    assert "orders.status" in explanation.involved_fields
    assert "orders.total_amount" in explanation.involved_fields


def test_plan_validator_success_and_failures() -> None:
    # 1. Setup mock connections and schemas
    conn_pg = DatabaseConnection(
        id="conn-pg-1",
        workspace_id="ws-val",
        name="Postgres DB",
        db_type=DatabaseType.POSTGRESQL,
        database="prod",
    )
    connections = {conn_pg.id: conn_pg}

    snapshot = SchemaSnapshot(
        workspace_id="ws-val",
        connection_id=conn_pg.id,
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id=conn_pg.id,
                name="customers",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="name", data_type="varchar"),
                ],
            )
        ],
        total_objects=1,
    )
    snapshots = {conn_pg.id: snapshot}

    validator = LogicalPlanValidator(connections=connections, snapshots=snapshots)

    # Valid plan
    valid_plan = (
        LogicalPlanBuilder(workspace_id="ws-val")
        .from_source(conn_pg.id, "customers")
        .project("customers", "name")
        .filter("customers", "id", ComparisonOperator.EQ, 42)
        .limit(50)
        .build()
    )

    result = validator.validate(valid_plan)
    assert result.is_valid is True
    assert len(result.errors) == 0
    assert any(s.passed for s in result.safety_checks if s.check_name == "read_only_safety")

    # Invalid plan: non-existent field
    invalid_field_plan = (
        LogicalPlanBuilder(workspace_id="ws-val")
        .from_source(conn_pg.id, "customers")
        .project("customers", "non_existent_column")
        .build()
    )
    res_field = validator.validate(invalid_field_plan)
    assert res_field.is_valid is False
    assert any("Field 'non_existent_column' does not exist" in err for err in res_field.errors)

    # Invalid plan: non-existent table
    invalid_table_plan = (
        LogicalPlanBuilder(workspace_id="ws-val").from_source(conn_pg.id, "ghost_table").build()
    )
    res_table = validator.validate(invalid_table_plan)
    assert res_table.is_valid is False
    assert any("Entity 'ghost_table' does not exist" in err for err in res_table.errors)

    # Dangerous mutation attempt
    dangerous_plan = LogicalQueryPlan(
        workspace_id="ws-val",
        sources=[SourceNode(connection_id=conn_pg.id, source_name="DROP")],
        is_read_only=False,
    )
    res_danger = validator.validate(dangerous_plan)
    assert res_danger.is_valid is False
    assert any("read-only" in err for err in res_danger.errors)


def test_plan_optimizer() -> None:
    optimizer = LogicalPlanOptimizer()

    plan = (
        LogicalPlanBuilder(workspace_id="ws-opt")
        .from_source("conn-1", "orders")
        .join(
            right_connection_id="conn-2",  # Different connection -> cross-database
            right_source_name="analytics",
            left_col=("orders", "id"),
            right_col=("analytics", "order_id"),
        )
        .filter("orders", "status", ComparisonOperator.EQ, "active")
        .filter("orders", "status", ComparisonOperator.EQ, "active")  # Duplicate filter
        .group_by("orders", "status")
        .aggregate("count", None, None, alias="total")
        .build()
    )

    optimized = optimizer.optimize(plan)

    # 1. Cross-database join detection
    assert len(optimized.joins) == 1
    assert optimized.joins[0].is_cross_database is True

    # 2. Filter deduplication
    assert len(optimized.filters) == 1

    # 3. Projection inference from group by
    assert len(optimized.projections) == 1
    assert optimized.projections[0].column == "status"


def test_query_plan_api_routes(
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
            name="Production PostgreSQL",
            db_type=DatabaseType.POSTGRESQL,
            database="prod_db",
        )
    )

    schema_repo.create(
        SchemaSnapshot(
            workspace_id=test_workspace.id,
            connection_id=conn.id,
            fingerprint="fp-api-test",
            objects=[
                SchemaObject(
                    connection_id=conn.id,
                    name="products",
                    fields=[
                        SchemaField(name="id", data_type="integer", is_primary_key=True),
                        SchemaField(name="title", data_type="varchar"),
                        SchemaField(name="price", data_type="numeric"),
                    ],
                )
            ],
            total_objects=1,
        )
    )

    plan = (
        LogicalPlanBuilder(workspace_id=test_workspace.id)
        .from_source(conn.id, "products")
        .project("products", "title")
        .project("products", "price")
        .filter("products", "price", ComparisonOperator.GT, 50.0)
        .sort(("products", "price"), SortDirection.DESC)
        .limit(5)
        .set_query_text("Top 5 expensive products over 50")
        .build()
    )

    plan_json = plan.model_dump(mode="json")

    # 1. Test POST /query/plan/validate
    val_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/query/plan/validate",
        json=plan_json,
        headers=user_auth_headers,
    )
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["is_valid"] is True
    assert val_data["target_connections"] == [conn.id]

    # 2. Test POST /query/plan/explain
    exp_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/query/plan/explain",
        json=plan_json,
        headers=user_auth_headers,
    )
    assert exp_resp.status_code == 200
    exp_data = exp_resp.json()
    assert "products" in exp_data["involved_sources"]
    assert len(exp_data["steps"]) >= 4

    # 3. Test POST /query/plan/optimize
    opt_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/query/plan/optimize",
        json=plan_json,
        headers=user_auth_headers,
    )
    assert opt_resp.status_code == 200
    opt_data = opt_resp.json()
    assert opt_data["workspace_id"] == test_workspace.id
    assert len(opt_data["projections"]) == 2

    # 4. Test POST /query/plan/synthesize
    synth_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/query/plan/synthesize",
        json={
            "query": "Show me products with price",
            "resolved_context": {"high_value_threshold": 100},
        },
        headers=user_auth_headers,
    )
    assert synth_resp.status_code == 200
    synth_data = synth_resp.json()
    assert synth_data["workspace_id"] == test_workspace.id
    assert synth_data["sources"][0]["source_name"] == "products"
    assert synth_data["sources"][0]["connection_id"] == conn.id


def test_group_by_projection_consistency_optimizer() -> None:
    """Ensure that metrics in projections during grouping are automatically converted to SUM aggregates."""
    from app.engine.ir.models import (
        AggregateExpression,
        AggregateFunction,
        ColumnRef,
        LogicalQueryPlan,
        SourceNode,
    )
    from app.engine.optimizer import LogicalPlanOptimizer

    plan = LogicalQueryPlan(
        workspace_id="ws-group-by",
        sources=[SourceNode(connection_id="c1", source_name="rooms", alias="r")],
        projections=[
            ColumnRef(table="r", column="room_type"),
            ColumnRef(table="d", column="building"),
            ColumnRef(table="r", column="daily_rate"),
        ],
        group_by=[
            ColumnRef(table="r", column="room_type"),
            ColumnRef(table="d", column="building"),
        ],
        aggregations=[
            AggregateExpression(
                function=AggregateFunction.COUNT,
                field=ColumnRef(table="r", column="id"),
                alias="occupied_rooms",
            )
        ],
    )

    optimizer = LogicalPlanOptimizer()
    optimized = optimizer.optimize(plan)

    proj_cols = [p.column for p in optimized.projections]
    assert "daily_rate" not in proj_cols
    assert "room_type" in proj_cols
    assert "building" in proj_cols

    agg_names = [a.alias for a in optimized.aggregations]
    assert "total_daily_rate" in agg_names

