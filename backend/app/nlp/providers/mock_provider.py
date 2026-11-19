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

    def _parse_query_intent(self, lower: str) -> dict[str, Any]:
        """Dynamically extract structured query intent from any natural language question."""
        import re

        # 1. Target entities
        entities: list[str] = []
        if re.search(r"\b(customers?|users?|buyers?|clients?)\b", lower):
            entities.append("customers")
        if re.search(r"\b(order_items?|line_items?)\b", lower):
            entities.append("order_items")
        if re.search(r"\b(orders?|transactions?|checkouts?)\b", lower) or (
            re.search(r"\bpurchases?\b", lower) and "verified purchase" not in lower
        ):
            entities.append("orders")
        if re.search(r"\b(products?|merchandise|goods|sku|items?)\b", lower):
            if "products" not in entities:
                entities.append("products")
        if re.search(r"\b(reviews?|ratings?|feedback|comments?)\b", lower):
            entities.append("reviews")
        if re.search(r"\b(catalog|search\s+index)\b", lower):
            entities.append("catalog")
        if re.search(r"\b(access_logs?|server_logs?|status_code|response_time|endpoint)\b", lower) or (
            re.search(r"\blogs?\b", lower) and "catalog" not in lower
        ):
            entities.append("access_logs")
        if re.search(r"\b(events?|telemetry)\b", lower):
            entities.append("events")

        if not entities:
            entities = ["products"]

        # 2. Filters
        filters: list[dict[str, Any]] = []

        # Country
        country_patterns = [
            (r"\b(germany|deutschland|\bde\b(?!\s+(facto|novo)))\b", "DE"),
            (r"\b(united\s+states|usa|\busa?\b|america)\b", "US"),
            (r"\b(united\s+kingdom|britain|england|\buk\b)\b", "UK"),
            (r"\b(france|\bfr\b)\b", "FR"),
            (r"\b(india|bharat)\b", "IN"),
            (r"\b(canada|\bca\b)\b", "CA"),
            (r"\b(australia|\bau\b)\b", "AU"),
            (r"\b(japan|\bjp\b)\b", "JP"),
        ]
        for pattern, code in country_patterns:
            if re.search(pattern, lower):
                col = "shipping_country" if "orders" in entities and "customers" not in entities else "country"
                filters.append({"column": col, "operator": "eq", "value": code})
                break

        # Status
        if re.search(r"\b(not\s+paid|unpaid)\b", lower):
            filters.append({"column": "status", "operator": "eq", "value": "pending"})
        elif re.search(r"\bpending\b", lower):
            filters.append({"column": "status", "operator": "eq", "value": "pending"})
        elif re.search(r"\b(completed|paid)\b", lower):
            filters.append({"column": "status", "operator": "eq", "value": "completed"})
        elif re.search(r"\b(cancelled|canceled)\b", lower):
            filters.append({"column": "status", "operator": "eq", "value": "cancelled"})
        elif re.search(r"\bactive\b", lower) and not re.search(r"\binactive\b", lower):
            filters.append({"column": "status", "operator": "eq", "value": "active"})

        # Category
        categories = ["electronics", "kitchen", "audio", "furniture", "gaming", "appliances", "fitness", "books"]
        for cat in categories:
            if re.search(rf"\b{cat}\b", lower):
                filters.append({"column": "category", "operator": "eq", "value": cat.capitalize()})
                break

        # Rating
        if re.search(r"\b(5-star|5\s+star|rating\s+5|five\s+star)\b", lower):
            filters.append({"column": "rating", "operator": "eq", "value": 5})
        elif re.search(r"\b(below\s+3|< ?3|less\s+than\s+3)\b", lower):
            filters.append({"column": "rating", "operator": "lt", "value": 3})
        elif re.search(r"\b(4-star|4\s+star|rating\s+4|four\s+star)\b", lower):
            filters.append({"column": "rating", "operator": "gte", "value": 4})

        # Booleans
        if re.search(r"\bverified\b", lower):
            filters.append({"column": "verified_purchase", "operator": "eq", "value": True})
        if re.search(r"\bin[- ]stock\b", lower):
            if "catalog" in entities:
                filters.append({"column": "in_stock", "operator": "eq", "value": True})
            else:
                filters.append({"column": "stock_quantity", "operator": "gt", "value": 0})
        elif re.search(r"\bout[- ]of[- ]stock\b", lower):
            if "catalog" in entities:
                filters.append({"column": "in_stock", "operator": "eq", "value": False})
            else:
                filters.append({"column": "stock_quantity", "operator": "eq", "value": 0})

        # Numeric comparisons
        num_patterns = [
            (r"(?:price|amount|total|total_amount|stock|stock_quantity|response_time|response_time_ms|status_code)\s*(?:>=|=>|at least)\s*(\d+(?:\.\d+)?)", "gte"),
            (r"(?:price|amount|total|total_amount|stock|stock_quantity|response_time|response_time_ms|status_code)\s*(?:<=|=<|at most)\s*(\d+(?:\.\d+)?)", "lte"),
            (r"(?:price|amount|total|total_amount|stock|stock_quantity|response_time|response_time_ms|status_code)\s*(?:>|greater than|more than|over|above)\s*(\d+(?:\.\d+)?)", "gt"),
            (r"(?:price|amount|total|total_amount|stock|stock_quantity|response_time|response_time_ms|status_code)\s*(?:<|less than|fewer than|under|below)\s*(\d+(?:\.\d+)?)", "lt"),
            (r"(?:price|amount|total|total_amount|stock|stock_quantity|response_time|response_time_ms|status_code)\s*(?:=|is|equal to)\s*(\d+(?:\.\d+)?)", "eq"),
        ]
        matched_col = False
        for pat, op in num_patterns:
            m = re.search(pat, lower)
            if m:
                val = float(m.group(1)) if "." in m.group(1) else int(m.group(1))
                col_match = re.search(r"(price|amount|total|total_amount|stock|stock_quantity|response_time|response_time_ms|status_code)", m.group(0))
                col_name = col_match.group(1) if col_match else "price"
                if col_name in ("amount", "total"):
                    col_name = "total_amount"
                elif col_name == "stock":
                    col_name = "stock_quantity"
                elif col_name == "response_time":
                    col_name = "response_time_ms"
                filters.append({"column": col_name, "operator": op, "value": val})
                matched_col = True
                break

        if not matched_col:
            gen_m = re.search(r"\b(?:greater than|more than|over|above|>)\s*(\d+(?:\.\d+)?)\b", lower)
            if gen_m:
                val = float(gen_m.group(1)) if "." in gen_m.group(1) else int(gen_m.group(1))
                col = "price" if "products" in entities else ("total_amount" if "orders" in entities else "id")
                filters.append({"column": col, "operator": "gt", "value": val})
            gen_lt = re.search(r"\b(?:less than|fewer than|under|below|<)\s*(\d+(?:\.\d+)?)\b", lower)
            if gen_lt:
                val = float(gen_lt.group(1)) if "." in gen_lt.group(1) else int(gen_lt.group(1))
                col = "stock_quantity" if "stock" in lower else ("price" if "products" in entities else "total_amount")
                filters.append({"column": col, "operator": "lt", "value": val})

        # Group By
        group_by: list[str] = []
        if re.search(r"\b(?:by|per|each)\s+country\b", lower):
            group_by.append("country")
        if re.search(r"\b(?:by|per|each)\s+(?:product\s+)?category\b", lower):
            group_by.append("category")
        if re.search(r"\b(?:by|per|each)\s+status\b", lower):
            group_by.append("status")
        if re.search(r"\b(?:by|per|each)\s+rating\b", lower):
            group_by.append("rating")
        if re.search(r"\b(?:by|per|each)\s+customer\b", lower):
            group_by.append("customer_id")
        if re.search(r"\b(?:by|per|each)\s+product\b", lower) and "category" not in lower:
            group_by.append("product_id")

        # Metrics
        metrics: list[str] = []
        if any(k in lower for k in ("revenue", "sales", "turnover")):
            metrics.append("revenue")
        if any(k in lower for k in ("total amount", "total spend", "spend")):
            metrics.append("total_amount")
        if any(k in lower for k in ("how many", "count", "number of")):
            metrics.append("count")
        if any(k in lower for k in ("average", "avg", "mean")):
            metrics.append("avg")

        # Limit & Sort
        limit = 20
        m_lim = re.search(r"\b(?:top|first|limit)\s+(\d+)\b", lower)
        if m_lim:
            limit = int(m_lim.group(1))
        elif any(k in lower for k in ("top", "highest", "most")):
            limit = 5

        order_by: list[dict[str, str]] = []
        if any(k in lower for k in ("top", "highest", "most", "expensive", "best", "descending", "desc")):
            sort_col = metrics[0] if metrics else ("revenue" if "revenue" in lower else "price" if "products" in entities else "total_amount" if "orders" in entities else "id")
            order_by.append({"column": sort_col, "direction": "desc"})
        elif any(k in lower for k in ("bottom", "lowest", "least", "cheapest", "worst", "ascending", "asc")):
            sort_col = metrics[0] if metrics else ("price" if "products" in entities else "id")
            order_by.append({"column": sort_col, "direction": "asc"})

        return {
            "domain": "database",
            "target_entities": entities,
            "metrics": metrics,
            "filters": filters,
            "group_by": group_by,
            "order_by": order_by,
            "ranking_limit": limit,
            "time_range": {"type": "current_month"} if ("this month" in lower or "recent" in lower) else None,
            "is_ambiguous": False,
            "ambiguity_reason": None,
        }

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
            return json.dumps(self._parse_query_intent(lower_query))

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
