from app.engine.ir.models import (
    ColumnRef,
    LogicalQueryPlan,
    PlanValidationResult,
    SafetyCheckResult,
)
from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot, UserDefinedRelationship

DISALLOWED_WRITE_KEYWORDS = {
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "create",
    "replace",
    "grant",
    "revoke",
    "merge",
    "upsert",
}


class LogicalPlanValidator:
    """Validates that a LogicalQueryPlan is safe, read-only, and conforms to workspace schemas."""

    def __init__(
        self,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
        user_relationships: list[UserDefinedRelationship] | None = None,
        max_limit: int = 5000,
    ) -> None:
        self.connections = connections
        self.snapshots = snapshots
        self.user_relationships = user_relationships or []
        self.max_limit = max_limit

    def validate(self, plan: LogicalQueryPlan) -> PlanValidationResult:
        errors: list[str] = []
        warnings: list[str] = []
        safety_checks: list[SafetyCheckResult] = []

        # 1. Read-Only Safety Check
        is_read_only_clean = self._check_read_only_safety(plan, safety_checks, errors)

        # 2. Limit Safety Check
        self._check_limit(plan, safety_checks, warnings)

        # 3. Connection and Table Existence
        target_connections: set[str] = set()
        source_tables: dict[str, tuple[str, str]] = {}  # alias/name -> (conn_id, table_name)

        for src in plan.sources:
            target_connections.add(src.connection_id)
            alias = src.effective_alias
            source_tables[alias] = (src.connection_id, src.source_name)
            self._validate_source(src.connection_id, src.source_name, errors)

        # 4. Join Sources and Join Conditions
        is_cross_db = False
        for join in plan.joins:
            r_conn = join.right_source.connection_id
            r_name = join.right_source.source_name
            target_connections.add(r_conn)
            source_tables[join.right_source.effective_alias] = (r_conn, r_name)
            self._validate_source(r_conn, r_name, errors)

            # Check if left source is known
            if join.left_source not in source_tables:
                errors.append(
                    f"Join left source '{join.left_source}' is not defined in query plan sources."
                )

            # Check cross-database condition
            l_conn_info = source_tables.get(join.left_source)
            if l_conn_info and l_conn_info[0] != r_conn:
                is_cross_db = True
                join.is_cross_database = True

            # Validate join condition columns
            for cond in join.conditions:
                self._validate_column_ref(cond.left_field, source_tables, errors)
                self._validate_column_ref(cond.right_field, source_tables, errors)

        # 5. Validate Projections
        for proj in plan.projections:
            self._validate_column_ref(proj, source_tables, errors)

        # 6. Validate Filters
        for flt in plan.filters:
            self._validate_column_ref(flt.field, source_tables, errors)

        # 7. Validate Group By
        for grp in plan.group_by:
            self._validate_column_ref(grp, source_tables, errors)

        # 8. Validate Aggregations
        for agg in plan.aggregations:
            if agg.field:
                self._validate_column_ref(agg.field, source_tables, errors)
            if agg.multiplier:
                self._validate_column_ref(agg.multiplier, source_tables, errors)

        # 9. Validate Order By
        for order in plan.order_by:
            if isinstance(order.field, ColumnRef):
                self._validate_column_ref(order.field, source_tables, errors)

        is_valid = len(errors) == 0 and is_read_only_clean

        return PlanValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            safety_checks=safety_checks,
            target_connections=sorted(target_connections),
            is_cross_database=is_cross_db,
        )

    def _check_read_only_safety(
        self,
        plan: LogicalQueryPlan,
        safety_checks: list[SafetyCheckResult],
        errors: list[str],
    ) -> bool:
        if not plan.is_read_only:
            errors.append("Logical query plan must be strictly read-only (is_read_only=True).")
            safety_checks.append(
                SafetyCheckResult(
                    check_name="read_only_flag",
                    passed=False,
                    message="Plan is not marked as read-only.",
                )
            )
            return False

        # Scan for disallowed mutation keywords in sources or aliases
        dangerous_sources = {
            s.source_name.lower()
            for s in plan.sources
            if s.source_name.lower() in DISALLOWED_WRITE_KEYWORDS
        }
        if dangerous_sources:
            errors.append(f"Disallowed DDL/mutation keyword in source name: {dangerous_sources}")
            safety_checks.append(
                SafetyCheckResult(
                    check_name="keyword_mutation_check",
                    passed=False,
                    message=f"Disallowed DDL keyword detected: {dangerous_sources}",
                )
            )
            return False

        safety_checks.append(
            SafetyCheckResult(
                check_name="read_only_safety",
                passed=True,
                message="Plan is strictly read-only and free of DDL/DML mutations.",
            )
        )
        return True

    def _check_limit(
        self,
        plan: LogicalQueryPlan,
        safety_checks: list[SafetyCheckResult],
        warnings: list[str],
    ) -> None:
        if plan.limit is None:
            warnings.append(
                f"No row limit specified; defaulting to safety maximum ({self.max_limit})."
            )
            plan.limit = self.max_limit
            safety_checks.append(
                SafetyCheckResult(
                    check_name="row_limit_check",
                    passed=True,
                    message=f"Defaulted limit to {self.max_limit}.",
                )
            )
        elif plan.limit > self.max_limit:
            warnings.append(
                f"Requested limit {plan.limit} exceeded max ({self.max_limit}); capped."
            )
            plan.limit = self.max_limit
            safety_checks.append(
                SafetyCheckResult(
                    check_name="row_limit_check",
                    passed=True,
                    message=f"Capped limit to {self.max_limit}.",
                )
            )
        elif plan.limit <= 0:
            plan.limit = 100
            safety_checks.append(
                SafetyCheckResult(
                    check_name="row_limit_check",
                    passed=True,
                    message="Adjusted invalid limit <= 0 to 100.",
                )
            )
        else:
            safety_checks.append(
                SafetyCheckResult(
                    check_name="row_limit_check",
                    passed=True,
                    message=f"Row limit {plan.limit} is within safe operational bounds.",
                )
            )

    def _validate_source(self, connection_id: str, source_name: str, errors: list[str]) -> None:
        if connection_id not in self.connections:
            errors.append(f"Connection ID '{connection_id}' does not exist in workspace.")
            return

        snapshot = self.snapshots.get(connection_id)
        if not snapshot:
            errors.append(
                f"No schema snapshot discovered for connection '{connection_id}'. Refresh required."
            )
            return

        matching_obj = next((o for o in snapshot.objects if o.name == source_name), None)
        if not matching_obj:
            errors.append(
                f"Entity '{source_name}' does not exist in database '{self.connections[connection_id].name}'."
            )

    def _validate_column_ref(
        self,
        col: ColumnRef,
        source_tables: dict[str, tuple[str, str]],
        errors: list[str],
    ) -> None:
        # Check table / alias
        if col.table not in source_tables:
            errors.append(f"Table or alias '{col.table}' is not declared in query sources.")
            return

        conn_id, actual_table = source_tables[col.table]
        snapshot = self.snapshots.get(conn_id)
        if not snapshot:
            return

        obj = next((o for o in snapshot.objects if o.name == actual_table), None)
        if not obj:
            return

        # Special wildcard * or count(*)
        if col.column == "*":
            return

        col_exists = any(f.name == col.column for f in obj.fields)
        if not col_exists:
            errors.append(
                f"Field '{col.column}' does not exist in '{actual_table}' ({self.connections[conn_id].name})."
            )
