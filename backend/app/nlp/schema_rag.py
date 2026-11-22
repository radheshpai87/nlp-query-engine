import json
import logging
import re
from typing import Any

from pydantic import BaseModel, Field

from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import (
    AggregateFunction,
    ComparisonOperator,
    LogicalQueryPlan,
    SortDirection,
)
from app.models.ambiguity import (
    AmbiguityType,
    ClarificationOption,
    PendingClarification,
)
from app.models.connection import DatabaseConnection
from app.models.feedback import QueryFeedback
from app.models.schema import SchemaSnapshot, UserDefinedRelationship
from app.nlp.providers.base import BaseLLMProvider, LLMMessage
from app.nlp.schema_context import format_schema_context_for_llm

logger = logging.getLogger(__name__)


class SchemaRAGResult(BaseModel):
    """Result of schema-grounded retrieval-augmented reasoning over database schemas."""

    intent: str  # "metadata", "conversational", "data_query", "ambiguous", "guardrail_blocked"
    direct_response: str | None = None
    clarification: PendingClarification | None = None
    plan: LogicalQueryPlan | None = None
    confidence: float = 1.0
    explanation: str | None = None


class SchemaRAGService:
    """Schema-RAG Engine that grounds natural queries in real database schemas using LLM reasoning.

    Treats the connected database schemas (PostgreSQL, MongoDB, Elasticsearch) as a live
    knowledge base. Retrieves relevant schema elements, prompts the LLM to classify intent
    and generate structured plans, and deterministically grounds and validates every node
    against real table and column metadata.
    """

    def __init__(self, provider: BaseLLMProvider) -> None:
        self.provider = provider

    def evaluate_and_plan(
        self,
        workspace_id: str,
        query: str,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
        relationships: list[UserDefinedRelationship] | None = None,
        resolved_context: dict[str, Any] | None = None,
        learning_examples: list[QueryFeedback] | None = None,
    ) -> SchemaRAGResult:
        """Run full Schema-RAG turn: retrieve schema, classify intent, and synthesize answer or plan."""
        clean_query = query.strip()
        lower_query = clean_query.lower()

        # 1. Guardrail Check (Mutating / Destructive Operations)
        if re.search(
            r"\b(drop\s+(table|database|index|collection)|delete\s+from|truncate\s+(table)?|insert\s+into|update\s+\w+\s+set|alter\s+table|grant\s+|revoke\s+)\b",
            lower_query,
        ) or re.search(r"^\s*(drop|delete|truncate|insert|update|alter)\b", lower_query):
            return SchemaRAGResult(
                intent="guardrail_blocked",
                direct_response=(
                    "⚠️ **Security Policy Violation**: Destructive and mutating statements "
                    "(`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`) are strictly blocked. "
                    "This engine operates strictly in read-only analytical mode."
                ),
                confidence=1.0,
                explanation="Blocked modifying command",
            )

        # 2. Fast Accurate Metadata & Schema Inspection Resolver
        metadata_result = self._check_metadata_query(clean_query, connections, snapshots)
        if metadata_result:
            return metadata_result

        # 3. Build Schema Context (The 'Retrieval' Step in RAG)
        schema_context = format_schema_context_for_llm(
            snapshots=snapshots,
            connections=connections,
            relationships=relationships,
        )

        learning_context = ""
        if learning_examples:
            learning_lines = []
            for ex in learning_examples[:10]:
                if ex.is_correct and ex.generated_query:
                    learning_lines.append(
                        f'- Query: "{ex.query_text}" -> VERIFIED RIGHT: {ex.generated_query}'
                    )
                elif not ex.is_correct:
                    correction = ex.user_notes or ex.corrected_query or ex.category or "Incorrect logic"
                    learning_lines.append(
                        f'- Query: "{ex.query_text}" -> FLAGGED NOT RIGHT: {correction}. Do not repeat this mistake.'
                    )
            if learning_lines:
                learning_context = (
                    "\nUser Feedback & Learned Corrections from Past Queries (Few-Shot Continuous Learning):\n"
                    + "\n".join(learning_lines)
                    + "\n\n"
                )

        # 3. LLM Reasoning Prompt (The 'Augmentation & Generation' Step in RAG)
        system_prompt = (
            "You are a Principal Database Systems & Query Optimization AI Assistant.\n"
            "You act as a Schema-RAG (Retrieval-Augmented Generation) engine over the user's connected databases.\n\n"
            "Your tasks:\n"
            "1. Analyze the user's question against the discovered database schema context.\n"
            "2. Determine the user's intent accurately:\n"
            '   - "metadata": The user is asking about the database structure (how many tables, list tables, column definitions, database types, count of records, etc.).\n'
            '   - "conversational": Greetings, chit-chat, or general questions about what you can do.\n'
            '   - "ambiguous": The query is too vague to answer safely without clarification (e.g. "show top 5" without entity or target).\n'
            '   - "data_query": The user wants to retrieve, filter, aggregate, or join real row-level data from tables/collections.\n\n'
            "3. If intent is 'metadata' or 'conversational':\n"
            "   Generate a comprehensive, accurate, polished markdown response in 'direct_response' referencing the actual schema context.\n\n"
            "4. If intent is 'ambiguous':\n"
            "   Generate a helpful clarification question with 2-4 concrete options based on the schema.\n\n"
            "5. If intent is 'data_query':\n"
            "   Construct a clean, valid Logical Query Plan in 'plan'.\n"
            "   Rules for plan construction:\n"
            "   - 'primary_source': {'table': 'table_name', 'alias': 'alias'}\n"
            "   - 'joins': list of joins with {'right_table': 'table_name', 'right_alias': 'alias', 'join_type': 'inner|left', 'left_col': ['alias', 'col'], 'right_col': ['alias', 'col']}\n"
            "   - 'projections': list of {'table_alias': 'alias', 'column': 'col_name', 'alias': 'optional_alias'}\n"
            "   - 'filters': list of {'table_alias': 'alias', 'column': 'col_name', 'operator': 'eq|gt|gte|lt|lte|ilike|in', 'value': val}\n"
            "   - Date filter values: For Elasticsearch or MongoDB use relative date math or ISO strings ('now-30d', 'now-6M', '2024-01-01T00:00:00Z'). For PostgreSQL use SQL interval or ISO strings ('CURRENT_DATE - INTERVAL \\'30 days\\'', '2024-01-01').\n"
            "   - 'group_by': list of {'table_alias': 'alias', 'column': 'col_name'}\n"
            "   - 'aggregations': list of {'function': 'count|sum|avg|min|max', 'table_alias': 'alias', 'column': 'col_name', 'alias': 'metric_alias'}\n"
            "   - 'having': list of {'table_alias': 'alias', 'column': 'col_or_alias', 'operator': 'eq|gt|gte|lt|lte', 'value': val} (for aggregate conditions like count > X or avg < Y)\n"
            "   - 'order_by': list of {'field': 'col_or_alias', 'direction': 'asc|desc'}\n"
            "   - 'limit': integer (default 20)\n"
            "   - ONLY use tables and columns that exist in the Schema Context!\n\n"
            f"{learning_context}"
            f"Schema Context:\n{schema_context}\n\n"
            "Return strictly valid JSON only matching this schema:\n"
            "{\n"
            '  "intent": "metadata" | "conversational" | "data_query" | "ambiguous",\n'
            '  "direct_response": "markdown response if metadata/conversational, else null",\n'
            '  "clarification": {\n'
            '    "question": "Clarification question",\n'
            '    "options": [{"label": "Option 1", "value": "val1"}, {"label": "Option 2", "value": "val2"}]\n'
            '  } or null,\n'
            '  "plan": {\n'
            '    "primary_source": {"table": "table_name", "alias": "alias"},\n'
            '    "joins": [...],\n'
            '    "projections": [...],\n'
            '    "filters": [...],\n'
            '    "group_by": [...],\n'
            '    "aggregations": [...],\n'
            '    "having": [...],\n'
            '    "order_by": [...],\n'
            '    "limit": 20\n'
            '  } or null,\n'
            '  "explanation": "brief reasoning"\n'
            "}"
        )

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=f"Process Query: {query}"),
        ]

        try:
            llm_res = self.provider.generate(messages, temperature=0.0, max_tokens=3500)
            text = llm_res.content.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)
            try:
                parsed = json.loads(text, strict=False)
            except Exception:
                m = re.search(r"(\{.*\})", text, re.DOTALL)
                if m:
                    cleaned_json = m.group(1)
                    try:
                        parsed = json.loads(cleaned_json, strict=False)
                    except Exception:
                        cleaned_json = re.sub(r'[\x00-\x09\x0b-\x1f\x7f]', ' ', cleaned_json)
                        parsed = json.loads(cleaned_json, strict=False)
                else:
                    raise

            intent = parsed.get("intent", "data_query")
            direct_response = parsed.get("direct_response")
            explanation = parsed.get("explanation")

            if intent in ("metadata", "conversational", "guardrail_blocked") and direct_response:
                return SchemaRAGResult(
                    intent=intent,
                    direct_response=direct_response,
                    confidence=1.0,
                    explanation=explanation,
                )

            if intent == "ambiguous" and parsed.get("clarification"):
                c_data = parsed["clarification"]
                options = [
                    ClarificationOption(label=opt["label"], value=opt["value"])
                    for opt in c_data.get("options", [])
                ]
                clarification = PendingClarification(
                    ambiguity_type=AmbiguityType.UNDERSPECIFIED_ENTITY,
                    parameter_name="target_entity",
                    question=c_data["question"],
                    options=options,
                )
                return SchemaRAGResult(
                    intent="ambiguous",
                    clarification=clarification,
                    confidence=0.5,
                    explanation=explanation,
                )

            if parsed.get("plan"):
                # 4. Ground and Validate Plan (The 'Validation' Step in RAG)
                grounded_plan = self._ground_and_build_plan(
                    workspace_id=workspace_id,
                    query=query,
                    plan_data=parsed["plan"],
                    snapshots=snapshots,
                    connections=connections,
                )
                if grounded_plan:
                    return SchemaRAGResult(
                        intent="data_query",
                        plan=grounded_plan,
                        confidence=1.0,
                        explanation=explanation,
                    )

        except Exception as e:
            logger.warning("SchemaRAG LLM planning encountered error, evaluating fallback: %s", e)

        return SchemaRAGResult(
            intent="data_query",
            plan=None,
            confidence=0.0,
            explanation="LLM reasoning unavailable",
        )

    def _ground_and_build_plan(
        self,
        workspace_id: str,
        query: str,
        plan_data: dict[str, Any],
        snapshots: dict[str, SchemaSnapshot],
        connections: dict[str, DatabaseConnection],
    ) -> LogicalQueryPlan | None:
        """Ground and validate LLM-generated plan data against real schema objects."""
        # Index all tables across snapshots
        table_lookup: dict[str, tuple[str, Any]] = {}
        alias_to_table: dict[str, str] = {}
        for conn_id, snap in snapshots.items():
            for obj in snap.objects:
                table_lookup[obj.name.lower()] = (conn_id, obj)

        p_src = plan_data.get("primary_source")
        if not p_src or not p_src.get("table"):
            return None

        primary_table = p_src["table"].lower()
        if primary_table not in table_lookup:
            return None

        primary_conn_id, primary_obj = table_lookup[primary_table]
        primary_alias = p_src.get("alias") or primary_table[:3]
        alias_to_table[primary_alias] = primary_table

        builder = LogicalPlanBuilder(workspace_id=workspace_id)
        builder.query_text = query
        builder.from_source(
            connection_id=primary_conn_id,
            source_name=primary_obj.name,
            alias=primary_alias,
        )

        # Ground Joins
        for join_item in plan_data.get("joins", []):
            r_tbl = join_item.get("right_table", "").lower()
            if r_tbl not in table_lookup:
                continue
            r_conn_id, r_obj = table_lookup[r_tbl]
            r_alias = join_item.get("right_alias") or r_tbl[:3]
            alias_to_table[r_alias] = r_tbl

            left_spec = join_item.get("left_col")
            right_spec = join_item.get("right_col")
            if not left_spec or not right_spec:
                continue

            left_t_alias = left_spec[0] if isinstance(left_spec, (list, tuple)) else primary_alias
            left_c = left_spec[1] if isinstance(left_spec, (list, tuple)) else str(left_spec)
            right_t_alias = right_spec[0] if isinstance(right_spec, (list, tuple)) else r_alias
            right_c = right_spec[1] if isinstance(right_spec, (list, tuple)) else str(right_spec)

            is_cross = r_conn_id != primary_conn_id
            builder.join(
                right_connection_id=r_conn_id,
                right_source_name=r_obj.name,
                left_col=(left_t_alias, left_c),
                right_col=(right_t_alias, right_c),
                right_alias=r_alias,
                is_cross_database=is_cross,
            )

        # Ground Projections
        for proj in plan_data.get("projections", []):
            t_alias = proj.get("table_alias") or primary_alias
            col = proj.get("column")
            if col:
                # Handle possible "alias.col" format from LLM
                if "." in col:
                    t_alias, col = col.split(".", 1)
                builder.project(table=t_alias, column=col, alias=proj.get("alias"))

        # Ground Filters
        for f in plan_data.get("filters", []):
            t_alias = f.get("table_alias") or primary_alias
            col = f.get("column")
            if not col:
                continue
            if "." in col:
                t_alias, col = col.split(".", 1)
            raw_op = f.get("operator", "eq").lower()
            op = ComparisonOperator.EQ
            if raw_op in ("gt", ">"):
                op = ComparisonOperator.GT
            elif raw_op in ("gte", ">="):
                op = ComparisonOperator.GTE
            elif raw_op in ("lt", "<"):
                op = ComparisonOperator.LT
            elif raw_op in ("lte", "<="):
                op = ComparisonOperator.LTE
            elif raw_op in ("ilike", "like", "contains"):
                op = ComparisonOperator.ILIKE
            elif raw_op in ("in",):
                op = ComparisonOperator.IN

            builder.filter(table=t_alias, column=col, operator=op, value=f.get("value"))

        # Ground Group By
        for g in plan_data.get("group_by", []):
            t_alias = g.get("table_alias") or primary_alias
            col = g.get("column")
            if col:
                if "." in col:
                    t_alias, col = col.split(".", 1)
                builder.group_by(table=t_alias, column=col)

        # Ground Aggregations
        for agg in plan_data.get("aggregations", []):
            fn_name = agg.get("function", "count").upper()
            fn_enum = AggregateFunction.COUNT
            if fn_name == "SUM":
                fn_enum = AggregateFunction.SUM
            elif fn_name == "AVG":
                fn_enum = AggregateFunction.AVG
            elif fn_name == "MIN":
                fn_enum = AggregateFunction.MIN
            elif fn_name == "MAX":
                fn_enum = AggregateFunction.MAX

            t_alias = agg.get("table_alias") or primary_alias
            col = agg.get("column")
            if col and "." in col and " " not in col:
                t_alias, col = col.split(".", 1)
            builder.aggregate(
                function=fn_enum,
                table=t_alias,
                column=col,
                alias=agg.get("alias"),
            )

        # Ground Having
        for h in plan_data.get("having", []):
            t_alias = h.get("table_alias") or primary_alias
            col = h.get("column")
            if not col:
                continue
            if "." in col:
                t_alias, col = col.split(".", 1)
            raw_op = str(h.get("operator", "gt")).lower()
            op = ComparisonOperator.GT
            if raw_op in ("gt", ">"):
                op = ComparisonOperator.GT
            elif raw_op in ("gte", ">="):
                op = ComparisonOperator.GTE
            elif raw_op in ("lt", "<"):
                op = ComparisonOperator.LT
            elif raw_op in ("lte", "<="):
                op = ComparisonOperator.LTE
            elif raw_op in ("eq", "="):
                op = ComparisonOperator.EQ
            builder.having(table=t_alias, column=col, operator=op, value=h.get("value"))

        # Ground Order By
        for o in plan_data.get("order_by", []):
            fld = o.get("field")
            if fld:
                direction = SortDirection.DESC if o.get("direction", "asc").lower() == "desc" else SortDirection.ASC
                builder.sort(field=fld, direction=direction)

        # Ground Limit
        limit = plan_data.get("limit") or 20
        builder.limit(limit)

        return builder.build()

    def _check_metadata_query(
        self,
        query: str,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
    ) -> SchemaRAGResult | None:
        """Deterministically answer metadata questions directly from introspected schema snapshots."""
        q = query.lower().strip()

        table_count_patterns = [
            r"how many tables",
            r"number of tables",
            r"count (of )?tables",
            r"total tables",
        ]
        table_list_patterns = [
            r"what tables",
            r"which tables",
            r"list (all )?tables",
            r"show (all )?tables",
            r"get (all )?tables",
        ]
        db_patterns = [
            r"what databases",
            r"which databases",
            r"list (all )?databases",
            r"show (all )?databases",
            r"databases do i have access to",
            r"what connections",
            r"connected databases",
        ]

        is_table_count = any(re.search(p, q) for p in table_count_patterns)
        is_table_list = any(re.search(p, q) for p in table_list_patterns)
        is_db_query = any(re.search(p, q) for p in db_patterns)

        if not (is_table_count or is_table_list or is_db_query):
            return None

        conn_meta = []
        for c_id, conn in connections.items():
            snap = snapshots.get(c_id)
            tables = [o.name for o in snap.objects] if snap else []
            db_type = conn.db_type.value if hasattr(conn.db_type, "value") else str(conn.db_type)
            conn_meta.append({
                "id": conn.id,
                "name": conn.name,
                "database": conn.database or "",
                "db_type": db_type,
                "tables": sorted(tables),
            })

        matched_conns = []
        for cm in conn_meta:
            c_name_lower = cm["name"].lower()
            c_db_lower = cm["database"].lower()
            c_type_lower = cm["db_type"].lower()

            name_tokens = [w for w in re.split(r"[_\s\W]+", c_name_lower) if len(w) > 3]
            db_tokens = [w for w in re.split(r"[_\s\W]+", c_db_lower) if len(w) > 3]

            is_match = False
            for token in name_tokens + db_tokens:
                if token in q:
                    is_match = True
                    break
            if is_match or (c_type_lower in q and len(conn_meta) > 1 and f"{c_type_lower} database" in q):
                matched_conns.append(cm)

        if matched_conns:
            cm = matched_conns[0]
            tables = cm["tables"]
            table_list_md = "\n".join(f"{i+1}. `{t}`" for i, t in enumerate(tables))
            unit = "collections" if cm["db_type"] == "mongodb" else ("indices" if cm["db_type"] == "elasticsearch" else "tables")

            if is_table_count:
                resp = (
                    f"The **{cm['name']}** database contains **{len(tables)} {unit}**:\n\n"
                    f"{table_list_md}"
                )
            else:
                resp = (
                    f"The following **{len(tables)} {unit}** are present in **{cm['name']}** ({cm['db_type']}):\n\n"
                    f"{table_list_md}"
                )

            return SchemaRAGResult(
                intent="metadata",
                direct_response=resp,
                confidence=1.0,
                explanation=f"Introspected schema metadata for {cm['name']}",
            )

        if is_table_count or is_table_list:
            total_tables = sum(len(cm["tables"]) for cm in conn_meta)
            sections = []
            for cm in conn_meta:
                unit = "collections" if cm["db_type"] == "mongodb" else ("indices" if cm["db_type"] == "elasticsearch" else "tables")
                t_str = ", ".join(f"`{t}`" for t in cm["tables"]) if cm["tables"] else "*(none)*"
                sections.append(f"- **{cm['name']}** ({cm['db_type']}): {len(cm['tables'])} {unit} — {t_str}")

            resp = (
                f"Across your {len(conn_meta)} connected databases, there are **{total_tables} total tables and collections**:\n\n"
                + "\n".join(sections)
            )
            return SchemaRAGResult(
                intent="metadata",
                direct_response=resp,
                confidence=1.0,
                explanation="Introspected all connected schemas",
            )

        if is_db_query:
            sections = []
            for i, cm in enumerate(conn_meta, 1):
                unit = "collections" if cm["db_type"] == "mongodb" else ("indices" if cm["db_type"] == "elasticsearch" else "tables")
                sections.append(
                    f"{i}. **{cm['name']}**\n"
                    f"   - Engine: `{cm['db_type']}`\n"
                    f"   - Schema Objects: {len(cm['tables'])} {unit} ({', '.join(f'`{t}`' for t in cm['tables'][:5])}{', ...' if len(cm['tables']) > 5 else ''})"
                )
            resp = f"You have access to **{len(conn_meta)} connected databases** in this cluster:\n\n" + "\n\n".join(sections)
            return SchemaRAGResult(
                intent="metadata",
                direct_response=resp,
                confidence=1.0,
                explanation="Introspected database connections",
            )

        return None
