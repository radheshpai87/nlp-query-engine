"""Dynamic Suggested Queries Generator based on connected database schemas and LLM synthesis."""

import json
import logging
from typing import Any

from app.models.schema import SchemaSnapshot
from app.nlp.providers.base import BaseLLMProvider, LLMMessage

logger = logging.getLogger(__name__)


class SuggestedQueriesGenerator:
    """Generates schema-aware suggested questions for conversational data exploration."""

    def __init__(self, provider: BaseLLMProvider | None = None) -> None:
        self.provider = provider

    def generate(self, snapshots: dict[str, SchemaSnapshot] | list[SchemaSnapshot]) -> list[str]:
        """Generate 4-5 relevant natural language questions tailored to active schemas."""
        snapshot_list = list(snapshots.values()) if isinstance(snapshots, dict) else snapshots

        # Gather table / collection / index summaries
        tables_summary: list[dict[str, Any]] = []
        all_table_names: list[str] = []

        for snap in snapshot_list:
            for obj in snap.objects:
                all_table_names.append(obj.name.lower())
                fields = [f.name for f in obj.fields[:8]]  # first 8 fields
                tables_summary.append({
                    "name": obj.name,
                    "type": obj.object_type,
                    "sample_fields": fields,
                })

        if not tables_summary:
            return [
                "Connect a database in Connections to start exploring data",
                "How does read-only schema validation work?",
                "What database types does Nexus support?",
            ]

        # Attempt LLM generation if provider exists
        if self.provider:
            try:
                system_prompt = (
                    "You are an expert data analyst. Generate 4 concise, high-value natural language queries "
                    "a business user would ask to explore their data based on the provided schemas. "
                    "Mix aggregation, filtering, and listing queries. Return strictly a JSON array of strings."
                )
                user_prompt = f"Available database schema objects:\n{json.dumps(tables_summary, indent=2)}\n\nGenerate 4 analytical queries:"
                messages = [
                    LLMMessage(role="system", content=system_prompt),
                    LLMMessage(role="user", content=user_prompt),
                ]
                response = self.provider.generate(messages=messages, temperature=0.3)
                
                # Extract JSON array
                raw_text = response.content.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:].strip()
                
                parsed = json.loads(raw_text)
                if isinstance(parsed, list) and len(parsed) >= 2 and all(isinstance(x, str) for x in parsed):
                    return [str(q).strip() for q in parsed[:5]]
            except Exception as e:
                logger.debug("LLM suggested query generation fallback triggered: %s", e)

        # Smart Heuristic Generation based on active tables
        return self._heuristic_generation(all_table_names, tables_summary)

    def _heuristic_generation(self, table_names: list[str], summaries: list[dict[str, Any]]) -> list[str]:
        suggestions: list[str] = []

        # PostgreSQL / Relational patterns
        if "products" in table_names and "orders" in table_names:
            suggestions.append("Show me top 5 products by revenue this month")
        elif "products" in table_names:
            suggestions.append("Show top 5 products ordered by price")

        if "customers" in table_names and "orders" in table_names:
            suggestions.append("Which customers have completed orders?")
        elif "customers" in table_names:
            suggestions.append("List active customers with their country")

        if "orders" in table_names:
            suggestions.append("Show completed orders with total amount over 100")

        # MongoDB / Document patterns
        if "reviews" in table_names:
            suggestions.append("Find reviews with rating greater than 4")
        if "events" in table_names or "user_events" in table_names:
            suggestions.append("Show recent analytics events")

        # Elasticsearch / Search patterns
        if "catalog" in table_names:
            suggestions.append("Search catalog items with category Audio")
        if "access_logs" in table_names or "logs" in table_names:
            suggestions.append("Find access logs with status code 200")

        # Fallbacks if table names don't match standard demo names
        if len(suggestions) < 3:
            for summary in summaries:
                name = summary["name"]
                fields = summary.get("sample_fields", [])
                if name.lower() not in ["orders", "products", "customers", "reviews", "catalog"]:
                    if fields:
                        suggestions.append(f"List all {name} with {fields[0]}")
                    else:
                        suggestions.append(f"Show total count of {name}")
                if len(suggestions) >= 4:
                    break

        return suggestions[:4] if suggestions else ["Show all tables in this workspace"]
