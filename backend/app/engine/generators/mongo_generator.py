import re
from typing import Any

from app.engine.generators.models import CompiledMongoQuery, DialectType
from app.engine.ir.models import (
    AggregateFunction,
    ColumnRef,
    ComparisonOperator,
    FilterExpression,
    FilterPredicate,
    JoinType,
    LogicalOperator,
    LogicalQueryPlan,
    SortDirection,
    SortExpression,
)


class MongoPipelineGenerator:
    """Compiles a LogicalQueryPlan into a MongoDB Aggregation Pipeline."""

    def _render_field_name(
        self, col: ColumnRef, primary_table: str, primary_alias: str = ""
    ) -> str:
        # In MongoDB, if joined collection is unwound, fields are accessed via joined_alias.field
        if col.table and col.table not in (primary_table, primary_alias):
            return f"{col.table}.{col.column}"
        return col.column

    def _render_predicate(
        self, predicate: FilterPredicate, primary_table: str, primary_alias: str = ""
    ) -> dict[str, Any]:
        field = self._render_field_name(predicate.field, primary_table, primary_alias)
        op = predicate.operator
        val = predicate.value

        if op == ComparisonOperator.IS_NULL:
            return {field: None}
        if op == ComparisonOperator.IS_NOT_NULL:
            return {field: {"$ne": None}}

        if op == ComparisonOperator.EQ:
            return {field: val}
        if op == ComparisonOperator.NEQ:
            return {field: {"$ne": val}}
        if op == ComparisonOperator.GT:
            return {field: {"$gt": val}}
        if op == ComparisonOperator.GTE:
            return {field: {"$gte": val}}
        if op == ComparisonOperator.LT:
            return {field: {"$lt": val}}
        if op == ComparisonOperator.LTE:
            return {field: {"$lte": val}}

        if op == ComparisonOperator.IN:
            items = val if isinstance(val, (list, tuple, set)) else [val]
            return {field: {"$in": list(items)}}
        if op == ComparisonOperator.NOT_IN:
            items = val if isinstance(val, (list, tuple, set)) else [val]
            return {field: {"$nin": list(items)}}

        if op == ComparisonOperator.BETWEEN:
            if isinstance(val, (list, tuple)) and len(val) >= 2:
                low, high = val[0], val[1]
            else:
                low, high = val, val
            return {field: {"$gte": low, "$lte": high}}

        if op == ComparisonOperator.CONTAINS:
            escaped = re.escape(str(val))
            return {field: {"$regex": escaped, "$options": "i"}}
        if op == ComparisonOperator.STARTS_WITH:
            escaped = re.escape(str(val))
            return {field: {"$regex": f"^{escaped}", "$options": "i"}}
        if op == ComparisonOperator.ENDS_WITH:
            escaped = re.escape(str(val))
            return {field: {"$regex": f"{escaped}$", "$options": "i"}}
        if op == ComparisonOperator.LIKE:
            pattern = re.escape(str(val)).replace("%", ".*").replace("_", ".")
            return {field: {"$regex": f"^{pattern}$", "$options": "i"}}

        return {field: val}

    def _render_filter_expression(
        self, expr: FilterExpression, primary_table: str, primary_alias: str = ""
    ) -> dict[str, Any]:
        conditions: list[dict[str, Any]] = []
        for pred in expr.predicates:
            conditions.append(self._render_predicate(pred, primary_table, primary_alias))
        for nested in expr.nested_expressions:
            rendered_nested = self._render_filter_expression(nested, primary_table, primary_alias)
            if rendered_nested:
                conditions.append(rendered_nested)

        if not conditions:
            return {}

        if len(conditions) == 1 and expr.logical_operator == LogicalOperator.AND:
            return conditions[0]

        if expr.logical_operator == LogicalOperator.OR:
            return {"$or": conditions}
        if expr.logical_operator == LogicalOperator.NOT:
            return {"$nor": conditions}
        return {"$and": conditions}

    def _render_sort(
        self, sort: SortExpression, primary_table: str, primary_alias: str = ""
    ) -> tuple[str, int]:
        if isinstance(sort.field, ColumnRef):
            field_name = self._render_field_name(sort.field, primary_table, primary_alias)
        else:
            field_name = str(sort.field)

        direction = 1 if sort.direction == SortDirection.ASC else -1
        return field_name, direction

    def generate(self, plan: LogicalQueryPlan) -> CompiledMongoQuery:
        """Generate MongoDB aggregation pipeline from LogicalQueryPlan."""
        primary_source = plan.sources[0]
        connection_id = primary_source.connection_id
        collection_name = primary_source.source_name
        primary_alias = primary_source.effective_alias
        pipeline: list[dict[str, Any]] = []

        # 1. $match (early filter pushdown for primary collection)
        match_conditions: list[dict[str, Any]] = []
        for f in plan.filters:
            match_conditions.append(self._render_predicate(f, collection_name, primary_alias))

        if plan.filter_expression:
            expr_cond = self._render_filter_expression(
                plan.filter_expression, collection_name, primary_alias
            )
            if expr_cond:
                match_conditions.append(expr_cond)

        if len(match_conditions) == 1:
            pipeline.append({"$match": match_conditions[0]})
        elif len(match_conditions) > 1:
            pipeline.append({"$match": {"$and": match_conditions}})

        # 2. $lookup & $unwind for joins
        for join in plan.joins:
            right_coll = join.right_source.source_name
            right_alias = join.right_source.effective_alias

            local_field = ""
            foreign_field = ""
            if join.conditions:
                first_cond = join.conditions[0]
                local_field = first_cond.left_field.column
                foreign_field = first_cond.right_field.column

            pipeline.append(
                {
                    "$lookup": {
                        "from": right_coll,
                        "localField": local_field,
                        "foreignField": foreign_field,
                        "as": right_alias,
                    }
                }
            )

            # Unwind joined array
            preserve = join.join_type == JoinType.LEFT_OUTER
            pipeline.append(
                {
                    "$unwind": {
                        "path": f"${right_alias}",
                        "preserveNullAndEmptyArrays": preserve,
                    }
                }
            )

        # 3. $group (aggregations)
        has_aggregations = bool(plan.aggregations or plan.group_by)
        if has_aggregations:
            group_stage: dict[str, Any] = {}

            # Construct _id
            if len(plan.group_by) == 1:
                g_col = plan.group_by[0]
                group_stage["_id"] = (
                    f"${self._render_field_name(g_col, collection_name, primary_alias)}"
                )
            elif len(plan.group_by) > 1:
                group_stage["_id"] = {
                    g.column: f"${self._render_field_name(g, collection_name, primary_alias)}"
                    for g in plan.group_by
                }
            else:
                group_stage["_id"] = None

            # Add aggregate accumulator fields
            for agg in plan.aggregations:
                alias = agg.alias
                if agg.function == AggregateFunction.COUNT and agg.field is None:
                    group_stage[alias] = {"$sum": 1}
                elif agg.function == AggregateFunction.COUNT and agg.field:
                    field_ref = (
                        f"${self._render_field_name(agg.field, collection_name, primary_alias)}"
                    )
                    group_stage[alias] = {
                        "$sum": {"$cond": [{"$ifNull": [field_ref, False]}, 1, 0]}
                    }
                elif agg.function == AggregateFunction.SUM and agg.field:
                    field_ref = (
                        f"${self._render_field_name(agg.field, collection_name, primary_alias)}"
                    )
                    group_stage[alias] = {"$sum": field_ref}
                elif agg.function == AggregateFunction.AVG and agg.field:
                    field_ref = (
                        f"${self._render_field_name(agg.field, collection_name, primary_alias)}"
                    )
                    group_stage[alias] = {"$avg": field_ref}
                elif agg.function == AggregateFunction.MIN and agg.field:
                    field_ref = (
                        f"${self._render_field_name(agg.field, collection_name, primary_alias)}"
                    )
                    group_stage[alias] = {"$min": field_ref}
                elif agg.function == AggregateFunction.MAX and agg.field:
                    field_ref = (
                        f"${self._render_field_name(agg.field, collection_name, primary_alias)}"
                    )
                    group_stage[alias] = {"$max": field_ref}
                elif agg.function == AggregateFunction.DISTINCT_COUNT and agg.field:
                    field_ref = (
                        f"${self._render_field_name(agg.field, collection_name, primary_alias)}"
                    )
                    group_stage[alias] = {"$addToSet": field_ref}

            pipeline.append({"$group": group_stage})

            # If distinct count was used, calculate size in a follow-up $project
            distinct_aggs = [
                agg for agg in plan.aggregations if agg.function == AggregateFunction.DISTINCT_COUNT
            ]
            if distinct_aggs:
                post_group_proj: dict[str, Any] = {"_id": 1}
                for agg in plan.aggregations:
                    if agg.function == AggregateFunction.DISTINCT_COUNT:
                        post_group_proj[agg.alias] = {"$size": f"${agg.alias}"}
                    else:
                        post_group_proj[agg.alias] = 1
                pipeline.append({"$project": post_group_proj})

        # 4. HAVING (represented as another $match after $group)
        if plan.having and has_aggregations:
            having_conditions: list[dict[str, Any]] = []
            for h in plan.having:
                having_conditions.append(self._render_predicate(h, collection_name, primary_alias))
            if len(having_conditions) == 1:
                pipeline.append({"$match": having_conditions[0]})
            elif len(having_conditions) > 1:
                pipeline.append({"$match": {"$and": having_conditions}})

        # 5. $sort
        if plan.order_by:
            sort_stage: dict[str, int] = {}
            for s in plan.order_by:
                fname, d = self._render_sort(s, collection_name, primary_alias)
                sort_stage[fname] = d
            pipeline.append({"$sort": sort_stage})

        # 6. $skip and $limit
        if plan.offset and plan.offset > 0:
            pipeline.append({"$skip": plan.offset})

        if plan.limit is not None:
            pipeline.append({"$limit": plan.limit})

        # 7. $project (only if not aggregating, to select requested fields)
        if not has_aggregations and plan.projections:
            project_stage: dict[str, Any] = {"_id": 0}
            for proj in plan.projections:
                src_field = self._render_field_name(proj, collection_name, primary_alias)
                target_field = proj.alias or proj.column
                if target_field == src_field:
                    project_stage[target_field] = 1
                else:
                    project_stage[target_field] = f"${src_field}"
            pipeline.append({"$project": project_stage})

        return CompiledMongoQuery(
            dialect=DialectType.MONGODB,
            connection_id=connection_id,
            collection=collection_name,
            pipeline=pipeline,
            is_read_only=True,
        )
