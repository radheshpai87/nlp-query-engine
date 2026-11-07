from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from app.models.base import AppBaseModel


class ComparisonOperator(StrEnum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IN = "in"
    NOT_IN = "not_in"
    LIKE = "like"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"
    BETWEEN = "between"


class LogicalOperator(StrEnum):
    AND = "and"
    OR = "or"
    NOT = "not"


class AggregateFunction(StrEnum):
    COUNT = "count"
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"
    DISTINCT_COUNT = "distinct_count"


class SortDirection(StrEnum):
    ASC = "asc"
    DESC = "desc"


class JoinType(StrEnum):
    INNER = "inner"
    LEFT_OUTER = "left"
    RIGHT_OUTER = "right"
    CROSS = "cross"


class ColumnRef(BaseModel):
    table: str
    column: str
    connection_id: str | None = None
    alias: str | None = None

    @property
    def qualified_name(self) -> str:
        return f"{self.table}.{self.column}"


class FilterPredicate(BaseModel):
    field: ColumnRef
    operator: ComparisonOperator
    value: Any = None


class FilterExpression(BaseModel):
    logical_operator: LogicalOperator = LogicalOperator.AND
    predicates: list[FilterPredicate] = Field(default_factory=list)
    nested_expressions: list["FilterExpression"] = Field(default_factory=list)


class AggregateExpression(BaseModel):
    function: AggregateFunction
    field: ColumnRef | None = None  # None for COUNT(*)
    alias: str


class SortExpression(BaseModel):
    field: ColumnRef | str
    direction: SortDirection = SortDirection.ASC
    nulls_first: bool = False


class JoinCondition(BaseModel):
    left_field: ColumnRef
    right_field: ColumnRef
    operator: ComparisonOperator = ComparisonOperator.EQ


class SourceNode(BaseModel):
    connection_id: str
    source_name: str  # table, collection, or index name
    alias: str | None = None
    database_type: str | None = None

    @property
    def effective_alias(self) -> str:
        return self.alias or self.source_name


class JoinNode(BaseModel):
    left_source: str  # table name or alias
    right_source: SourceNode
    join_type: JoinType = JoinType.INNER
    conditions: list[JoinCondition] = Field(default_factory=list)
    is_cross_database: bool = False


class SafetyCheckResult(BaseModel):
    check_name: str
    passed: bool
    message: str


class PlanValidationResult(BaseModel):
    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    safety_checks: list[SafetyCheckResult] = Field(default_factory=list)
    target_connections: list[str] = Field(default_factory=list)
    is_cross_database: bool = False


class PlanExplanation(BaseModel):
    summary: str
    steps: list[str] = Field(default_factory=list)
    involved_sources: list[str] = Field(default_factory=list)
    involved_fields: list[str] = Field(default_factory=list)


class LogicalQueryPlan(AppBaseModel):
    """Database-agnostic typed logical query intermediate representation."""

    workspace_id: str
    query_text: str | None = None
    sources: list[SourceNode] = Field(min_length=1)
    joins: list[JoinNode] = Field(default_factory=list)
    projections: list[ColumnRef] = Field(default_factory=list)
    filters: list[FilterPredicate] = Field(default_factory=list)
    filter_expression: FilterExpression | None = None
    group_by: list[ColumnRef] = Field(default_factory=list)
    aggregations: list[AggregateExpression] = Field(default_factory=list)
    having: list[FilterPredicate] = Field(default_factory=list)
    order_by: list[SortExpression] = Field(default_factory=list)
    limit: int | None = 100
    offset: int | None = 0
    is_read_only: bool = True
    confidence: float = 1.0
