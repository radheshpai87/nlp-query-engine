import re
from typing import Any

from app.engine.generators.models import CompiledElasticsearchQuery, DialectType
from app.engine.ir.models import (
    AggregateExpression,
    AggregateFunction,
    ColumnRef,
    ComparisonOperator,
    FilterExpression,
    FilterPredicate,
    LogicalOperator,
    LogicalQueryPlan,
    SortDirection,
    SortExpression,
)


class ElasticsearchDSLGenerator:
    """Compiles a LogicalQueryPlan into an Elasticsearch Query DSL payload."""

    def _normalize_es_value(self, val: Any) -> Any:
        if not isinstance(val, str):
            return val
        s = val.strip()
        # Convert SQL-style intervals / relative date math to Elasticsearch syntax
        # e.g., "() - interval '30 days'", "now() - interval '30 days'", "CURRENT_DATE - INTERVAL '30 days'", "last 30 days" -> "now-30d"
        m = re.search(r"(\d+)\s*(day|month|year|hour|minute|week|d|m|y|h|w)s?", s, re.IGNORECASE)
        if any(k in s.lower() for k in ("interval", "now", "current", "ago", "last", "past")) and m:
            qty = m.group(1)
            unit_str = m.group(2).lower()
            unit_map = {
                "day": "d", "d": "d",
                "month": "M",
                "year": "y", "y": "y",
                "hour": "h", "h": "h",
                "minute": "m",
                "week": "w", "w": "w",
            }
            unit = unit_map.get(unit_str, "d")
            return f"now-{qty}{unit}"
        if s.lower() in ("now()", "current_date", "current_timestamp", "now"):
            return "now"
        return val

    def _render_field(self, col: ColumnRef) -> str:
        return col.column

    def _render_predicate(self, predicate: FilterPredicate) -> dict[str, Any]:
        field = self._render_field(predicate.field)
        op = predicate.operator
        val = self._normalize_es_value(predicate.value)

        if op == ComparisonOperator.IS_NULL:
            return {"bool": {"must_not": [{"exists": {"field": field}}]}}
        if op == ComparisonOperator.IS_NOT_NULL:
            return {"exists": {"field": field}}

        if op == ComparisonOperator.EQ:
            return {"term": {field: val}}
        if op == ComparisonOperator.NEQ:
            return {"bool": {"must_not": [{"term": {field: val}}]}}

        if op == ComparisonOperator.GT:
            return {"range": {field: {"gt": val}}}
        if op == ComparisonOperator.GTE:
            return {"range": {field: {"gte": val}}}
        if op == ComparisonOperator.LT:
            return {"range": {field: {"lt": val}}}
        if op == ComparisonOperator.LTE:
            return {"range": {field: {"lte": val}}}

        if op == ComparisonOperator.IN:
            items = val if isinstance(val, (list, tuple, set)) else [val]
            return {"terms": {field: list(items)}}
        if op == ComparisonOperator.NOT_IN:
            items = val if isinstance(val, (list, tuple, set)) else [val]
            return {"bool": {"must_not": [{"terms": {field: list(items)}}]}}

        if op == ComparisonOperator.BETWEEN:
            if isinstance(val, (list, tuple)) and len(val) >= 2:
                low, high = self._normalize_es_value(val[0]), self._normalize_es_value(val[1])
            else:
                low, high = self._normalize_es_value(val), self._normalize_es_value(val)
            return {"range": {field: {"gte": low, "lte": high}}}

        if op == ComparisonOperator.CONTAINS:
            return {"wildcard": {field: f"*{val}*"}}
        if op == ComparisonOperator.STARTS_WITH:
            return {"prefix": {field: str(val)}}
        if op == ComparisonOperator.ENDS_WITH:
            return {"wildcard": {field: f"*{val}"}}
        if op == ComparisonOperator.LIKE:
            wildcard_pattern = str(val).replace("%", "*").replace("_", "?")
            return {"wildcard": {field: wildcard_pattern}}

        return {"term": {field: val}}

    def _render_filter_expression(self, expr: FilterExpression) -> dict[str, Any]:
        clauses: list[dict[str, Any]] = []
        for pred in expr.predicates:
            clauses.append(self._render_predicate(pred))
        for nested in expr.nested_expressions:
            rendered = self._render_filter_expression(nested)
            if rendered:
                clauses.append(rendered)

        if not clauses:
            return {}

        if expr.logical_operator == LogicalOperator.OR:
            return {"bool": {"should": clauses, "minimum_should_match": 1}}
        if expr.logical_operator == LogicalOperator.NOT:
            return {"bool": {"must_not": clauses}}
        return {"bool": {"filter": clauses}}

    def _render_aggregations(
        self,
        group_by: list[ColumnRef],
        aggregations: list[AggregateExpression],
        order_by: list[SortExpression] | None = None,
    ) -> dict[str, Any]:
        metric_aggs: dict[str, Any] = {}
        for agg in aggregations:
            alias = agg.alias
            field_name = self._render_field(agg.field) if agg.field else "_id"

            if agg.function == AggregateFunction.COUNT and (agg.field is None or field_name == "_id"):
                metric_aggs[alias] = {"value_count": {"field": "_index"}}
            elif agg.function == AggregateFunction.COUNT:
                metric_aggs[alias] = {"value_count": {"field": field_name}}
            elif agg.function == AggregateFunction.SUM:
                if agg.multiplier:
                    multiplier_name = self._render_field(agg.multiplier)
                    field_script = field_name.replace("\\", "\\\\").replace("'", "\\'")
                    multiplier_script = multiplier_name.replace("\\", "\\\\").replace("'", "\\'")
                    metric_aggs[alias] = {
                        "sum": {
                            "script": {
                                "source": (
                                    f"doc['{field_script}'].value * "
                                    f"doc['{multiplier_script}'].value"
                                )
                            }
                        }
                    }
                else:
                    metric_aggs[alias] = {"sum": {"field": field_name}}
            elif agg.function == AggregateFunction.AVG:
                metric_aggs[alias] = {"avg": {"field": field_name}}
            elif agg.function == AggregateFunction.MIN:
                metric_aggs[alias] = {"min": {"field": field_name}}
            elif agg.function == AggregateFunction.MAX:
                metric_aggs[alias] = {"max": {"field": field_name}}
            elif agg.function == AggregateFunction.DISTINCT_COUNT:
                metric_aggs[alias] = {"cardinality": {"field": field_name}}

        if not group_by:
            return metric_aggs

        # Determine bucket sort order if specified
        agg_order: dict[str, str] | None = None
        if order_by:
            first_sort = order_by[0]
            sort_field = (
                self._render_field(first_sort.field)
                if isinstance(first_sort.field, ColumnRef)
                else str(first_sort.field)
            )
            sort_dir = "asc" if first_sort.direction == SortDirection.ASC else "desc"

            if sort_field in metric_aggs:
                agg_order = {sort_field: sort_dir}
            elif "count" in sort_field.lower() or sort_field in ("_count", "doc_count"):
                agg_order = {"_count": sort_dir}
            elif any(self._render_field(g) == sort_field for g in group_by) or sort_field in ("_key", "key"):
                agg_order = {"_key": sort_dir}

        # Nested terms aggregation for grouping
        root_agg: dict[str, Any] = {}
        current_node = root_agg

        for i, g in enumerate(group_by):
            g_field = self._render_field(g)
            agg_name = f"group_by_{g_field}"
            terms_inner: dict[str, Any] = {"field": g_field, "size": 100}
            if i == 0 and agg_order:
                terms_inner["order"] = agg_order

            terms_spec: dict[str, Any] = {"terms": terms_inner}

            if i == len(group_by) - 1:
                # Innermost group holds metric aggregations
                if metric_aggs:
                    terms_spec["aggs"] = metric_aggs
                current_node[agg_name] = terms_spec
            else:
                next_node: dict[str, Any] = {}
                terms_spec["aggs"] = next_node
                current_node[agg_name] = terms_spec
                current_node = next_node

        return root_agg

    def _render_sort(self, sort: SortExpression) -> dict[str, Any]:
        field = (
            self._render_field(sort.field) if isinstance(sort.field, ColumnRef) else str(sort.field)
        )
        order = "asc" if sort.direction == SortDirection.ASC else "desc"
        return {field: {"order": order}}

    def generate(self, plan: LogicalQueryPlan) -> CompiledElasticsearchQuery:
        """Generate Elasticsearch Query DSL from LogicalQueryPlan."""
        primary_source = plan.sources[0]
        connection_id = primary_source.connection_id
        index_name = primary_source.source_name

        query_body: dict[str, Any] = {}

        # 1. Filters & Query
        filter_clauses: list[dict[str, Any]] = []
        for f in plan.filters:
            filter_clauses.append(self._render_predicate(f))

        if plan.filter_expression:
            expr_clause = self._render_filter_expression(plan.filter_expression)
            if expr_clause:
                filter_clauses.append(expr_clause)

        if filter_clauses:
            query_body["query"] = {"bool": {"filter": filter_clauses}}
        else:
            query_body["query"] = {"match_all": {}}

        # 2. Aggregations
        has_aggregations = bool(plan.aggregations or plan.group_by)
        if has_aggregations:
            query_body["aggs"] = self._render_aggregations(
                plan.group_by, plan.aggregations, order_by=plan.order_by
            )
            # When grouped or metric aggregations are requested, set hit size to 0 so only aggregations return
            if plan.group_by or not plan.projections:
                query_body["size"] = 0
            else:
                query_body["size"] = plan.limit if plan.limit is not None else 100
        else:
            # 3. Projections (_source)
            if plan.projections:
                query_body["_source"] = [self._render_field(p) for p in plan.projections]

            # 4. Pagination
            if plan.limit is not None:
                query_body["size"] = plan.limit
            if plan.offset is not None and plan.offset > 0:
                query_body["from"] = plan.offset

        # 5. Sort - only apply top-level document sort if not an aggregation query,
        # and do not sort document hits on synthetic aggregation aliases.
        if plan.order_by and not has_aggregations:
            agg_aliases = {agg.alias for agg in plan.aggregations if agg.alias}
            valid_doc_sorts = []
            for s in plan.order_by:
                s_name = (
                    self._render_field(s.field)
                    if isinstance(s.field, ColumnRef)
                    else str(s.field)
                )
                if (
                    s_name not in agg_aliases
                    and not s_name.endswith("_count")
                    and s_name != "count"
                    and not s_name.startswith(("avg_", "sum_", "min_", "max_"))
                ):
                    valid_doc_sorts.append(self._render_sort(s))
            if valid_doc_sorts and query_body.get("size", 10) > 0:
                query_body["sort"] = valid_doc_sorts

        return CompiledElasticsearchQuery(
            dialect=DialectType.ELASTICSEARCH,
            connection_id=connection_id,
            index=index_name,
            query_body=query_body,
            is_read_only=True,
        )
