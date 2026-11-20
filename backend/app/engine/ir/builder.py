from typing import Any

from app.engine.ir.models import (
    AggregateExpression,
    AggregateFunction,
    ColumnRef,
    ComparisonOperator,
    FilterPredicate,
    JoinCondition,
    JoinNode,
    JoinType,
    LogicalQueryPlan,
    SortDirection,
    SortExpression,
    SourceNode,
)


class LogicalPlanBuilder:
    """Fluent builder for constructing validated database-agnostic LogicalQueryPlans."""

    def __init__(self, workspace_id: str) -> None:
        self.workspace_id = workspace_id
        self.query_text: str | None = None
        self._sources: list[SourceNode] = []
        self._joins: list[JoinNode] = []
        self._projections: list[ColumnRef] = []
        self._filters: list[FilterPredicate] = []
        self._group_by: list[ColumnRef] = []
        self._aggregations: list[AggregateExpression] = []
        self._having: list[FilterPredicate] = []
        self._order_by: list[SortExpression] = []
        self._limit: int | None = 100
        self._offset: int | None = 0
        self._confidence: float = 1.0

    def from_source(
        self,
        connection_id: str,
        source_name: str,
        alias: str | None = None,
        database_type: str | None = None,
    ) -> "LogicalPlanBuilder":
        self._sources.append(
            SourceNode(
                connection_id=connection_id,
                source_name=source_name,
                alias=alias,
                database_type=database_type,
            )
        )
        return self

    def project(self, table: str, column: str, alias: str | None = None) -> "LogicalPlanBuilder":
        self._projections.append(ColumnRef(table=table, column=column, alias=alias))
        return self

    def filter(
        self,
        table: str,
        column: str,
        operator: ComparisonOperator | str,
        value: Any = None,
    ) -> "LogicalPlanBuilder":
        op = operator if isinstance(operator, ComparisonOperator) else ComparisonOperator(operator)
        self._filters.append(
            FilterPredicate(
                field=ColumnRef(table=table, column=column),
                operator=op,
                value=value,
            )
        )
        return self

    def join(
        self,
        right_connection_id: str,
        right_source_name: str,
        left_col: tuple[str, str],  # (table, column)
        right_col: tuple[str, str],  # (table, column)
        join_type: JoinType = JoinType.INNER,
        right_alias: str | None = None,
        is_cross_database: bool = False,
    ) -> "LogicalPlanBuilder":
        right_source = SourceNode(
            connection_id=right_connection_id,
            source_name=right_source_name,
            alias=right_alias,
        )
        condition = JoinCondition(
            left_field=ColumnRef(table=left_col[0], column=left_col[1]),
            right_field=ColumnRef(table=right_col[0], column=right_col[1]),
            operator=ComparisonOperator.EQ,
        )
        self._joins.append(
            JoinNode(
                left_source=left_col[0],
                right_source=right_source,
                join_type=join_type,
                conditions=[condition],
                is_cross_database=is_cross_database,
            )
        )
        return self

    def group_by(self, table: str, column: str) -> "LogicalPlanBuilder":
        self._group_by.append(ColumnRef(table=table, column=column))
        return self

    def aggregate(
        self,
        function: AggregateFunction | str,
        table: str | None,
        column: str | None,
        alias: str,
        multiplier: tuple[str, str] | None = None,
    ) -> "LogicalPlanBuilder":
        fn = function if isinstance(function, AggregateFunction) else AggregateFunction(function)
        col_ref = ColumnRef(table=table, column=column) if table and column else None
        multiplier_ref = (
            ColumnRef(table=multiplier[0], column=multiplier[1]) if multiplier else None
        )
        self._aggregations.append(
            AggregateExpression(
                function=fn,
                field=col_ref,
                multiplier=multiplier_ref,
                alias=alias,
            )
        )
        return self

    def having(
        self,
        table: str,
        column: str,
        operator: ComparisonOperator | str,
        value: Any = None,
    ) -> "LogicalPlanBuilder":
        op = operator if isinstance(operator, ComparisonOperator) else ComparisonOperator(operator)
        self._having.append(
            FilterPredicate(
                field=ColumnRef(table=table, column=column),
                operator=op,
                value=value,
            )
        )
        return self

    def sort(
        self,
        field: str | tuple[str, str],
        direction: SortDirection = SortDirection.ASC,
    ) -> "LogicalPlanBuilder":
        if isinstance(field, tuple):
            sort_field: ColumnRef | str = ColumnRef(table=field[0], column=field[1])
        else:
            sort_field = field

        self._order_by.append(SortExpression(field=sort_field, direction=direction))
        return self

    def limit(self, limit: int | None) -> "LogicalPlanBuilder":
        self._limit = limit
        return self

    def offset(self, offset: int | None) -> "LogicalPlanBuilder":
        self._offset = offset
        return self

    def set_query_text(self, text: str) -> "LogicalPlanBuilder":
        self.query_text = text
        return self

    def build(self) -> LogicalQueryPlan:
        if not self._sources:
            raise ValueError("Logical query plan must contain at least one source.")

        return LogicalQueryPlan(
            workspace_id=self.workspace_id,
            query_text=self.query_text,
            sources=list(self._sources),
            joins=list(self._joins),
            projections=list(self._projections),
            filters=list(self._filters),
            group_by=list(self._group_by),
            aggregations=list(self._aggregations),
            having=list(self._having),
            order_by=list(self._order_by),
            limit=self._limit,
            offset=self._offset,
            is_read_only=True,
            confidence=self._confidence,
        )
