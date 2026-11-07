from app.engine.ir.models import (
    LogicalQueryPlan,
    PlanExplanation,
)


def explain_logical_plan(plan: LogicalQueryPlan) -> PlanExplanation:
    """Generate human-readable explanations and execution steps from a LogicalQueryPlan."""
    steps: list[str] = []
    involved_sources_set: set[str] = set()
    involved_fields_set: set[str] = set()

    # 1. Base Scan Step
    base_sources = [s.source_name for s in plan.sources]
    involved_sources_set.update(base_sources)
    steps.append(f"Scan initial data from {', '.join(base_sources)}")

    # 2. Joins
    for join in plan.joins:
        right_name = join.right_source.source_name
        involved_sources_set.add(right_name)
        cond_strs = [
            f"{c.left_field.qualified_name} = {c.right_field.qualified_name}"
            for c in join.conditions
        ]
        for c in join.conditions:
            involved_fields_set.add(c.left_field.qualified_name)
            involved_fields_set.add(c.right_field.qualified_name)

        cross_tag = " (cross-database)" if join.is_cross_database else ""
        steps.append(
            f"Join {join.left_source} with {right_name}{cross_tag} on {' AND '.join(cond_strs)}"
        )

    # 3. Filters
    if plan.filters:
        filter_strs = []
        for f in plan.filters:
            involved_fields_set.add(f.field.qualified_name)
            filter_strs.append(f"{f.field.qualified_name} {f.operator.value} {repr(f.value)}")
        steps.append(f"Filter records where {' AND '.join(filter_strs)}")

    # 4. Group By
    if plan.group_by:
        group_strs = [g.qualified_name for g in plan.group_by]
        involved_fields_set.update(group_strs)
        steps.append(f"Group records by {', '.join(group_strs)}")

    # 5. Aggregations
    if plan.aggregations:
        agg_strs = []
        for a in plan.aggregations:
            field_name = a.field.qualified_name if a.field else "*"
            if a.field:
                involved_fields_set.add(a.field.qualified_name)
            agg_strs.append(f"{a.function.value.upper()}({field_name}) AS {a.alias}")
        steps.append(f"Compute aggregations: {', '.join(agg_strs)}")

    # 6. Projections
    if plan.projections:
        proj_strs = [p.qualified_name for p in plan.projections]
        involved_fields_set.update(proj_strs)
        steps.append(f"Select columns: {', '.join(proj_strs)}")

    # 7. Sorting
    if plan.order_by:
        order_strs = []
        for o in plan.order_by:
            field_str = (
                o.field.qualified_name if hasattr(o.field, "qualified_name") else str(o.field)
            )
            involved_fields_set.add(field_str)
            order_strs.append(f"{field_str} {o.direction.value.upper()}")
        steps.append(f"Sort by {', '.join(order_strs)}")

    # 8. Limit & Offset
    if plan.limit is not None:
        steps.append(f"Limit results to top {plan.limit} records")

    # Generate top-level human-readable summary
    summary_parts = []
    if plan.aggregations:
        aggs_desc = ", ".join(a.alias for a in plan.aggregations)
        summary_parts.append(f"Computes {aggs_desc}")
    elif plan.projections:
        summary_parts.append("Retrieves requested columns")
    else:
        summary_parts.append("Retrieves records")

    summary_parts.append(f"from {', '.join(sorted(involved_sources_set))}")

    if plan.filters:
        summary_parts.append(f"matching {len(plan.filters)} filter conditions")

    if plan.order_by:
        top_order = plan.order_by[0]
        order_name = (
            top_order.field.qualified_name
            if hasattr(top_order.field, "qualified_name")
            else str(top_order.field)
        )
        summary_parts.append(f"ranked by {order_name}")

    if plan.limit:
        summary_parts.append(f"(limit {plan.limit})")

    summary = " ".join(summary_parts) + "."

    return PlanExplanation(
        summary=summary,
        steps=steps,
        involved_sources=sorted(involved_sources_set),
        involved_fields=sorted(involved_fields_set),
    )
