import json
import time
from typing import Any

from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse


class MockLLMProvider(BaseLLMProvider):
    """Deterministic, zero-dependency LLM provider for unit tests and local development."""

    def __init__(self, model_name: str = "mock-llm-v1") -> None:
        super().__init__(model_name)
        self._custom_responses: list[tuple[str, str]] = []

    def register_response(self, pattern: str, response: str) -> None:
        """Register a custom trigger substring and corresponding response for deterministic testing."""
        self._custom_responses.append((pattern.lower(), response))

    def _generate_response(self, messages: list[LLMMessage]) -> str:
        last_user_msg = next((m.content for m in reversed(messages) if m.role == "user"), "")
        sys_msg = next((m.content for m in messages if m.role == "system"), "")
        full_text = f"{sys_msg}\n{last_user_msg}".lower()

        # Check registered custom responses first
        for trigger, resp in self._custom_responses:
            if trigger in full_text or trigger in last_user_msg.lower():
                return resp

        lower_query = last_user_msg.lower()

        # Case 1: Intent Extraction (expects JSON)
        if "extract intent" in sys_msg.lower() or "json" in sys_msg.lower():
            limit_val = 20
            import re

            m = re.search(r"\btop\s+(\d+)\b", lower_query)
            if m:
                limit_val = int(m.group(1))

            if "top" in lower_query or "revenue" in lower_query or "product" in lower_query:
                return json.dumps(
                    {
                        "domain": "e-commerce",
                        "target_entities": ["products", "orders"],
                        "metrics": ["revenue", "total_amount"],
                        "filters": [{"column": "status", "operator": "eq", "value": "completed"}],
                        "group_by": ["product_name"],
                        "order_by": [{"column": "revenue", "direction": "desc"}],
                        "ranking_limit": limit_val if limit_val != 20 else 5,
                        "time_range": {"type": "current_month"},
                        "is_ambiguous": False,
                        "ambiguity_reason": None,
                    }
                )

            if "customer" in lower_query and ("unpaid" in lower_query or "not paid" in lower_query):
                return json.dumps(
                    {
                        "domain": "sales",
                        "target_entities": ["customers", "orders"],
                        "metrics": ["order_count"],
                        "filters": [
                            {"column": "payment_status", "operator": "neq", "value": "paid"}
                        ],
                        "group_by": ["customer_id", "customer_name"],
                        "order_by": [],
                        "ranking_limit": 50,
                        "time_range": None,
                        "is_ambiguous": False,
                        "ambiguity_reason": None,
                    }
                )

            # Default generic intent JSON
            return json.dumps(
                {
                    "domain": "general_database",
                    "target_entities": ["primary_table"],
                    "metrics": [],
                    "filters": [],
                    "group_by": [],
                    "order_by": [],
                    "ranking_limit": 20,
                    "time_range": None,
                    "is_ambiguous": False,
                    "ambiguity_reason": None,
                }
            )

        # Case 2: Natural Language Explanation of Results
        if "explain result" in sys_msg.lower() or "explanation" in sys_msg.lower():
            return json.dumps(
                {
                    "summary": "Retrieved records matching your query successfully.",
                    "key_insights": ["Query executed within permitted resource constraints."],
                }
            )

        # Case 3: Conversational assistant fallback
        return f"I analyzed your database request for: '{last_user_msg}'. All read-only constraints and schemas are active."

    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        start = time.perf_counter()
        content = self._generate_response(messages)
        duration = (time.perf_counter() - start) * 1000
        return LLMResponse(
            content=content,
            model=self.model_name,
            usage={"prompt_tokens": 150, "completion_tokens": 80, "total_tokens": 230},
            latency_ms=round(duration, 2),
        )

    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        return self.generate(messages, temperature=temperature, max_tokens=max_tokens, **kwargs)
