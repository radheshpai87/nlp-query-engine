import json
import re
from typing import Any

from pydantic import BaseModel, Field

from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot
from app.nlp.domain_guard import DomainGuard
from app.nlp.providers.base import BaseLLMProvider, LLMMessage
from app.nlp.schema_context import format_schema_context_for_llm


class ExtractedFilter(BaseModel):
    column: str
    operator: str
    value: Any = None


class ExtractedSort(BaseModel):
    column: str
    direction: str = "DESC"  # ASC, DESC


class ExtractedIntent(BaseModel):
    """Structured semantic intent extracted from natural language database query."""

    domain: str = "general"
    target_entities: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    filters: list[ExtractedFilter] = Field(default_factory=list)
    group_by: list[str] = Field(default_factory=list)
    order_by: list[ExtractedSort] = Field(default_factory=list)
    ranking_limit: int | None = 20
    limit: int | None = 20
    time_range: dict[str, Any] | None = None
    is_ambiguous: bool = False
    ambiguity_reason: str | None = None

    def __init__(self, **data: Any) -> None:
        if "limit" in data and "ranking_limit" not in data:
            data["ranking_limit"] = data["limit"]
        elif "ranking_limit" in data and "limit" not in data:
            data["limit"] = data["ranking_limit"]
        if "sort" in data and "order_by" not in data:
            sort_val = data.pop("sort")
            if isinstance(sort_val, dict):
                data["order_by"] = [sort_val]
            elif isinstance(sort_val, list):
                data["order_by"] = sort_val
            elif isinstance(sort_val, ExtractedSort):
                data["order_by"] = [sort_val]
        super().__init__(**data)

    @property
    def sort(self) -> ExtractedSort | None:
        return self.order_by[0] if self.order_by else None


class IntentExtractor:
    """Extracts structured database query intent from natural language using LLM or rule fallback."""

    def __init__(self, provider: BaseLLMProvider) -> None:
        self.provider = provider

    def _rule_based_fallback(
        self,
        query: str,
        snapshots: dict[str, SchemaSnapshot] | list[SchemaSnapshot] | None = None,
    ) -> ExtractedIntent:
        """Deterministic heuristic fallback when LLM is unavailable or produces invalid JSON."""
        lower = query.lower()

        # Detect ranking limit
        limit = 20
        limit_match = re.search(r"\b(?:top|first|limit)\s+(\d+)\b", lower)
        if limit_match:
            limit = int(limit_match.group(1))
        elif re.search(r"\b(the\s+person|the\s+customer|the\s+user|who\s+has|who\s+gave|single|one)\b", lower) or re.search(r"\b(least|lowest|worst|highest|best|cheapest|most\s+expensive)\b", lower):
            limit = 1

        # Detect entities
        entities: list[str] = []
        snap_list: list[SchemaSnapshot] = []
        if isinstance(snapshots, dict):
            snap_list = list(snapshots.values())
        elif isinstance(snapshots, list):
            snap_list = snapshots

        # Match tables from snapshots if available
        known_tables: set[str] = set()
        known_columns: set[str] = set()
        for snap in snap_list:
            for obj in snap.objects:
                known_tables.add(obj.name.lower())
                for f in obj.fields:
                    known_columns.add(f.name.lower())

        for tbl in known_tables:
            if (
                tbl in lower
                or (tbl.endswith("s") and tbl[:-1] in lower)
                or (tbl.endswith("es") and tbl[:-2] in lower)
                or f"{tbl}s" in lower
            ):
                if tbl not in entities:
                    entities.append(tbl)

        common_entities = [
            "products",
            "orders",
            "customers",
            "users",
            "items",
            "logs",
            "transactions",
            "reviews",
            "catalog",
        ]
        for word in common_entities:
            if word in lower and word not in entities:
                entities.append(word)

        # Detect metrics
        metrics: list[str] = []
        common_metrics = ["revenue", "sales", "total", "amount", "price", "count", "total_spend", "rating"]
        for metric in common_metrics:
            if metric in lower:
                metrics.append(metric)
        for col in known_columns:
            if col in lower and col not in metrics and col not in entities:
                metrics.append(col)

        # Detect sorting
        order_by: list[ExtractedSort] = []
        if any(k in lower for k in ("top", "highest", "most", "best", "max", "maximum", "greatest")):
            if "rating" in lower or "rating" in metrics:
                target_sort_col = "rating"
            elif metrics:
                target_sort_col = metrics[0]
            else:
                target_sort_col = "price" if any(c in known_columns for c in ("price", "unit_price")) else "id"
            order_by.append(ExtractedSort(column=target_sort_col, direction="DESC"))
        elif any(k in lower for k in ("lowest", "least", "worst", "min", "minimum", "cheapest", "bottom")):
            if "rating" in lower or "rating" in metrics:
                target_sort_col = "rating"
            elif metrics:
                target_sort_col = metrics[0]
            else:
                target_sort_col = "price" if any(c in known_columns for c in ("price", "unit_price")) else "id"
            order_by.append(ExtractedSort(column=target_sort_col, direction="ASC"))

        # Detect filters across comparison operators and natural language patterns
        filters: list[ExtractedFilter] = []
        seen_filter_cols: set[str] = set()

        # 1. Symbol comparisons: col >= val, col < val, col = val
        for op_sym, op_enum in [(">=", "GTE"), ("<=", "LTE"), ("!=", "NEQ"), (">", "GT"), ("<", "LT"), ("=", "EQ")]:
            escaped_op = re.escape(op_sym)
            for m in re.finditer(rf"(\w+)\s*{escaped_op}\s*([0-9.]+|'[^']+'|\"[^\"]+\")", query):
                col_name = m.group(1).lower()
                val_raw = m.group(2).strip("'\"")
                val = float(val_raw) if val_raw.replace(".", "", 1).isdigit() else val_raw
                if col_name not in seen_filter_cols:
                    filters.append(ExtractedFilter(column=col_name, operator=op_enum, value=val))
                    seen_filter_cols.add(col_name)

        # 2. Natural language comparisons: col greater than val, col under val
        for m in re.finditer(r"(\w+)\s+(?:greater than|more than|over|above|higher than)\s+([0-9.]+)", lower):
            col_name = m.group(1).lower()
            val = float(m.group(2)) if "." in m.group(2) else int(m.group(2))
            if col_name not in seen_filter_cols:
                filters.append(ExtractedFilter(column=col_name, operator="GT", value=val))
                seen_filter_cols.add(col_name)

        for m in re.finditer(r"(\w+)\s+(?:less than|under|below|cheaper than|lower than)\s+([0-9.]+)", lower):
            col_name = m.group(1).lower()
            val = float(m.group(2)) if "." in m.group(2) else int(m.group(2))
            if col_name not in seen_filter_cols:
                filters.append(ExtractedFilter(column=col_name, operator="LT", value=val))
                seen_filter_cols.add(col_name)

        # 3. Contextual numeric phrases: cheaper than 30, under 50
        cheaper_match = re.search(r"\b(?:cheaper than|under|less than|below)\s+([0-9.]+)\b", lower)
        if cheaper_match and "price" not in seen_filter_cols and "total_amount" not in seen_filter_cols:
            val = float(cheaper_match.group(1)) if "." in cheaper_match.group(1) else int(cheaper_match.group(1))
            target_num_col = next((c for c in ("price", "unit_price", "total_amount") if c in known_columns), "price")
            filters.append(ExtractedFilter(column=target_num_col, operator="LT", value=val))
            seen_filter_cols.add(target_num_col)

        greater_match = re.search(r"\b(?:greater than|above|more than|over|higher than)\s+([0-9.]+)\b", lower)
        if greater_match:
            val = float(greater_match.group(1)) if "." in greater_match.group(1) else int(greater_match.group(1))
            cand_col = "rating" if "rating" in lower or "rating" in known_columns else (metrics[0] if metrics else "total_amount")
            if cand_col not in seen_filter_cols:
                filters.append(ExtractedFilter(column=cand_col, operator="GT", value=val))
                seen_filter_cols.add(cand_col)

        # 4. Equality filters: status = completed, name is 'Alice'
        for eq_match in re.finditer(
            r"(\w+)\s*(?:=|is)\s*['\"]?([\w\s-]+)['\"]?", query, re.IGNORECASE
        ):
            col_name = eq_match.group(1).lower()
            val = eq_match.group(2).strip()
            if col_name not in ("where", "and", "or", "in", "with") and col_name not in seen_filter_cols:
                filters.append(ExtractedFilter(column=col_name, operator="EQ", value=val))
                seen_filter_cols.add(col_name)

        return ExtractedIntent(
            domain="database",
            target_entities=entities or ["primary_source"],
            metrics=metrics,
            filters=filters,
            group_by=[],
            order_by=order_by,
            ranking_limit=limit,
            limit=limit,
            time_range=None,
            is_ambiguous=False,
            ambiguity_reason=None,
        )

    def extract(
        self,
        query: str,
        schema_context: str | None = None,
        snapshots: dict[str, SchemaSnapshot] | list[SchemaSnapshot] | None = None,
        connections: dict[str, DatabaseConnection] | list[DatabaseConnection] | None = None,
    ) -> ExtractedIntent:
        """Extract structured intent using LLM provider with fallback."""
        snap_dict = (
            snapshots
            if isinstance(snapshots, dict)
            else ({s.connection_id: s for s in snapshots} if snapshots else None)
        )
        conn_dict = (
            connections
            if isinstance(connections, dict)
            else ({c.id: c for c in connections} if connections else None)
        )
        guard_res = DomainGuard.check_query(query, conn_dict, snap_dict)
        if not guard_res.is_allowed:
            return self._rule_based_fallback(query, snapshots)

        effective_context = schema_context
        if not effective_context:
            effective_context = format_schema_context_for_llm(
                snapshots=snapshots,
                connections=connections,
            )

        system_prompt = (
            "You are a principal database systems NLP engineer.\n"
            "Your task is to analyze a natural language database query against the provided schema context "
            "and extract a structured query intent as a strictly valid JSON object.\n"
            "Do NOT hallucinate tables or columns not present in the schemas.\n"
            "JSON schema to return:\n"
            "{\n"
            '  "domain": "string",\n'
            '  "target_entities": ["table_or_collection_name"],\n'
            '  "metrics": ["column_name"],\n'
            '  "filters": [{"column": "col_name", "operator": "eq|gt|gte|lt|lte|in|contains", "value": val}],\n'
            '  "group_by": ["column_name"],\n'
            '  "order_by": [{"column": "col_name", "direction": "ASC|DESC"}],\n'
            '  "ranking_limit": 20,\n'
            '  "time_range": null,\n'
            '  "is_ambiguous": false,\n'
            '  "ambiguity_reason": null\n'
            "}\n"
            f"Database Schema Context:\n{effective_context}"
        )

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=f"Extract intent for query: {query}"),
        ]

        try:
            response = self.provider.generate(messages, temperature=0.0)
            text = response.content.strip()

            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)

            data = json.loads(text)

            # Normalize potential field synonyms from LLM output
            if "limit" in data and "ranking_limit" not in data:
                data["ranking_limit"] = data.pop("limit")
            if "sort" in data and "order_by" not in data:
                sort_val = data.pop("sort")
                if isinstance(sort_val, dict):
                    data["order_by"] = [sort_val]
                elif isinstance(sort_val, list):
                    data["order_by"] = sort_val

            extracted = ExtractedIntent.model_validate(data)

            # Ground target entities with attached schema snapshots
            snap_list: list[SchemaSnapshot] = []
            if isinstance(snapshots, dict):
                snap_list = list(snapshots.values())
            elif isinstance(snapshots, list):
                snap_list = snapshots

            if snap_list:
                known_tbls = {obj.name.lower(): obj.name for s in snap_list for obj in s.objects}
                lower_q = query.lower()
                for tbl_lower, real_name in known_tbls.items():
                    if (
                        tbl_lower in lower_q
                        or (tbl_lower.endswith("s") and tbl_lower[:-1] in lower_q)
                        or (tbl_lower.endswith("es") and tbl_lower[:-2] in lower_q)
                        or f"{tbl_lower}s" in lower_q
                    ):
                        if real_name not in extracted.target_entities and tbl_lower not in extracted.target_entities:
                            extracted.target_entities.insert(0, real_name)

            return extracted
        except Exception:
            return self._rule_based_fallback(query=query, snapshots=snapshots)
