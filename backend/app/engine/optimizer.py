import copy

from app.engine.ir.models import (
    ColumnRef,
    FilterPredicate,
    LogicalQueryPlan,
)


class LogicalPlanOptimizer:
    """Applies algebraic and schema-aware transformations to optimize LogicalQueryPlans."""

    def optimize(self, plan: LogicalQueryPlan) -> LogicalQueryPlan:
        optimized = copy.deepcopy(plan)

        self._annotate_cross_database_joins(optimized)
        self._deduplicate_filters(optimized)
        self._deduplicate_sorts(optimized)
        self._ensure_projections(optimized)
        self._enforce_group_by_projection_consistency(optimized)

        return optimized

    def _annotate_cross_database_joins(self, plan: LogicalQueryPlan) -> None:
        source_conns = {s.effective_alias: s.connection_id for s in plan.sources}
        for join in plan.joins:
            source_conns[join.right_source.effective_alias] = join.right_source.connection_id
            left_conn = source_conns.get(join.left_source)
            right_conn = join.right_source.connection_id
            if left_conn and right_conn and left_conn != right_conn:
                join.is_cross_database = True

    def _deduplicate_filters(self, plan: LogicalQueryPlan) -> None:
        seen = set()
        unique_filters: list[FilterPredicate] = []
        for f in plan.filters:
            key = (f.field.table, f.field.column, str(f.operator), repr(f.value))
            if key not in seen:
                seen.add(key)
                unique_filters.append(f)
        plan.filters = unique_filters

    def _deduplicate_sorts(self, plan: LogicalQueryPlan) -> None:
        seen_fields = set()
        unique_sorts = []
        for s in plan.order_by:
            field_name = s.field.qualified_name if isinstance(s.field, ColumnRef) else str(s.field)
            if field_name not in seen_fields:
                seen_fields.add(field_name)
                unique_sorts.append(s)
        plan.order_by = unique_sorts

    def _ensure_projections(self, plan: LogicalQueryPlan) -> None:
        # If aggregations exist and projections are empty, project the group by fields
        if plan.aggregations and not plan.projections:
            plan.projections = [copy.deepcopy(g) for g in plan.group_by]

    def _enforce_group_by_projection_consistency(self, plan: LogicalQueryPlan) -> None:
        """Ensure standard SQL compliance when group_by or aggregations are present.
        In SQL (and specifically PostgreSQL), every column in SELECT that is not an
        aggregate must appear in the GROUP BY clause.
        
        Rules:
        1. If aggregations exist or group_by exists:
           - Metric/numeric columns in projections (e.g. rate, amount, price, revenue, total, cost)
             must be moved to aggregations (SUM) if not already aggregated.
           - All other dimension columns in projections must appear in GROUP BY.
        2. Column matching is alias-aware and case-insensitive.
        """
        if not plan.group_by and not plan.aggregations:
            return

        from app.engine.ir.models import AggregateExpression, AggregateFunction

        grouped_col_names = {g.column.lower() for g in plan.group_by}
        metric_keywords = (
            "rate",
            "price",
            "amount",
            "revenue",
            "cost",
            "total",
            "fee",
            "val",
            "count",
            "num",
            "quantity",
            "score",
            "salary",
            "budget",
            "balance",
            "daily_rate",
        )

        new_projections = []
        for p in plan.projections:
            col_name_lower = p.column.lower()
            if col_name_lower in grouped_col_names:
                new_projections.append(p)
            else:
                if any(k in col_name_lower for k in metric_keywords):
                    # Metric column: wrap in SUM aggregation if not already aggregated
                    agg_exists = any(
                        (a.field and a.field.column.lower() == col_name_lower)
                        for a in plan.aggregations
                    )
                    if not agg_exists:
                        plan.aggregations.append(
                            AggregateExpression(
                                function=AggregateFunction.SUM,
                                field=copy.deepcopy(p),
                                alias=p.alias or f"total_{p.column}",
                            )
                        )
                else:
                    # Dimension column: ensure it is in group_by
                    if plan.aggregations or plan.group_by:
                        plan.group_by.append(copy.deepcopy(p))
                        grouped_col_names.add(col_name_lower)
                    new_projections.append(p)

        plan.projections = new_projections
