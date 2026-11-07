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
