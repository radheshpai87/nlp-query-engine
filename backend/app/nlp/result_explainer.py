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

        if count == 0:
            summary = f"No records matched your request '{natural_query}' across {sources_str}."
            insights = [
                "The query executed successfully, but current filter conditions yielded zero results."
            ]
        elif count == 1:
            first_row = result.rows[0]
            summary = f"Found 1 matching record for '{natural_query}' in {sources_str}."
            sample_items = [f"{k}: {v}" for k, v in list(first_row.items())[:3]]
            insights = [f"Result: {', '.join(sample_items)}"]
        else:
            summary = (
                f"Retrieved {count} records matching '{natural_query}' across {sources_str} "
                f"in {result.duration_ms}ms."
            )
            insights = [
                f"Displaying top {min(count, 10)} records in order.",
                f"Processed across {len(result.sources_involved)} source(s): {sources_str}.",
            ]

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
            "Respond in JSON format with the following keys:\n"
            "{\n"
            '  "summary": "1-2 sentences summarizing the answer directly",\n'
            '  "key_insights": ["insight 1", "insight 2"]\n'
            "}\n"
        )

        user_content = (
            f"Query: {natural_query}\n"
            f"Sources: {', '.join(result.sources_involved)}\n"
            f"Row count: {result.row_count}\n"
            f"Duration: {result.duration_ms}ms\n"
            f"Sample data: {json.dumps(result.rows[:3])}\n"
        )

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_content),
        ]

        try:
            response = self.provider.generate(messages, temperature=0.1)
            text = response.content.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)

            data = json.loads(text)
            return ResultExplanationResponse(
                summary=data.get("summary", ""),
                key_insights=data.get("key_insights", []),
                provenance=provenance,
            )
        except Exception:
            return self._fallback_explanation(natural_query, plan, result)
