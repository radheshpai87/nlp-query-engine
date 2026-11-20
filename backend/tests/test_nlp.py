from app.engine.generators.sql_generator import PostgresSQLGenerator
from app.engine.ir.models import (
    AggregateFunction,
    ColumnRef,
    ComparisonOperator,
    FilterPredicate,
    LogicalQueryPlan,
    SourceNode,
)
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.execution import ExecutionColumnMetadata, ExecutionResult
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot, UserDefinedRelationship
from app.nlp.intent_extractor import (
    ExtractedFilter,
    ExtractedIntent,
    ExtractedSort,
    IntentExtractor,
)
from app.nlp.plan_synthesizer import LogicalPlanSynthesizer
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.nlp.providers.mock_provider import MockLLMProvider
from app.nlp.result_explainer import ResultExplainer
from app.nlp.schema_context import format_schema_context_for_llm


class CapturingProvider(BaseLLMProvider):
    """Records prompts so tests can assert what the explainer sent."""

    def __init__(self) -> None:
        super().__init__("capturing")
        self.messages: list[LLMMessage] = []

    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: object,
    ) -> LLMResponse:
        self.messages = list(messages)
        return LLMResponse(
            content='{"summary": "ok", "key_insights": []}',
            model="capturing",
        )

    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: object,
    ) -> LLMResponse:
        return self.generate(messages, temperature, max_tokens, **kwargs)


def test_mock_llm_provider() -> None:
    provider = MockLLMProvider()
    assert provider.is_healthy() is True

    # Default fallback
    res = provider.generate([LLMMessage(role="user", content="Hello world")])
    assert res.content is not None
    assert res.tokens_used > 0

    # Custom response matcher
    provider.register_response("ping", "pong")
    res_custom = provider.generate([LLMMessage(role="user", content="Can you ping please?")])
    assert res_custom.content == "pong"


def test_schema_context_formatter() -> None:
    snap = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-pg",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-pg",
                name="customers",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="email", data_type="varchar", is_nullable=False),
                    SchemaField(name="city", data_type="varchar", is_nullable=True),
                ],
                row_count_estimate=100,
            )
        ],
        total_objects=1,
    )

    ctx = format_schema_context_for_llm({"conn-pg": snap})
    assert "customers" in ctx
    assert "id" in ctx
    assert "PRIMARY KEY" in ctx
    assert "email" in ctx


def test_intent_extractor_llm_mode() -> None:
    provider = MockLLMProvider()
    llm_json = """
    {
        "target_entities": ["customers", "orders"],
        "projections": ["customers.name", "orders.total"],
        "filters": [
            {"column": "orders.status", "operator": "EQ", "value": "completed"}
        ],
        "aggregations": [
            {"function": "SUM", "column": "orders.total", "alias": "total_spend"}
        ],
        "sort": {"column": "total_spend", "direction": "DESC"},
        "limit": 10
    }
    """
    provider.register_response("top customers", llm_json)

    extractor = IntentExtractor(provider=provider)
    intent = extractor.extract(
        query="show top customers who completed orders",
        snapshots={},
    )

    assert intent.target_entities == ["customers", "orders"]
    assert intent.limit == 10
    assert len(intent.filters) == 1
    assert intent.filters[0].column == "orders.status"
    assert intent.sort is not None
    assert intent.sort.column == "total_spend"
    assert intent.sort.direction == "DESC"


def test_intent_extractor_fallback_mode() -> None:
    provider = MockLLMProvider()
    # Deliberately return invalid json to trigger deterministic rule-based extractor
    provider.register_response("top 5 products", "I cannot parse this into json")

    snap = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-1",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-1",
                name="products",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="revenue", data_type="numeric"),
                ],
            )
        ],
        total_objects=1,
    )

    extractor = IntentExtractor(provider=provider)
    intent = extractor.extract("top 5 products by revenue", snapshots={"conn-1": snap})

    assert "products" in intent.target_entities
    assert intent.limit == 5
    assert intent.sort is not None
    assert intent.sort.column == "revenue"
    assert intent.sort.direction == "DESC"


def test_plan_synthesizer_single_and_multi_table() -> None:
    conn_pg = DatabaseConnection(
        id="conn-pg",
        workspace_id="ws-1",
        name="Postgres DB",
        db_type=DatabaseType.POSTGRESQL,
        host="localhost",
        database="db",
        username="u",
    )
    conn_mongo = DatabaseConnection(
        id="conn-mongo",
        workspace_id="ws-1",
        name="Mongo DB",
        db_type=DatabaseType.MONGODB,
        host="localhost",
        database="analytics",
        username="u",
    )
    connections = {"conn-pg": conn_pg, "conn-mongo": conn_mongo}

    snap_pg = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-pg",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-pg",
                name="customers",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="name", data_type="varchar"),
                ],
            )
        ],
        total_objects=1,
    )
    snap_mongo = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-mongo",
        fingerprint="fp-2",
        objects=[
            SchemaObject(
                connection_id="conn-mongo",
                name="orders",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="customer_id", data_type="integer"),
                    SchemaField(name="amount", data_type="numeric"),
                ],
            )
        ],
        total_objects=1,
    )
    snapshots = {"conn-pg": snap_pg, "conn-mongo": snap_mongo}

    relationship = UserDefinedRelationship(
        workspace_id="ws-1",
        name="customer_orders",
        source_connection_id="conn-pg",
        source_table="customers",
        source_fields=["id"],
        target_connection_id="conn-mongo",
        target_table="orders",
        target_fields=["customer_id"],
    )

    synthesizer = LogicalPlanSynthesizer()

    # 1. Single entity query plan
    single_intent = ExtractedIntent(
        target_entities=["customers"],
        limit=5,
        filters=[ExtractedFilter(column="name", operator="EQ", value="Alice")],
    )
    plan_single = synthesizer.synthesize(
        workspace_id="ws-1",
        query="show customer Alice",
        intent=single_intent,
        connections=connections,
        snapshots=snapshots,
    )
    assert len(plan_single.sources) == 1
    assert plan_single.sources[0].source_name == "customers"
    assert plan_single.limit == 5
    assert len(plan_single.filters) == 1
    assert plan_single.filters[0].operator == ComparisonOperator.EQ

    # 2. Multi-entity federated cross-database join
    multi_intent = ExtractedIntent(
        target_entities=["customers", "orders"],
        limit=20,
        sort=ExtractedSort(column="amount", direction="DESC"),
    )
    plan_multi = synthesizer.synthesize(
        workspace_id="ws-1",
        query="join customers and orders",
        intent=multi_intent,
        connections=connections,
        snapshots=snapshots,
        relationships=[relationship],
    )
    assert len(plan_multi.sources) == 1
    assert len(plan_multi.joins) == 1
    assert plan_multi.joins[0].right_source.source_name == "orders"
    assert plan_multi.joins[0].conditions[0].left_field.column in ("id", "customer_id")


def test_result_explainer_fallback_and_llm() -> None:
    provider = MockLLMProvider()
    explainer = ResultExplainer(provider=provider)

    plan = LogicalQueryPlan(
        workspace_id="ws-1",
        sources=[SourceNode(connection_id="conn-1", source_name="orders", alias="ord")],
        filters=[
            FilterPredicate(
                field=ColumnRef(table="orders", column="status"),
                operator=ComparisonOperator.EQ,
                value="completed",
            )
        ],
        limit=10,
    )

    # 1. Fallback zero rows
    exec_empty = ExecutionResult(
        execution_id="exec-1",
        workspace_id="ws-1",
        columns=[ExecutionColumnMetadata(name="id", data_type="integer")],
        rows=[],
        row_count=0,
        duration_ms=12.5,
        sources_involved=["orders"],
    )
    exp_empty = explainer._fallback_explanation("show completed orders", plan, exec_empty)
    assert "No records matched" in exp_empty.summary
    assert exp_empty.provenance["row_count"] == 0

    # 2. Fallback multiple rows
    exec_multi = ExecutionResult(
        execution_id="exec-2",
        workspace_id="ws-1",
        columns=[ExecutionColumnMetadata(name="id", data_type="integer")],
        rows=[{"id": 1}, {"id": 2}],
        row_count=2,
        duration_ms=18.0,
        sources_involved=["orders"],
    )
    exp_multi = explainer._fallback_explanation("show completed orders", plan, exec_multi)
    assert "Retrieved 2 records" in exp_multi.summary

    # 3. LLM-assisted explanation
    provider.register_response(
        "friendly data analytics assistant",
        '{"summary": "Found 2 orders successfully.", "key_insights": ["High completion rate."]}',
    )
    exp_llm = explainer.explain("show completed orders", plan, exec_multi)
    assert "Found 2 orders successfully." in exp_llm.summary
    assert "High completion rate." in exp_llm.key_insights


def test_plan_synthesizer_uses_line_item_revenue_for_product_ranking() -> None:
    conn_pg = DatabaseConnection(
        id="conn-pg",
        workspace_id="ws-1",
        name="Postgres DB",
        db_type=DatabaseType.POSTGRESQL,
        host="localhost",
        database="db",
        username="u",
    )
    snapshot = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-pg",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-pg",
                name="products",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="name", data_type="varchar"),
                    SchemaField(name="category", data_type="varchar"),
                ],
            ),
            SchemaObject(
                connection_id="conn-pg",
                name="order_items",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="order_id", data_type="integer"),
                    SchemaField(name="product_id", data_type="integer"),
                    SchemaField(name="quantity", data_type="integer"),
                    SchemaField(name="unit_price", data_type="numeric"),
                ],
            ),
            SchemaObject(
                connection_id="conn-pg",
                name="orders",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="status", data_type="varchar"),
                    SchemaField(name="total_amount", data_type="numeric"),
                    SchemaField(name="order_date", data_type="date"),
                ],
            ),
        ],
        total_objects=3,
    )
    # Simulate an LLM that groups by product_id; the generic group-by branch
    # must not hijack the product-revenue query.
    intent = ExtractedIntent(
        target_entities=["products"],
        group_by=["product_id"],
        limit=5,
        ranking_limit=5,
    )

    plan = LogicalPlanSynthesizer().synthesize(
        workspace_id="ws-1",
        query="Show me the top 5 products by revenue",
        intent=intent,
        connections={"conn-pg": conn_pg},
        snapshots={"conn-pg": snapshot},
        resolved_context={"revenue_definition": "gross"},
    )

    revenue = next(agg for agg in plan.aggregations if agg.alias == "revenue")
    assert revenue.function == AggregateFunction.SUM
    assert revenue.field is not None and revenue.field.column == "unit_price"
    assert revenue.multiplier is not None and revenue.multiplier.column == "quantity"
    assert plan.limit == 5

    sql = PostgresSQLGenerator().generate(plan).sql
    assert 'SUM("oi"."unit_price" * "oi"."quantity") AS "revenue"' in sql
    assert 'COUNT("oi"."id") AS "order_items_count"' not in sql
    assert 'ORDER BY "revenue" DESC' in sql
    assert "LIMIT 5" in sql


def test_result_explainer_prompt_includes_all_rows() -> None:
    provider = CapturingProvider()
    explainer = ResultExplainer(provider=provider)
    plan = LogicalQueryPlan(
        workspace_id="ws-1",
        sources=[SourceNode(connection_id="conn-1", source_name="orders", alias="o")],
        limit=20,
    )
    rows = [
        {"status": "completed", "order_count": 51},
        {"status": "pending", "order_count": 13},
        {"status": "refunded", "order_count": 12},
        {"status": "cancelled", "order_count": 12},
        {"status": "processing", "order_count": 12},
    ]
    result = ExecutionResult(
        execution_id="exec-1",
        workspace_id="ws-1",
        columns=[],
        rows=rows,
        row_count=len(rows),
        duration_ms=4.2,
        sources_involved=["orders"],
    )

    explainer.explain("Count orders by status", plan, result)

    system_prompt = provider.messages[0].content
    user_content = provider.messages[-1].content
    assert "Do not invent numbers" in system_prompt
    assert "Complete result: yes" in user_content
    for status in ("completed", "pending", "refunded", "cancelled", "processing"):
        assert status in user_content


def test_suggested_queries_generator_heuristic():
    from app.nlp.suggested_queries import SuggestedQueriesGenerator

    snap = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-pg",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-pg",
                name="products",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="price", data_type="numeric", is_nullable=False),
                ],
            ),
            SchemaObject(
                connection_id="conn-pg",
                name="orders",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="total_amount", data_type="numeric", is_nullable=False),
                ],
            ),
        ],
    )
    generator = SuggestedQueriesGenerator(provider=None)
    suggestions = generator.generate([snap])

    assert isinstance(suggestions, list)
    assert len(suggestions) > 0
    assert any("product" in s.lower() or "order" in s.lower() for s in suggestions)


def test_suggested_queries_generator_with_llm():
    from app.nlp.providers.mock_provider import MockLLMProvider
    from app.nlp.suggested_queries import SuggestedQueriesGenerator

    snap = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-pg",
        fingerprint="fp-1",
        objects=[
            SchemaObject(
                connection_id="conn-pg",
                name="products",
                fields=[SchemaField(name="id", data_type="integer", is_primary_key=True)],
            ),
        ],
    )
    mock_json = '["Show top 5 products by revenue", "Which customers bought electronics?", "What are total sales today?"]'
    provider = MockLLMProvider()
    provider.register_response("analytical queries", mock_json)
    generator = SuggestedQueriesGenerator(provider=provider)
    suggestions = generator.generate([snap])

    assert len(suggestions) == 3
    assert suggestions[0] == "Show top 5 products by revenue"

