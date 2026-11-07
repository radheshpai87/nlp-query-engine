from typing import Any

from app.engine.generators.models import CompiledSQLQuery, DialectType
from app.engine.ir.models import (
    AggregateExpression,
    AggregateFunction,
    ColumnRef,
    ComparisonOperator,
    FilterExpression,
    FilterPredicate,
    JoinNode,
    JoinType,
    LogicalQueryPlan,
    SortExpression,
)


class PostgresSQLGenerator:
    """Compiles a LogicalQueryPlan into safe, parameterized PostgreSQL SQL."""

    def __init__(self) -> None:
        self._param_counter = 0
        self._params: dict[str, Any] = {}

    def _next_param(self, value: Any) -> str:
        self._param_counter += 1
        param_name = f"p{self._param_counter}"
        self._params[param_name] = value
        return param_name

    def _format_literal(self, value: Any) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, bool):
            return "TRUE" if value else "FALSE"
        # Escape single quotes for literal display SQL
        safe_str = str(value).replace("'", "''")
        return f"'{safe_str}'"

    def _render_column(self, col: ColumnRef) -> str:
        prefix = f'"{col.table}".' if col.table else ""
        return f'{prefix}"{col.column}"'

    def _render_aggregate(self, agg: AggregateExpression) -> str:
        if agg.function == AggregateFunction.COUNT and agg.field is None:
            inner = "*"
        elif agg.function == AggregateFunction.DISTINCT_COUNT:
            inner = f"DISTINCT {self._render_column(agg.field)}" if agg.field else "*"
            return f'COUNT({inner}) AS "{agg.alias}"'
        else:
            inner = self._render_column(agg.field) if agg.field else "*"

        func_name = agg.function.value.upper()
        return f'{func_name}({inner}) AS "{agg.alias}"'

    def _render_predicate(self, predicate: FilterPredicate, parameterized: bool = True) -> str:
        col_str = self._render_column(predicate.field)
        op = predicate.operator
        val = predicate.value

        if op == ComparisonOperator.IS_NULL:
            return f"{col_str} IS NULL"
        if op == ComparisonOperator.IS_NOT_NULL:
            return f"{col_str} IS NOT NULL"

        if op in (ComparisonOperator.IN, ComparisonOperator.NOT_IN):
            items = val if isinstance(val, (list, tuple, set)) else [val]
            if not items:
                return "1=0" if op == ComparisonOperator.IN else "1=1"
            if parameterized:
                placeholders = [f":{self._next_param(item)}" for item in items]
                clause = ", ".join(placeholders)
            else:
                clause = ", ".join(self._format_literal(item) for item in items)
            op_str = "IN" if op == ComparisonOperator.IN else "NOT IN"
            return f"{col_str} {op_str} ({clause})"

        if op == ComparisonOperator.BETWEEN:
            if isinstance(val, (list, tuple)) and len(val) >= 2:
                low, high = val[0], val[1]
            else:
                low, high = val, val
            if parameterized:
                p1 = f":{self._next_param(low)}"
                p2 = f":{self._next_param(high)}"
                return f"{col_str} BETWEEN {p1} AND {p2}"
            else:
                return f"{col_str} BETWEEN {self._format_literal(low)} AND {self._format_literal(high)}"

        # Text matching operators
        if op == ComparisonOperator.CONTAINS:
            sql_op = "ILIKE"
            pat = f"%{val}%"
        elif op == ComparisonOperator.STARTS_WITH:
            sql_op = "ILIKE"
            pat = f"{val}%"
        elif op == ComparisonOperator.ENDS_WITH:
            sql_op = "ILIKE"
            pat = f"%{val}"
        elif op == ComparisonOperator.LIKE:
            sql_op = "LIKE"
            pat = str(val)
        elif op == ComparisonOperator.EQ:
            sql_op = "="
            pat = val
        elif op == ComparisonOperator.NEQ:
            sql_op = "!="
            pat = val
        elif op == ComparisonOperator.GT:
            sql_op = ">"
            pat = val
        elif op == ComparisonOperator.GTE:
            sql_op = ">="
            pat = val
        elif op == ComparisonOperator.LT:
            sql_op = "<"
            pat = val
        elif op == ComparisonOperator.LTE:
            sql_op = "<="
            pat = val
        else:
            sql_op = "="
            pat = val

        if parameterized:
            p = f":{self._next_param(pat)}"
            return f"{col_str} {sql_op} {p}"
        else:
            return f"{col_str} {sql_op} {self._format_literal(pat)}"

    def _render_filter_expression(self, expr: FilterExpression, parameterized: bool = True) -> str:
        parts: list[str] = []
        for pred in expr.predicates:
            parts.append(self._render_predicate(pred, parameterized=parameterized))
        for nested in expr.nested_expressions:
            rendered_nested = self._render_filter_expression(nested, parameterized=parameterized)
            if rendered_nested:
                parts.append(f"({rendered_nested})")

        if not parts:
            return ""

        op_str = f" {expr.logical_operator.value.upper()} "
        return op_str.join(parts)

    def _render_join(self, join: JoinNode) -> str:
        join_type_map = {
            JoinType.INNER: "INNER JOIN",
            JoinType.LEFT_OUTER: "LEFT JOIN",
            JoinType.RIGHT_OUTER: "RIGHT JOIN",
            JoinType.CROSS: "CROSS JOIN",
        }
        join_keyword = join_type_map.get(join.join_type, "INNER JOIN")
        right_table = join.right_source.source_name
        right_alias = join.right_source.effective_alias

        alias_clause = f' AS "{right_alias}"' if right_alias != right_table else ""
        table_clause = f'"{right_table}"{alias_clause}'

        if join.join_type == JoinType.CROSS or not join.conditions:
            return f"{join_keyword} {table_clause}"

        cond_parts: list[str] = []
        for cond in join.conditions:
            left = self._render_column(cond.left_field)
            right = self._render_column(cond.right_field)
            cond_parts.append(f"{left} = {right}")

        on_clause = " AND ".join(cond_parts)
        return f"{join_keyword} {table_clause} ON {on_clause}"

    def _render_sort(self, sort: SortExpression) -> str:
        if isinstance(sort.field, ColumnRef):
            field_str = self._render_column(sort.field)
        else:
            field_str = f'"{sort.field}"'

        direction = sort.direction.value.upper()
        nulls = "NULLS FIRST" if sort.nulls_first else "NULLS LAST"
        return f"{field_str} {direction} {nulls}"

    def generate(self, plan: LogicalQueryPlan) -> CompiledSQLQuery:
        """Generate parameterized and formatted SQL from a LogicalQueryPlan."""
        primary_source = plan.sources[0]
        connection_id = primary_source.connection_id
        primary_table = primary_source.source_name
        primary_alias = primary_source.effective_alias

        def build_sql(parameterized: bool) -> str:
            # 1. SELECT clause
            select_items: list[str] = []
            for proj in plan.projections:
                col_render = self._render_column(proj)
                if proj.alias:
                    select_items.append(f'{col_render} AS "{proj.alias}"')
                else:
                    select_items.append(col_render)

            for agg in plan.aggregations:
                select_items.append(self._render_aggregate(agg))

            select_clause = ", ".join(select_items) if select_items else "*"

            # 2. FROM clause
            from_clause = f'FROM "{primary_table}"'
            if primary_alias != primary_table:
                from_clause += f' AS "{primary_alias}"'

            # 3. JOIN clauses
            join_clauses = [self._render_join(j) for j in plan.joins]

            # 4. WHERE clause
            where_conditions: list[str] = []
            for f in plan.filters:
                where_conditions.append(self._render_predicate(f, parameterized=parameterized))

            if plan.filter_expression:
                expr_str = self._render_filter_expression(
                    plan.filter_expression, parameterized=parameterized
                )
                if expr_str:
                    where_conditions.append(f"({expr_str})")

            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)

            # 5. GROUP BY clause
            group_by_clause = ""
            if plan.group_by:
                group_by_clause = "GROUP BY " + ", ".join(
                    self._render_column(g) for g in plan.group_by
                )

            # 6. HAVING clause
            having_clause = ""
            if plan.having:
                having_clause = "HAVING " + " AND ".join(
                    self._render_predicate(h, parameterized=parameterized) for h in plan.having
                )

            # 7. ORDER BY clause
            order_by_clause = ""
            if plan.order_by:
                order_by_clause = "ORDER BY " + ", ".join(
                    self._render_sort(s) for s in plan.order_by
                )

            # 8. LIMIT and OFFSET
            limit_clause = f"LIMIT {plan.limit}" if plan.limit is not None else ""
            offset_clause = (
                f"OFFSET {plan.offset}" if plan.offset is not None and plan.offset > 0 else ""
            )

            # Assemble clean SQL
            query_parts = [f"SELECT {select_clause}", from_clause]
            query_parts.extend(join_clauses)
            if where_clause:
                query_parts.append(where_clause)
            if group_by_clause:
                query_parts.append(group_by_clause)
            if having_clause:
                query_parts.append(having_clause)
            if order_by_clause:
                query_parts.append(order_by_clause)
            if limit_clause:
                query_parts.append(limit_clause)
            if offset_clause:
                query_parts.append(offset_clause)

            return " ".join(query_parts) + ";"

        # Generate parameterized query (populates self._params)
        self._param_counter = 0
        self._params.clear()
        parameterized_sql = build_sql(parameterized=True)
        captured_params = dict(self._params)

        # Generate formatted literal SQL for human readability / preview
        self._param_counter = 0
        self._params.clear()
        display_sql = build_sql(parameterized=False)

        return CompiledSQLQuery(
            dialect=DialectType.POSTGRES,
            connection_id=connection_id,
            target_table=primary_table,
            sql=display_sql,
            parameterized_sql=parameterized_sql,
            parameters=captured_params,
            is_read_only=True,
        )
