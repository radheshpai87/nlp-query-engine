from unittest.mock import MagicMock

from app.models.ambiguity import AmbiguityEvaluationResult
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.nlp.domain_guard import DomainCheckResult, DomainGuard, DomainQueryCategory
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.nlp.schema_rag import SchemaRAGService
from app.services.ambiguity_service import AmbiguityService


class CountingMockLLMProvider(BaseLLMProvider):
    """Mock LLM provider that tracks call count to verify zero LLM calls for off-topic queries."""

    def __init__(self) -> None:
        super().__init__(model_name="mock-counter")
        self.call_count = 0

    def generate(self, messages: list[LLMMessage], **kwargs) -> LLMResponse:
        self.call_count += 1
        return LLMResponse(content="{}", model=self.model_name)

    async def generate_async(self, messages: list[LLMMessage], **kwargs) -> LLMResponse:
        self.call_count += 1
        return LLMResponse(content="{}", model=self.model_name)


def test_domain_guard_off_topic_queries_rejected() -> None:
    """Ensure various non-database questions are rejected without touching an LLM."""
    off_topic_queries = [
        "What is the capital of France?",
        "Can you write a poem about the ocean?",
        "Tell me a funny joke",
        "How do I cook pasta carbonara?",
        "Who was Albert Einstein?",
        "What is the weather in Tokyo right now?",
        "Who won the Super Bowl last year?",
        "How do airplanes fly in the sky?",
        "Write a Python script to invert a binary tree",
        "Can dogs eat grapes?",
        "What is the meaning of life?",
        "Explain quantum computing simply",
        "What should I wear to a job interview?",
        "Who is the president of the United States?",
        "Translate hello world into Spanish",
        "Write an essay about global warming",
    ]

    for q in off_topic_queries:
        res = DomainGuard.check_query(q)
        assert res.is_allowed is False, f"Expected '{q}' to be blocked"
        assert res.category == DomainQueryCategory.OUT_OF_DOMAIN, f"Expected '{q}' to be OUT_OF_DOMAIN"
        assert res.direct_response is not None
        assert "Out of Scope" in res.direct_response or "strictly scoped" in res.direct_response


def test_domain_guard_greetings_zero_token_response() -> None:
    """Ensure greetings and help queries return deterministic introductions with 0 LLM calls."""
    greetings = [
        "hi",
        "hello",
        "hey there",
        "who are you?",
        "what can you do",
        "what is nexus query",
        "help",
    ]

    for g in greetings:
        res = DomainGuard.check_query(g)
        assert res.is_allowed is False, f"Expected '{g}' to be handled deterministically"
        assert res.category == DomainQueryCategory.GREETING
        assert res.direct_response is not None
        assert "Nexus Query" in res.direct_response


def test_domain_guard_valid_database_queries_allowed() -> None:
    """Ensure real database queries with schema entities and analytical terms are allowed."""
    valid_queries = [
        "Show me top 5 products by revenue",
        "How many customers registered in the last 30 days?",
        "Find orders with status pending",
        "What is the average rating of reviews?",
        "List all customers from California",
        "Calculate total order amount grouped by country",
        "Show patients admitted yesterday",
    ]

    # Sample snapshots with ecommerce tables
    snap = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-1",
        fingerprint="fp-1",
        objects=[
            SchemaObject(connection_id="conn-1", name="products", fields=[SchemaField(name="price", data_type="numeric")]),
            SchemaObject(connection_id="conn-1", name="customers", fields=[SchemaField(name="email", data_type="varchar")]),
            SchemaObject(connection_id="conn-1", name="orders", fields=[SchemaField(name="total_amount", data_type="numeric")]),
            SchemaObject(connection_id="conn-1", name="reviews", fields=[SchemaField(name="rating", data_type="numeric")]),
            SchemaObject(connection_id="conn-1", name="patients", fields=[SchemaField(name="admission_date", data_type="date")]),
        ],
    )

    for q in valid_queries:
        res = DomainGuard.check_query(q, snapshots={"conn-1": snap})
        assert res.is_allowed is True, f"Expected '{q}' to be allowed as valid database query"
        assert res.category == DomainQueryCategory.VALID_DATABASE_QUERY


def test_schema_rag_never_calls_llm_for_off_topic_questions() -> None:
    """Verify SchemaRAGService makes exactly 0 LLM API calls when an off-topic query is submitted."""
    mock_provider = CountingMockLLMProvider()
    rag_service = SchemaRAGService(provider=mock_provider)

    off_topic = "What is the capital of Germany?"
    result = rag_service.evaluate_and_plan(
        workspace_id="ws-test",
        query=off_topic,
        connections={},
        snapshots={},
    )

    # Must NOT call the provider
    assert mock_provider.call_count == 0
    assert result.intent == "guardrail_blocked"
    assert result.direct_response is not None
    assert "Out of Scope" in result.direct_response


def test_ambiguity_service_never_calls_llm_for_off_topic_questions() -> None:
    """Verify AmbiguityService makes 0 LLM calls and returns guardrail response for non-database query."""
    mock_provider = CountingMockLLMProvider()

    conn_repo = MagicMock()
    conn_repo.get_by_workspace.return_value = []
    schema_repo = MagicMock()
    schema_repo.get_all_latest_for_workspace.return_value = []
    audit_service = MagicMock()

    service = AmbiguityService(
        connection_repo=conn_repo,
        schema_repo=schema_repo,
        audit_service=audit_service,
        llm_provider=mock_provider,
    )

    off_topic = "Write a poem about sunflowers"
    eval_res = service.evaluate_query(
        workspace_id="ws-test",
        query=off_topic,
    )

    # Verification: Zero LLM provider calls
    assert mock_provider.call_count == 0
    assert eval_res.is_guardrail_blocked is True
    assert eval_res.suggested_action == "guardrail_blocked"
    assert eval_res.conversational_response is not None
    assert "Out of Scope" in eval_res.conversational_response
