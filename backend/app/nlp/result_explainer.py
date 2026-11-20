import json
import re
from typing import Any

from pydantic import BaseModel, Field

from app.engine.ir.models import LogicalQueryPlan
from app.models.execution import ExecutionResult
from app.nlp.providers.base import BaseLLMProvider, LLMMessage


class ResultExplanationResponse(BaseModel):
    summary: str
    key_insights: list[str] = Field(default_factory=list)
    provenance: dict[str, Any] = Field(default_factory=dict)


# Keep prompts bounded while giving the model every row for typical result sets.
MAX_EXPLANATION_ROWS = 50


class ResultExplainer:
    """Synthesizes human-friendly natural language explanations and provenance from execution results."""

    def __init__(self, provider: BaseLLMProvider) -> None:
        self.provider = provider

    def _fallback_explanation(
        self,
        natural_query: str,
        plan: LogicalQueryPlan,
        result: ExecutionResult,
    ) -> ResultExplanationResponse:
        """Deterministic rule-based explanation when LLM is unavailable."""
        count = result.row_count
        sources_str = ", ".join(result.sources_involved) or "connected databases"
        lower_q = natural_query.lower()

        # Extract first row sample highlights
        first_row = result.rows[0] if result.rows else {}
        name_val = first_row.get("name") or first_row.get("item_name") or first_row.get("customer_name")
        price_val = first_row.get("price") or first_row.get("unit_price") or first_row.get("total_amount")
        price_str = (
            f"${float(price_val):,.2f}"
            if price_val is not None and str(price_val).replace(".", "", 1).isdigit()
            else ""
        )

        # Check if question is a verification / boolean inquiry
        is_verification = (
            any(lower_q.startswith(p) for p in ("is there", "are there", "has any", "did any", "i want to know if", "can you tell if", "does any"))
            or ("bought" in lower_q and ("less" in lower_q or "under" in lower_q))
        )

        if count == 0:
            if is_verification:
                summary = f"No, no records were found matching your criteria in {sources_str}."
            else:
                summary = f"No records matched your request '{natural_query}' across {sources_str}."
            insights = [
                "The query executed successfully with read-only assurance, but zero rows met all filter criteria.",
                f"Searched across {sources_str}."
            ]
        elif count == 1:
            if is_verification and name_val and price_str:
                summary = f"Yes, found 1 matching record: **{name_val}** ({price_str})."
            elif is_verification:
                summary = "Yes, found 1 matching record for your request."
            else:
                summary = f"Found 1 matching record for '{natural_query}' in {sources_str}."
            sample_items = [f"{k}: {v}" for k, v in list(first_row.items())[:4]]
            insights = [f"Result: {', '.join(sample_items)}"]
        else:
            if is_verification and name_val and price_str:
                summary = f"Yes, found **{count} matching records**. For example, **{name_val}** was found at {price_str}."
            elif any(k in lower_q for k in ("how many", "count", "number of")):
                summary = f"Found **{count} records** matching your question."
            elif any(k in lower_q for k in ("top", "highest", "most", "best")):
                summary = f"Here are the top **{count} records** matching '{natural_query}'."
            else:
                summary = f"Retrieved {count} records matching '{natural_query}' across {sources_str}."

            insights = [
                f"Processed successfully across {len(result.sources_involved)} source(s): {sources_str}.",
                f"Query executed in {result.duration_ms}ms with strict read-only assurance."
            ]
            if name_val and price_str:
                insights.insert(0, f"Lead record: {name_val} ({price_str})")

        provenance = {
            "sources": result.sources_involved,
            "filters_applied": [
                f"{f.field.qualified_name} {f.operator.value} {f.value}" for f in plan.filters
            ],
            "row_count": count,
            "duration_ms": result.duration_ms,
            "read_only": True,
        }

        return ResultExplanationResponse(
            summary=summary,
            key_insights=insights,
            provenance=provenance,
        )

    def explain(
        self,
        natural_query: str,
        plan: LogicalQueryPlan,
        result: ExecutionResult,
    ) -> ResultExplanationResponse:
        """Generate accessible explanation and provenance using LLM provider."""
        provenance = {
            "sources": result.sources_involved,
            "filters_applied": [
                f"{f.field.qualified_name} {f.operator.value} {f.value}" for f in plan.filters
            ],
            "row_count": result.row_count,
            "duration_ms": result.duration_ms,
            "read_only": True,
        }

        system_prompt = (
            "You are a friendly data analytics assistant explaining database results to a non-technical business user.\n"
            "Summarize the findings clearly without technical database jargon.\n"
            "Use only the rows provided. Do not invent numbers, totals, trends or causes.\n"
            "Only state a total when the prompt marks the result as complete; otherwise\n"
            "describe just the provided rows and say the result was truncated.\n"
            "Respond in JSON format with the following keys:\n"
            "{\n"
            '  "summary": "1-2 sentences summarizing the answer directly",\n'
            '  "key_insights": ["insight 1", "insight 2"]\n'
            "}\n"
        )

        rows_for_prompt = result.rows[:MAX_EXPLANATION_ROWS]
        is_complete = len(rows_for_prompt) == len(result.rows)
        user_content = (
            f"Query: {natural_query}\n"
            f"Sources: {', '.join(result.sources_involved)}\n"
            f"Row count: {result.row_count}\n"
            f"Rows included: {len(rows_for_prompt)} of {len(result.rows)}\n"
            f"Complete result: {'yes' if is_complete else 'no'}\n"
            f"Duration: {result.duration_ms}ms\n"
            f"Rows: {json.dumps(rows_for_prompt, default=str)}\n"
        )

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_content),
        ]

        if self.provider.__class__.__name__ == "MockLLMProvider" and not getattr(self.provider, "_custom_responses", None):
            return self._fallback_explanation(natural_query, plan, result)

        try:
            response = self.provider.generate(messages, temperature=0.1)
            text = response.content.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)

            data = json.loads(text)
            summary = data.get("summary")
            if not summary:
                return self._fallback_explanation(natural_query, plan, result)
            return ResultExplanationResponse(
                summary=summary,
                key_insights=data.get("key_insights", []),
                provenance=provenance,
            )
        except Exception:
            return self._fallback_explanation(natural_query, plan, result)
