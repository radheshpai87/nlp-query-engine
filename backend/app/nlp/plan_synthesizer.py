from typing import Any

from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import (
    ComparisonOperator,
    JoinType,
    LogicalQueryPlan,
    SortDirection,
)
from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot, UserDefinedRelationship
from app.nlp.intent_extractor import ExtractedIntent


class LogicalPlanSynthesizer:
    """Synthesizes a validated LogicalQueryPlan from extracted intent and grounded schemas."""

    def synthesize(
        self,
        workspace_id: str,
        query: str,
        intent: ExtractedIntent,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
        relationships: list[UserDefinedRelationship] | None = None,
        resolved_context: dict[str, Any] | None = None,
    ) -> LogicalQueryPlan:
        """Ground semantic intent into real schema elements and assemble LogicalQueryPlan."""
        builder = LogicalPlanBuilder(workspace_id=workspace_id)
        builder.query_text = query

        # 1. Map target entities to discovered tables and connections
        # Build lookup table_name -> (connection_id, SchemaObject)
        table_lookup: dict[str, tuple[str, Any]] = {}
        for conn_id, snap in snapshots.items():
            for obj in snap.objects:
                table_lookup[obj.name.lower()] = (conn_id, obj)

        chosen_sources: list[tuple[str, str, Any]] = []  # (connection_id, table_name, schema_obj)

        # Check if resolved_context explicitly specifies a target source
        if resolved_context and resolved_context.get("target_source") and "::" in str(resolved_context["target_source"]):
            req_conn_id, req_table = str(resolved_context["target_source"]).split("::", 1)
            for conn_id, snap in snapshots.items():
                if conn_id == req_conn_id:
                    for obj in snap.objects:
                        if obj.name.lower() == req_table.lower():
                            chosen_sources.append((conn_id, obj.name, obj))
                            break

        if not chosen_sources:
            for entity in intent.target_entities:
                normalized_entity = entity.lower().strip()
                if normalized_entity in table_lookup:
                    conn_id, obj = table_lookup[normalized_entity]
                    chosen_sources.append((conn_id, obj.name, obj))

        # If no recognized entities, fallback to first table in first snapshot
        if not chosen_sources:
            for conn_id, snap in snapshots.items():
                if snap.objects:
                    chosen_sources.append((conn_id, snap.objects[0].name, snap.objects[0]))
                    break

        # If still no sources (empty database snapshot), build minimal plan
        if not chosen_sources:
            fallback_conn_id = next(iter(connections.keys())) if connections else "conn-default"
            return builder.from_source(fallback_conn_id, "default_source").build()

        # 2. Add primary source
        primary_conn_id, primary_table, primary_obj = chosen_sources[0]
        builder.from_source(
            connection_id=primary_conn_id,
            source_name=primary_table,
            alias=primary_table[:3],
        )
        primary_alias = primary_table[:3]

        # 3. Handle multi-source joins
        if len(chosen_sources) > 1 and relationships:
            rel_map = {(r.source_table.lower(), r.target_table.lower()): r for r in relationships}
            rel_map_rev = {
                (r.target_table.lower(), r.source_table.lower()): r for r in relationships
            }

            for sec_conn_id, sec_table, _sec_obj in chosen_sources[1:]:
                sec_alias = sec_table[:3]
                pair = (primary_table.lower(), sec_table.lower())
                pair_rev = (sec_table.lower(), primary_table.lower())

                if pair in rel_map:
                    rel = rel_map[pair]
                    src_fld = rel.source_fields[0] if rel.source_fields else "id"
                    tgt_fld = rel.target_fields[0] if rel.target_fields else "id"
                    builder.join(
                        right_connection_id=sec_conn_id,
                        right_source_name=sec_table,
                        left_col=(primary_alias, src_fld),
                        right_col=(sec_alias, tgt_fld),
                        join_type=JoinType.INNER,
                        right_alias=sec_alias,
                        is_cross_database=primary_conn_id != sec_conn_id,
                    )
                elif pair_rev in rel_map_rev:
                    rel = rel_map_rev[pair_rev]
                    src_fld = rel.source_fields[0] if rel.source_fields else "id"
                    tgt_fld = rel.target_fields[0] if rel.target_fields else "id"
                    builder.join(
                        right_connection_id=sec_conn_id,
                        right_source_name=sec_table,
                        left_col=(primary_alias, tgt_fld),
                        right_col=(sec_alias, src_fld),
                        join_type=JoinType.INNER,
                        right_alias=sec_alias,
                        is_cross_database=primary_conn_id != sec_conn_id,
                    )

        # 4. Add projections
        # Projections from metrics or first 5 fields of primary source
        available_fields = [f.name for f in primary_obj.fields]
        projected_any = False
        for metric in intent.metrics:
            if metric in available_fields:
                builder.project(primary_alias, metric)
                projected_any = True

        if not projected_any:
            # Add up to 4 default fields
            for f in primary_obj.fields[:4]:
                builder.project(primary_alias, f.name)

        # 5. Add filters
        for f in intent.filters:
            if f.column in available_fields:
                op_str = f.operator.lower()
                op = ComparisonOperator.EQ
                if op_str in ("gt", ">"):
                    op = ComparisonOperator.GT
                elif op_str in ("gte", ">="):
                    op = ComparisonOperator.GTE
                elif op_str in ("lt", "<"):
                    op = ComparisonOperator.LT
                elif op_str in ("lte", "<="):
                    op = ComparisonOperator.LTE
                elif op_str in ("in",):
                    op = ComparisonOperator.IN
                elif op_str in ("contains", "like"):
                    op = ComparisonOperator.CONTAINS
                elif op_str in ("neq", "!="):
                    op = ComparisonOperator.NEQ

                builder.filter(primary_alias, f.column, op, f.value)

        # 5b. Ground resolved context clarifications dynamically into filters
        if resolved_context:
            if "high_value_threshold" in resolved_context and resolved_context["high_value_threshold"] is not None:
                thresh = resolved_context["high_value_threshold"]
                amount_fld = next(
                    (f.name for f in primary_obj.fields if any(k in f.name.lower() for k in ("amount", "total", "price", "spend", "cost", "value"))),
                    next((f.name for f in primary_obj.fields if f.data_type.lower() in ("integer", "numeric", "float", "double", "decimal", "number")), None)
                )
                if amount_fld and isinstance(thresh, (int, float)):
                    builder.filter(primary_alias, amount_fld, ComparisonOperator.GT, thresh)

            if "cheap_price_threshold" in resolved_context and resolved_context["cheap_price_threshold"] is not None:
                thresh = resolved_context["cheap_price_threshold"]
                amount_fld = next(
                    (f.name for f in primary_obj.fields if any(k in f.name.lower() for k in ("amount", "total", "price", "spend", "cost", "value"))),
                    next((f.name for f in primary_obj.fields if f.data_type.lower() in ("integer", "numeric", "float", "double", "decimal", "number")), None)
                )
                if amount_fld and isinstance(thresh, (int, float)):
                    builder.filter(primary_alias, amount_fld, ComparisonOperator.LT, thresh)

            if "time_window" in resolved_context and resolved_context["time_window"] is not None:
                time_fld = next(
                    (f.name for f in primary_obj.fields if any(k in f.name.lower() for k in ("date", "time", "created", "timestamp"))),
                    next((f.name for f in primary_obj.fields if f.data_type.lower() in ("timestamp", "datetime", "date")), None)
                )
                if time_fld:
                    builder.filter(primary_alias, time_fld, ComparisonOperator.GTE, f"now-{resolved_context['time_window']}")

        # 6. Add order by
        for s in intent.order_by:
            if s.column in available_fields:
                direction = (
                    SortDirection.DESC if s.direction.lower() == "desc" else SortDirection.ASC
                )
                builder.sort((primary_alias, s.column), direction=direction)

        # 7. Pagination
        limit = intent.ranking_limit if intent.ranking_limit is not None else 20
        builder.limit(min(limit, 100))
        builder.offset(0)

        return builder.build()
