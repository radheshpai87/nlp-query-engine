from typing import Any

from pydantic import Field

from app.models.base import AppBaseModel


class QueryPlan(AppBaseModel):
    """Database-agnostic typed logical query intermediate representation."""

    entities: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    filters: list[dict[str, Any]] = Field(default_factory=list)
    aggregations: list[dict[str, Any]] = Field(default_factory=list)
    order_by: list[dict[str, Any]] = Field(default_factory=list)
    limit: int = 100
    target_databases: list[str] = Field(default_factory=list)
    confidence: float = 1.0


class QueryExecution(AppBaseModel):
    """Historical execution trace of an approved query."""

    workspace_id: str
    user_id: str
    conversation_id: str | None = None
    natural_query: str
    logical_plan: dict[str, Any] | QueryPlan | None = None
    target_connection_ids: list[str] = Field(default_factory=list)
    generated_syntax: dict[str, str] = Field(default_factory=dict)
    status: str = "success"  # success, failed, timeout, rejected
    row_count: int = 0
    duration_ms: float = 0.0
    error_message: str | None = None


class ExecutionColumnMetadata(AppBaseModel):
    """Metadata describing a single column in an execution result set."""

    name: str
    data_type: str = "string"


class ExecutionResult(AppBaseModel):
    """Normalized tabular result returned from query execution."""

    execution_id: str
    workspace_id: str
    columns: list[ExecutionColumnMetadata] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    duration_ms: float = 0.0
    is_truncated: bool = False
    status: str = "success"
    error_message: str | None = None
    sources_involved: list[str] = Field(default_factory=list)
    generated_queries: dict[str, str] = Field(default_factory=dict)


class QueryExecutionRequest(AppBaseModel):
    """Request payload to execute a logical plan."""

    logical_plan: dict[str, Any] | Any
    natural_query: str | None = None
    conversation_id: str | None = None
