import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import Depends

from app.adapters.factory import create_adapter
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.core.security import QuerySecurityScanner, decrypt_secret, mask_records
from app.engine.compiler import MultiDialectCompiler
from app.engine.evaluator import CrossDatabaseEvaluator
from app.engine.generators.models import (
    CompilationResult,
    CompiledElasticsearchQuery,
    CompiledMongoQuery,
    CompiledSQLQuery,
    CrossDatabasePlan,
)
from app.engine.ir.models import LogicalQueryPlan
from app.engine.service import QueryPlanService, get_query_plan_service
from app.models.connection import DatabaseType
from app.models.execution import (
    ExecutionColumnMetadata,
    ExecutionResult,
    QueryExecution,
)
from app.repositories.connection_repository import (
    ConnectionRepository,
    get_connection_repository,
)
from app.repositories.execution_repository import (
    ExecutionRepository,
    get_execution_repository,
)
from app.services.audit_service import AuditService, get_audit_service

logger = setup_logging()

MAX_EXECUTION_ROWS = 1000
DEFAULT_TIMEOUT_SECONDS = 30.0


class ExecutionService:
    """Orchestrates safe query execution, federated in-memory joins, and execution history logging."""

    def __init__(
        self,
        connection_repo: ConnectionRepository,
        execution_repo: ExecutionRepository,
        plan_service: QueryPlanService,
        audit_service: AuditService,
    ) -> None:
        self.connection_repo = connection_repo
        self.execution_repo = execution_repo
        self.plan_service = plan_service
        self.audit_service = audit_service
        self.compiler = MultiDialectCompiler()
        self.evaluator = CrossDatabaseEvaluator()

    def _get_adapter_for_connection(self, connection_id: str) -> Any:
        conn = self.connection_repo.get_by_id(connection_id)
        if not conn:
            raise AppError(f"Target connection '{connection_id}' not found.")
        decrypted = decrypt_secret(conn.encrypted_secret) if conn.encrypted_secret else ""
        return create_adapter(conn, decrypted_secret=decrypted)

    def _security_scan_query(self, query_obj: Any) -> None:
        """Enforce strict read-only security policies on compiled AST/queries before execution."""
        if isinstance(query_obj, CompiledSQLQuery):
            check = QuerySecurityScanner.scan_sql(query_obj.sql)
        elif isinstance(query_obj, CompiledMongoQuery):
            check = QuerySecurityScanner.scan_mql(query_obj.pipeline)
        elif isinstance(query_obj, CompiledElasticsearchQuery):
            check = QuerySecurityScanner.scan_elasticsearch(query_obj.query_body)
        else:
            return

        if not check.passed:
            raise AppError(f"Security policy violation: {check.message}")

    def execute_plan(
        self,
        workspace_id: str,
        user_id: str,
        plan: LogicalQueryPlan,
        natural_query: str | None = None,
        conversation_id: str | None = None,
    ) -> ExecutionResult:
        """Validate, compile, safely execute, and normalize results of a logical plan."""
        start_time = time.perf_counter()

        # 1. Validate plan against workspace connections, schemas, and read-only checks
        validation = self.plan_service.validate_plan(workspace_id, plan)
        if not validation.is_valid:
            error_msg = (
                f"Logical query plan rejected by policy engine: {'; '.join(validation.errors)}"
            )
            self.execution_repo.create(
                QueryExecution(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    natural_query=natural_query or plan.query_text or "Unspecified query",
                    status="rejected",
                    error_message=error_msg,
                )
            )
            raise AppError(error_msg)

        # 2. Optimize and compile plan
        optimized_plan = self.plan_service.optimize_plan(plan)
        connections_list = self.connection_repo.get_by_workspace(workspace_id)
        connection_types: dict[str, DatabaseType] = {c.id: c.db_type for c in connections_list}

        compilation: CompilationResult = self.compiler.compile(optimized_plan, connection_types)

        rows: list[dict[str, Any]] = []
        columns: list[ExecutionColumnMetadata] = []
        generated_queries: dict[str, str] = {}
        target_connection_ids: list[str] = []
        execution_status = "success"
        error_message: str | None = None

        try:
            # 3A. Single Database Execution
            if not compilation.is_cross_database and compilation.single_query:
                query_obj = compilation.single_query
                conn_id = query_obj.connection_id
                target_connection_ids.append(conn_id)

                if isinstance(query_obj, CompiledSQLQuery):
                    generated_queries["postgres"] = query_obj.sql
                elif isinstance(query_obj, CompiledMongoQuery):
                    import json

                    generated_queries["mongodb"] = json.dumps(query_obj.pipeline)
                elif isinstance(query_obj, CompiledElasticsearchQuery):
                    import json

                    generated_queries["elasticsearch"] = json.dumps(query_obj.query_body)

                # Pre-execution security check
                self._security_scan_query(query_obj)

                adapter = self._get_adapter_for_connection(conn_id)
                try:
                    rows = adapter.execute_query(
                        query=query_obj,
                        limit=min(plan.limit or MAX_EXECUTION_ROWS, MAX_EXECUTION_ROWS),
                        timeout_seconds=DEFAULT_TIMEOUT_SECONDS,
                    )
                finally:
                    adapter.close()

                rows = mask_records(rows)
                columns = self.evaluator.infer_columns_metadata(rows)

            # 3B. Cross-Database Federated Execution
            elif compilation.is_cross_database and compilation.cross_database_plan:
                cross_plan: CrossDatabasePlan = compilation.cross_database_plan

                for idx, sub_q in enumerate(cross_plan.sub_queries):
                    self._security_scan_query(sub_q)
                    target_connection_ids.append(sub_q.connection_id)
                    key_name = f"{sub_q.dialect}_{idx + 1}"
                    if isinstance(sub_q, CompiledSQLQuery):
                        generated_queries[key_name] = sub_q.sql
                    else:
                        import json

                        body = getattr(sub_q, "pipeline", getattr(sub_q, "query_body", {}))
                        generated_queries[key_name] = json.dumps(body)

                def run_sub_query(sub_query: Any) -> tuple[str, list[dict[str, Any]]]:
                    adapter = self._get_adapter_for_connection(sub_query.connection_id)
                    try:
                        src_name = getattr(
                            sub_query,
                            "target_table",
                            getattr(sub_query, "collection", getattr(sub_query, "index", "")),
                        )
                        sub_rows = adapter.execute_query(
                            query=sub_query,
                            limit=MAX_EXECUTION_ROWS,
                            timeout_seconds=DEFAULT_TIMEOUT_SECONDS,
                        )
                        return src_name, sub_rows
                    finally:
                        adapter.close()

                # Execute pushdown sub-queries in parallel threads
                with ThreadPoolExecutor(max_workers=len(cross_plan.sub_queries)) as pool:
                    sub_results = list(pool.map(run_sub_query, cross_plan.sub_queries))

                # Evaluate in-memory Hash Join
                rows = self.evaluator.evaluate(
                    sub_results=sub_results,
                    join_steps=cross_plan.join_steps,
                    projections=optimized_plan.projections,
                    filters=optimized_plan.filters,
                    order_by=optimized_plan.order_by,
                    limit=min(optimized_plan.limit or MAX_EXECUTION_ROWS, MAX_EXECUTION_ROWS),
                    offset=optimized_plan.offset,
                )
                rows = mask_records(rows)
                columns = self.evaluator.infer_columns_metadata(rows)

        except Exception as e:
            execution_status = "failed"
            error_message = str(e)
            logger.error("Query execution error: %s", error_message)
            raise AppError(f"Query execution failed: {error_message}") from e

        finally:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # 4. Record execution history trace
            query_exec = self.execution_repo.create(
                QueryExecution(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    natural_query=natural_query or plan.query_text or "Interactive Query",
                    logical_plan=plan.model_dump(),
                    target_connection_ids=list(set(target_connection_ids)),
                    generated_syntax=generated_queries,
                    status=execution_status,
                    row_count=len(rows),
                    duration_ms=duration_ms,
                    error_message=error_message,
                )
            )

            # 5. Log audit event
            self.audit_service.log_event(
                workspace_id=workspace_id,
                user_id=user_id,
                action="query_execution",
                resource_type="query",
                resource_id=query_exec.id,
                details={
                    "row_count": len(rows),
                    "duration_ms": duration_ms,
                    "status": execution_status,
                    "is_cross_database": compilation.is_cross_database,
                },
            )

        return ExecutionResult(
            execution_id=query_exec.id,
            workspace_id=workspace_id,
            columns=columns,
            rows=rows,
            row_count=len(rows),
            duration_ms=duration_ms,
            is_truncated=len(rows) >= MAX_EXECUTION_ROWS,
            status=execution_status,
            error_message=error_message,
            sources_involved=[s.source_name for s in plan.sources],
            generated_queries=generated_queries,
        )

    def list_executions(
        self, workspace_id: str, limit: int = 50, skip: int = 0
    ) -> list[QueryExecution]:
        """List execution history records for workspace."""
        return self.execution_repo.get_by_workspace(workspace_id, limit=limit, skip=skip)

    def get_execution(self, workspace_id: str, execution_id: str) -> QueryExecution | None:
        """Get single execution trace by ID."""
        return self.execution_repo.get_by_id_and_workspace(workspace_id, execution_id)


def get_execution_service(
    connection_repo: ConnectionRepository = Depends(get_connection_repository),
    execution_repo: ExecutionRepository = Depends(get_execution_repository),
    plan_service: QueryPlanService = Depends(get_query_plan_service),
    audit_service: AuditService = Depends(get_audit_service),
) -> ExecutionService:
    return ExecutionService(
        connection_repo=connection_repo,
        execution_repo=execution_repo,
        plan_service=plan_service,
        audit_service=audit_service,
    )
