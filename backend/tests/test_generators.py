from fastapi.testclient import TestClient

from app.engine.compiler import MultiDialectCompiler
from app.engine.generators.es_generator import ElasticsearchDSLGenerator
from app.engine.generators.models import (
    CompiledElasticsearchQuery,
    CompiledMongoQuery,
    CompiledSQLQuery,
    DialectType,
    JoinStrategyType,
)
from app.engine.generators.mongo_generator import MongoPipelineGenerator
from app.engine.generators.sql_generator import PostgresSQLGenerator
from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import (
    AggregateFunction,
    ComparisonOperator,
    JoinType,
    SortDirection,
)
from app.models.connection import DatabaseType
from app.models.workspace import Workspace


def test_postgres_sql_generator_basic_and_parameterized() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-pg-1", "customers", alias="c")
        .project("c", "id", alias="customer_id")
        .project("c", "name")
        .filter("c", "city", ComparisonOperator.EQ, "Bengaluru")
        .filter("c", "status", ComparisonOperator.IN, ["active", "vip"])
        .filter("c", "balance", ComparisonOperator.BETWEEN, [100, 500])
        .sort(("c", "name"), direction=SortDirection.ASC)
        .limit(10)
        .offset(5)
        .build()
    )

    generator = PostgresSQLGenerator()
    compiled = generator.generate(plan)

    assert isinstance(compiled, CompiledSQLQuery)
    assert compiled.dialect == DialectType.POSTGRES
    assert compiled.target_table == "customers"
    assert compiled.is_read_only is True

    # Parameterized query should contain placeholders :p1, :p2, etc.
    assert ":p1" in compiled.parameterized_sql
    assert ":p2" in compiled.parameterized_sql
    assert "LIMIT 10 OFFSET 5;" in compiled.parameterized_sql
    assert compiled.parameters["p1"] == "Bengaluru"
    assert compiled.parameters["p2"] == "active"
    assert compiled.parameters["p3"] == "vip"
    assert compiled.parameters["p4"] == 100
    assert compiled.parameters["p5"] == 500

    # Display SQL should contain quoted literals
    assert "'Bengaluru'" in compiled.sql
    assert "'active', 'vip'" in compiled.sql
    assert "BETWEEN 100 AND 500" in compiled.sql
    assert 'ORDER BY "c"."name" ASC' in compiled.sql


def test_postgres_sql_generator_joins_and_aggregations() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-pg-1", "customers", alias="c")
        .join(
            right_connection_id="conn-pg-1",
            right_source_name="orders",
            right_alias="o",
            join_type=JoinType.INNER,
            left_col=("c", "id"),
            right_col=("o", "customer_id"),
        )
        .project("c", "name")
        .group_by("c", "name")
        .aggregate(AggregateFunction.COUNT, None, None, alias="total_orders")
        .aggregate(AggregateFunction.SUM, "o", "total_amount", alias="total_revenue")
        .having("o", "total_amount", ComparisonOperator.GT, 1000)
        .sort("total_revenue", direction=SortDirection.DESC)
        .limit(5)
        .build()
    )

    generator = PostgresSQLGenerator()
    compiled = generator.generate(plan)

    assert 'INNER JOIN "orders" AS "o" ON "c"."id" = "o"."customer_id"' in compiled.sql
    assert 'COUNT(*) AS "total_orders"' in compiled.sql
    assert 'SUM("o"."total_amount") AS "total_revenue"' in compiled.sql
    assert 'GROUP BY "c"."name"' in compiled.sql
    assert 'HAVING "o"."total_amount" >' in compiled.sql
    assert 'ORDER BY "total_revenue" DESC' in compiled.sql
    assert "LIMIT 5" in compiled.sql


def test_mongodb_mql_generator_pipeline() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-mongo-1", "orders", alias="orders")
        .project("orders", "customer_id")
        .project("orders", "status")
        .filter("orders", "status", ComparisonOperator.EQ, "completed")
        .filter("orders", "total_amount", ComparisonOperator.GTE, 250)
        .filter("orders", "city", ComparisonOperator.CONTAINS, "york")
        .sort(("orders", "total_amount"), direction=SortDirection.DESC)
        .limit(20)
        .offset(10)
        .build()
    )

    generator = MongoPipelineGenerator()
    compiled = generator.generate(plan)

    assert isinstance(compiled, CompiledMongoQuery)
    assert compiled.dialect == DialectType.MONGODB
    assert compiled.collection == "orders"
    assert compiled.is_read_only is True

    # Check pipeline stages
    stage_names = [list(stage.keys())[0] for stage in compiled.pipeline]
    assert "$match" in stage_names
    assert "$sort" in stage_names
    assert "$skip" in stage_names
    assert "$limit" in stage_names
    assert "$project" in stage_names

    # Check match stage structure
    match_stage = next(s["$match"] for s in compiled.pipeline if "$match" in s)
    assert "$and" in match_stage
    and_conditions = match_stage["$and"]
    assert {"status": "completed"} in and_conditions
    assert {"total_amount": {"$gte": 250}} in and_conditions


def test_mongodb_mql_generator_group_and_lookup() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-mongo-1", "orders", alias="o")
        .join(
            right_connection_id="conn-mongo-1",
            right_source_name="customers",
            right_alias="c",
            join_type=JoinType.LEFT_OUTER,
            left_col=("o", "customer_id"),
            right_col=("c", "_id"),
        )
        .group_by("o", "customer_id")
        .aggregate(AggregateFunction.COUNT, None, None, alias="order_count")
        .aggregate(AggregateFunction.SUM, "o", "amount", alias="gross_spent")
        .build()
    )

    generator = MongoPipelineGenerator()
    compiled = generator.generate(plan)

    lookup_stage = next(s["$lookup"] for s in compiled.pipeline if "$lookup" in s)
    assert lookup_stage["from"] == "customers"
    assert lookup_stage["localField"] == "customer_id"
    assert lookup_stage["foreignField"] == "_id"
    assert lookup_stage["as"] == "c"

    group_stage = next(s["$group"] for s in compiled.pipeline if "$group" in s)
    assert group_stage["_id"] == "$customer_id"
    assert group_stage["order_count"] == {"$sum": 1}
    assert group_stage["gross_spent"] == {"$sum": "$amount"}


def test_elasticsearch_dsl_generator() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-es-1", "logs-events", alias="logs")
        .project("logs", "timestamp")
        .project("logs", "level")
        .project("logs", "message")
        .filter("logs", "level", ComparisonOperator.EQ, "error")
        .filter("logs", "service", ComparisonOperator.IN, ["auth", "payment"])
        .filter("logs", "response_time_ms", ComparisonOperator.GT, 500)
        .sort(("logs", "timestamp"), direction=SortDirection.DESC)
        .limit(50)
        .offset(0)
        .build()
    )

    generator = ElasticsearchDSLGenerator()
    compiled = generator.generate(plan)

    assert isinstance(compiled, CompiledElasticsearchQuery)
    assert compiled.dialect == DialectType.ELASTICSEARCH
    assert compiled.index == "logs-events"
    assert compiled.is_read_only is True

    body = compiled.query_body
    assert "query" in body
    assert "bool" in body["query"]
    filters = body["query"]["bool"]["filter"]
    assert {"term": {"level": "error"}} in filters
    assert {"terms": {"service": ["auth", "payment"]}} in filters
    assert {"range": {"response_time_ms": {"gt": 500}}} in filters
    assert body["_source"] == ["timestamp", "level", "message"]
    assert body["sort"] == [{"timestamp": {"order": "desc"}}]
    assert body["size"] == 50


def test_elasticsearch_dsl_aggregations() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-es-1", "products", alias="p")
        .group_by("p", "category")
        .aggregate(AggregateFunction.AVG, "p", "price", alias="avg_price")
        .aggregate(AggregateFunction.COUNT, None, None, alias="total_products")
        .build()
    )

    generator = ElasticsearchDSLGenerator()
    compiled = generator.generate(plan)

    body = compiled.query_body
    assert body["size"] == 0
    assert "aggs" in body
    assert "group_by_category" in body["aggs"]
    category_agg = body["aggs"]["group_by_category"]
    assert category_agg["terms"]["field"] == "category"
    assert category_agg["aggs"]["avg_price"] == {"avg": {"field": "price"}}
    assert category_agg["aggs"]["total_products"] == {"value_count": {"field": "_index"}}


def test_elasticsearch_dsl_aggregation_sorting() -> None:
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-es-1", "access_logs", alias="al")
        .group_by("al", "endpoint")
        .aggregate(AggregateFunction.COUNT, "al", "endpoint", alias="access_logs_count")
        .aggregate(AggregateFunction.AVG, "al", "response_time_ms", alias="avg_response_time")
        .sort("access_logs_count", direction=SortDirection.DESC)
        .build()
    )

    generator = ElasticsearchDSLGenerator()
    compiled = generator.generate(plan)

    body = compiled.query_body
    assert "sort" not in body  # Must NOT place unmapped agg alias in top-level sort
    assert "aggs" in body
    assert "group_by_endpoint" in body["aggs"]
    endpoint_agg = body["aggs"]["group_by_endpoint"]
    assert endpoint_agg["terms"]["field"] == "endpoint"
    assert endpoint_agg["terms"]["order"] == {"access_logs_count": "desc"}
    assert endpoint_agg["aggs"]["access_logs_count"] == {"value_count": {"field": "endpoint"}}
    assert endpoint_agg["aggs"]["avg_response_time"] == {"avg": {"field": "response_time_ms"}}


def test_multidialect_compiler_cross_database() -> None:
    # Cross-database join between Postgres (customers) and MongoDB (orders)
    plan = (
        LogicalPlanBuilder(workspace_id="ws-test")
        .from_source("conn-pg", "customers", alias="c")
        .join(
            right_connection_id="conn-mongo",
            right_source_name="orders",
            right_alias="o",
            join_type=JoinType.INNER,
            left_col=("c", "id"),
            right_col=("o", "customer_id"),
            is_cross_database=True,
        )
        .project("c", "name")
        .project("o", "total_amount")
        .filter("c", "city", ComparisonOperator.EQ, "Bengaluru")
        .filter("o", "total_amount", ComparisonOperator.GT, 500)
        .limit(100)
        .build()
    )

    compiler = MultiDialectCompiler()
    connection_types = {
        "conn-pg": DatabaseType.POSTGRESQL,
        "conn-mongo": DatabaseType.MONGODB,
    }

    result = compiler.compile(plan, connection_types)

    assert result.is_cross_database is True
    assert result.cross_database_plan is not None
    assert len(result.cross_database_plan.sub_queries) == 2

    # Check Postgres subquery
    pg_sub = next(
        q for q in result.cross_database_plan.sub_queries if isinstance(q, CompiledSQLQuery)
    )
    assert pg_sub.target_table == "customers"
    assert "city" in pg_sub.sql

    # Check Mongo subquery
    mongo_sub = next(
        q for q in result.cross_database_plan.sub_queries if isinstance(q, CompiledMongoQuery)
    )
    assert mongo_sub.collection == "orders"

    # Check join step
    assert len(result.cross_database_plan.join_steps) == 1
    join_step = result.cross_database_plan.join_steps[0]
    assert join_step.left_key == "id"
    assert join_step.right_key == "customer_id"
    assert join_step.strategy == JoinStrategyType.HASH_JOIN


def test_api_compile_endpoint(
    client: TestClient, test_workspace: Workspace, user_auth_headers: dict[str, str]
) -> None:
    plan_payload = {
        "workspace_id": test_workspace.id,
        "sources": [
            {
                "connection_id": "conn-pg-dummy",
                "source_name": "users",
                "alias": "u",
            }
        ],
        "projections": [
            {"table": "u", "column": "id"},
            {"table": "u", "column": "email"},
        ],
        "filters": [
            {
                "field": {"table": "u", "column": "is_active"},
                "operator": "eq",
                "value": True,
            }
        ],
        "limit": 25,
        "offset": 0,
    }

    res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/query/plan/compile",
        json=plan_payload,
        headers=user_auth_headers,
    )

    assert res.status_code == 200
    data = res.json()
    assert data["workspace_id"] == test_workspace.id
    assert data["is_cross_database"] is False
    assert data["single_query"]["dialect"] == "postgres"
    assert 'FROM "users"' in data["single_query"]["sql"]
    assert ":p1" in data["single_query"]["parameterized_sql"]
