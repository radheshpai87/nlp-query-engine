from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class DialectType(StrEnum):
    POSTGRES = "postgres"
    MONGODB = "mongodb"
    ELASTICSEARCH = "elasticsearch"


class CompiledSQLQuery(BaseModel):
    dialect: DialectType = DialectType.POSTGRES
    connection_id: str
    target_table: str
    sql: str
    parameterized_sql: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    is_read_only: bool = True


class CompiledMongoQuery(BaseModel):
    dialect: DialectType = DialectType.MONGODB
    connection_id: str
    collection: str
    pipeline: list[dict[str, Any]]
    is_read_only: bool = True


class CompiledElasticsearchQuery(BaseModel):
    dialect: DialectType = DialectType.ELASTICSEARCH
    connection_id: str
    index: str
    query_body: dict[str, Any]
    is_read_only: bool = True


class JoinStrategyType(StrEnum):
    HASH_JOIN = "hash_join"
    NESTED_LOOP = "nested_loop"
    IN_MEMORY_MERGE = "in_memory_merge"


class CrossDatabaseJoinStep(BaseModel):
    left_source_id: str
    right_source_id: str
    left_key: str
    right_key: str
    strategy: JoinStrategyType = JoinStrategyType.HASH_JOIN


class CrossDatabasePlan(BaseModel):
    is_cross_database: bool = True
    sub_queries: list[CompiledSQLQuery | CompiledMongoQuery | CompiledElasticsearchQuery]
    join_steps: list[CrossDatabaseJoinStep] = Field(default_factory=list)
    limit: int | None = 100
    offset: int | None = 0


class CompilationResult(BaseModel):
    workspace_id: str
    is_cross_database: bool
    single_query: CompiledSQLQuery | CompiledMongoQuery | CompiledElasticsearchQuery | None = None
    cross_database_plan: CrossDatabasePlan | None = None
    dialect: DialectType | None = None
    summary: str
