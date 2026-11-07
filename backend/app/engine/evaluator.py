from collections import defaultdict
from typing import Any

from app.engine.generators.models import CrossDatabaseJoinStep
from app.engine.ir.models import (
    ColumnRef,
    ComparisonOperator,
    FilterPredicate,
    SortDirection,
    SortExpression,
)
from app.models.execution import ExecutionColumnMetadata


def infer_data_type(sample_values: list[Any]) -> str:
    """Infer the uniform tabular data type from a list of observed cell values."""
    non_nulls = [v for v in sample_values if v is not None]
    if not non_nulls:
        return "string"

    first = non_nulls[0]
    if isinstance(first, bool):
        return "boolean"
    if isinstance(first, int):
        return "integer"
    if isinstance(first, float):
        return "float"
    if isinstance(first, (dict, list)):
        return "object"
    if isinstance(first, str):
        # Quick check for ISO timestamp pattern
        if len(first) >= 19 and first[4] == "-" and first[7] == "-" and "T" in first:
            return "datetime"
        return "string"
    return "string"


class CrossDatabaseEvaluator:
    """In-memory hash join evaluator and post-processor for heterogeneous federated queries."""

    @staticmethod
    def hash_join(
        left_rows: list[dict[str, Any]],
        right_rows: list[dict[str, Any]],
        left_key: str,
        right_key: str,
        is_left_outer: bool = False,
    ) -> list[dict[str, Any]]:
        """Perform an in-memory hash join between two record sets on specified keys."""
        # 1. Build hash table on right relation
        hash_table: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for r_row in right_rows:
            key_val = r_row.get(right_key)
            if key_val is not None:
                hash_table[str(key_val)].append(r_row)

        # 2. Probe hash table with left relation
        joined_results: list[dict[str, Any]] = []
        for l_row in left_rows:
            left_val = l_row.get(left_key)
            lookup_key = str(left_val) if left_val is not None else None
            matches = hash_table.get(lookup_key, []) if lookup_key is not None else []

            if matches:
                for match in matches:
                    merged = {**l_row, **match}
                    joined_results.append(merged)
            elif is_left_outer:
                joined_results.append(dict(l_row))

        return joined_results

    @staticmethod
    def apply_filter(
        rows: list[dict[str, Any]], predicate: FilterPredicate
    ) -> list[dict[str, Any]]:
        """Apply a filter predicate to in-memory records."""
        col = predicate.field.column
        op = predicate.operator
        val = predicate.value

        filtered: list[dict[str, Any]] = []
        for r in rows:
            cell = r.get(col)
            if cell is None and op not in (ComparisonOperator.IS_NULL, ComparisonOperator.NEQ):
                continue

            match = False
            if op == ComparisonOperator.EQ:
                match = str(cell) == str(val) if isinstance(val, (int, str)) else cell == val
            elif op == ComparisonOperator.NEQ:
                match = cell != val
            elif op == ComparisonOperator.GT:
                match = cell is not None and cell > val
            elif op == ComparisonOperator.GTE:
                match = cell is not None and cell >= val
            elif op == ComparisonOperator.LT:
                match = cell is not None and cell < val
            elif op == ComparisonOperator.LTE:
                match = cell is not None and cell <= val
            elif op == ComparisonOperator.IN:
                items = val if isinstance(val, (list, tuple, set)) else [val]
                match = cell in items or str(cell) in [str(i) for i in items]
            elif op == ComparisonOperator.CONTAINS:
                match = cell is not None and str(val).lower() in str(cell).lower()
            elif op == ComparisonOperator.IS_NULL:
                match = cell is None
            elif op == ComparisonOperator.IS_NOT_NULL:
                match = cell is not None
            else:
                match = True

            if match:
                filtered.append(r)

        return filtered

    @staticmethod
    def apply_sort(
        rows: list[dict[str, Any]], order_by: list[SortExpression]
    ) -> list[dict[str, Any]]:
        """Sort in-memory records based on sort expressions."""
        if not order_by:
            return rows

        def sort_key(row: dict[str, Any]) -> list[Any]:
            keys: list[Any] = []
            for s in order_by:
                field_name = s.field.column if isinstance(s.field, ColumnRef) else str(s.field)
                val = row.get(field_name)
                # Normalize None for sorting
                if val is None:
                    keys.append(("", "") if s.nulls_first else ("zzz", "zzz"))
                else:
                    keys.append(val)
            return keys

        # Multiple sort keys; note python's stable sort
        for s in reversed(order_by):
            field_name = s.field.column if isinstance(s.field, ColumnRef) else str(s.field)
            reverse = s.direction == SortDirection.DESC
            rows = sorted(
                rows,
                key=lambda r: (r.get(field_name) is None, r.get(field_name)),
                reverse=reverse,
            )

        return rows

    def evaluate(
        self,
        sub_results: list[tuple[str, list[dict[str, Any]]]],  # list of (source_id, rows)
        join_steps: list[CrossDatabaseJoinStep],
        projections: list[ColumnRef] | None = None,
        filters: list[FilterPredicate] | None = None,
        order_by: list[SortExpression] | None = None,
        limit: int | None = 100,
        offset: int | None = 0,
    ) -> list[dict[str, Any]]:
        """Execute multi-way in-memory hash joins across heterogeneous sub-query result sets."""
        if not sub_results:
            return []

        # Start with primary source records
        results_by_source: dict[str, list[dict[str, Any]]] = dict(sub_results)

        # Identify primary relation (first sub-result)
        current_rows = list(sub_results[0][1])

        # Execute join steps sequentially
        for step in join_steps:
            right_rows = results_by_source.get(step.right_source_id)
            if right_rows is None:
                # Try matching by table name if qualified id differs
                right_rows = next(
                    (
                        rows
                        for sid, rows in results_by_source.items()
                        if step.right_source_id in sid
                    ),
                    [],
                )

            current_rows = self.hash_join(
                left_rows=current_rows,
                right_rows=right_rows,
                left_key=step.left_key,
                right_key=step.right_key,
                is_left_outer=False,
            )

        # Apply post-join filters if any
        if filters:
            for pred in filters:
                current_rows = self.apply_filter(current_rows, pred)

        # Apply sorting
        if order_by:
            current_rows = self.apply_sort(current_rows, order_by)

        # Apply offset and limit
        start_idx = offset or 0
        end_idx = start_idx + limit if limit is not None else None
        current_rows = current_rows[start_idx:end_idx]

        # Apply projections if specified
        if projections:
            final_rows: list[dict[str, Any]] = []
            for r in current_rows:
                projected_row: dict[str, Any] = {}
                for p in projections:
                    target_name = p.alias or p.column
                    val = r.get(p.column)
                    if val is None and p.table:
                        val = r.get(f"{p.table}.{p.column}")
                    projected_row[target_name] = val
                final_rows.append(projected_row)
            return final_rows

        return current_rows

    @staticmethod
    def infer_columns_metadata(rows: list[dict[str, Any]]) -> list[ExecutionColumnMetadata]:
        """Infer column metadata and types from normalized rows."""
        if not rows:
            return []

        # Preserve key order from first row
        column_names: list[str] = list(rows[0].keys())
        columns: list[ExecutionColumnMetadata] = []

        for col_name in column_names:
            sample_vals = [r.get(col_name) for r in rows[:100]]
            data_type = infer_data_type(sample_vals)
            columns.append(ExecutionColumnMetadata(name=col_name, data_type=data_type))

        return columns
