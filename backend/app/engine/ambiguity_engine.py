import re
from typing import Any

from app.models.ambiguity import (
    AmbiguityEvaluationResult,
    AmbiguityType,
    ClarificationOption,
    ClarificationResolutionResponse,
    PendingClarification,
)
from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot


class AmbiguityEngine:
    """Evaluates natural language queries for ambiguities and manages clarification workflows."""

    def evaluate_query(
        self,
        query: str,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
        resolved_context: dict[str, Any] | None = None,
    ) -> AmbiguityEvaluationResult:
        clean_query = query.strip()
        lower_query = clean_query.lower()
        context = resolved_context or {}

        clarifications: list[PendingClarification] = []

        # 1. Evaluate Vague Value Predicates (e.g., "high-value", "expensive", "cheap")
        if "high_value_threshold" not in context:
            high_val_match = re.search(
                r"\b(high[- ]?value|expensive|top spenders?|vip)\b", lower_query
            )
            if high_val_match:
                clarifications.append(
                    PendingClarification(
                        ambiguity_type=AmbiguityType.VAGUE_PREDICATE,
                        parameter_name="high_value_threshold",
                        question="What purchase amount should count as high-value?",
                        options=[
                            ClarificationOption(
                                label="> $1,000 (standard threshold)",
                                value=1000,
                                is_recommended=True,
                                description="Filters orders/transactions exceeding $1,000",
                            ),
                            ClarificationOption(
                                label="> $500 (moderate threshold)",
                                value=500,
                                description="Filters orders/transactions exceeding $500",
                            ),
                            ClarificationOption(
                                label="> $2,500 (VIP / Enterprise)",
                                value=2500,
                                description="Filters high-tier VIP accounts",
                            ),
                            ClarificationOption(
                                label="Top 10% highest spenders",
                                value="top_10_percent",
                                description="Ranks customers by cumulative spend and takes top decile",
                            ),
                        ],
                        default_value=1000,
                        explanation="The term 'high-value' is relative and requires an explicit financial boundary.",
                    )
                )

        if "cheap_price_threshold" not in context:
            cheap_match = re.search(r"\b(cheap|low[- ]?cost|inexpensive|budget)\b", lower_query)
            if cheap_match:
                clarifications.append(
                    PendingClarification(
                        ambiguity_type=AmbiguityType.VAGUE_PREDICATE,
                        parameter_name="cheap_price_threshold",
                        question="What price ceiling should count as cheap / budget?",
                        options=[
                            ClarificationOption(
                                label="< $25 (standard budget)",
                                value=25,
                                is_recommended=True,
                                description="Items priced strictly under $25",
                            ),
                            ClarificationOption(
                                label="< $50 (mid-tier value)",
                                value=50,
                                description="Items priced strictly under $50",
                            ),
                            ClarificationOption(
                                label="< $10 (economy / clearance)",
                                value=10,
                                description="Low price clearance items",
                            ),
                        ],
                        default_value=25,
                        explanation="The term 'cheap' requires a quantitative price ceiling.",
                    )
                )

        # 2. Evaluate Temporal Ambiguity (e.g., "recently", "recent", "lately")
        if "time_window" not in context:
            # Check if query says "recently" without explicit day counts like "last 7 days"
            has_explicit_days = re.search(
                r"\b(last|past)\s+(\d+)\s+(days?|weeks?|months?|years?)\b", lower_query
            )
            has_recently = re.search(r"\b(recently|recent|lately)\b", lower_query)

            if has_recently and not has_explicit_days:
                clarifications.append(
                    PendingClarification(
                        ambiguity_type=AmbiguityType.MISSING_TIME_WINDOW,
                        parameter_name="time_window",
                        question="What time period should I use for 'recently'?",
                        options=[
                            ClarificationOption(
                                label="Last 30 days (default)",
                                value="30d",
                                is_recommended=True,
                                description="Past 30 calendar days from today",
                            ),
                            ClarificationOption(
                                label="Last 7 days (past week)",
                                value="7d",
                                description="Past 7 days",
                            ),
                            ClarificationOption(
                                label="Last 90 days (past quarter)",
                                value="90d",
                                description="Past quarter",
                            ),
                            ClarificationOption(
                                label="Year to date (YTD)",
                                value="ytd",
                                description="From January 1st of current year to present",
                            ),
                        ],
                        default_value="30d",
                        explanation="'Recently' is relative; specifying a time window prevents unexpected results.",
                    )
                )

        # 3. Evaluate Metric Ambiguity (e.g. "revenue" vs "sales" when multiple candidates exist)
        if "revenue_definition" not in context:
            if re.search(r"\b(revenue|turnover)\b", lower_query):
                # Inspect schemas to see if multiple candidate fields exist (e.g., gross vs net or paid status)
                has_multiple_revenue_fields = self._check_multiple_revenue_fields(snapshots)
                if has_multiple_revenue_fields:
                    clarifications.append(
                        PendingClarification(
                            ambiguity_type=AmbiguityType.AMBIGUOUS_METRIC,
                            parameter_name="revenue_definition",
                            question="How should 'revenue' be calculated?",
                            options=[
                                ClarificationOption(
                                    label="Gross Total (total order amount)",
                                    value="gross",
                                    is_recommended=True,
                                    description="Sum of all transaction totals before discounts",
                                ),
                                ClarificationOption(
                                    label="Net Total (after discounts and refunds)",
                                    value="net",
                                    description="Deducts discounts, promo credits, and refund items",
                                ),
                                ClarificationOption(
                                    label="Paid & Completed Orders Only",
                                    value="paid_only",
                                    description="Excludes pending, cancelled, or failed transactions",
                                ),
                            ],
                            default_value="gross",
                            explanation="Multiple fields and transaction statuses relate to revenue.",
                        )
                    )

        # 4. Evaluate Multiple Sources Ambiguity
        if "target_source" not in context:
            source_candidates = self._find_matching_sources(lower_query, connections, snapshots)
            if len(source_candidates) > 1:
                options = [
                    ClarificationOption(
                        label=f"{sc['connection_name']} ({sc['table_name']})",
                        value=f"{sc['connection_id']}::{sc['table_name']}",
                        is_recommended=(idx == 0),
                        description=f"{sc['db_type']} • ~{sc['row_count'] or 0} records",
                    )
                    for idx, sc in enumerate(source_candidates)
                ]
                options.append(
                    ClarificationOption(
                        label="Federate & Compare across both sources",
                        value="all_sources",
                        description="Query both databases and compare or combine results",
                    )
                )

                clarifications.append(
                    PendingClarification(
                        ambiguity_type=AmbiguityType.MULTIPLE_SOURCES,
                        parameter_name="target_source",
                        question=f"Found '{source_candidates[0]['entity_keyword']}' in multiple databases. Which source should I query?",
                        options=options,
                        default_value=options[0].value,
                        explanation="Multiple connected databases have relevant data for this entity.",
                    )
                )

        is_ambiguous = len(clarifications) > 0
        suggested_action = "request_clarification" if is_ambiguous else "proceed_to_plan"

        return AmbiguityEvaluationResult(
            is_ambiguous=is_ambiguous,
            confidence=0.95 if not is_ambiguous else 0.65,
            clarifications=clarifications,
            inferred_intent={"raw_query": clean_query, **context},
            suggested_action=suggested_action,
        )

    def resolve_clarification(
        self,
        clarification: PendingClarification,
        selected_value: Any,
        custom_input: str | None = None,
        remaining_clarifications: list[PendingClarification] | None = None,
    ) -> ClarificationResolutionResponse:
        """Resolve a pending clarification and produce the resolved parameter state."""
        final_val = (
            custom_input if custom_input is not None and custom_input != "" else selected_value
        )
        if final_val is None:
            final_val = clarification.default_value

        clarification.resolved = True
        clarification.user_response = final_val

        unresolved = [c for c in (remaining_clarifications or []) if not c.resolved]

        return ClarificationResolutionResponse(
            resolved=True,
            clarification_id=clarification.id,
            parameter_name=clarification.parameter_name,
            resolved_value=final_val,
            remaining_clarifications=unresolved,
            ready_to_execute=len(unresolved) == 0,
        )

    def _check_multiple_revenue_fields(self, snapshots: dict[str, SchemaSnapshot]) -> bool:
        """Check if any snapshot has multiple revenue-related fields or status columns."""
        for snap in snapshots.values():
            for obj in snap.objects:
                field_names = {f.name.lower() for f in obj.fields}
                rev_fields = field_names.intersection(
                    {
                        "total",
                        "total_amount",
                        "amount",
                        "revenue",
                        "gross_amount",
                        "net_amount",
                        "subtotal",
                        "price",
                    }
                )
                if len(rev_fields) >= 2 or ("status" in field_names and len(rev_fields) >= 1):
                    return True
        return False

    def _find_matching_sources(
        self,
        lower_query: str,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
    ) -> list[dict[str, Any]]:
        """Identify if entities mentioned in query exist in multiple database connections."""
        discovered_entities: set[str] = set()
        for snap in snapshots.values():
            for obj in snap.objects:
                clean_name = obj.name.lower()
                discovered_entities.add(clean_name)
                if clean_name.endswith("es") and len(clean_name) > 4:
                    discovered_entities.add(clean_name[:-2])
                elif clean_name.endswith("s") and len(clean_name) > 3:
                    discovered_entities.add(clean_name[:-1])

        common_entities = ["customer", "order", "user", "product", "event", "log", "transaction"]
        target_entities = list(discovered_entities.union(common_entities))
        matching_candidates: list[dict[str, Any]] = []

        for entity in target_entities:
            if entity in lower_query:
                # Find all tables matching this entity across snapshots
                matches = []
                for conn_id, snap in snapshots.items():
                    conn = connections.get(conn_id)
                    conn_name = conn.name if conn else conn_id
                    db_type = str(conn.db_type) if conn else "database"

                    for obj in snap.objects:
                        obj_name = obj.name.lower()
                        if entity in obj_name:
                            matches.append(
                                {
                                    "connection_id": conn_id,
                                    "connection_name": conn_name,
                                    "db_type": db_type,
                                    "table_name": obj.name,
                                    "row_count": obj.row_count_estimate,
                                    "entity_keyword": entity,
                                }
                            )

                # If entity is matched in more than 1 distinct connection
                distinct_conns = {m["connection_id"] for m in matches}
                if len(distinct_conns) > 1:
                    return matches

        return matching_candidates
