from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import WorkspacePermissionChecker
from app.core.rate_limit import execution_rate_limiter, rate_limit_dependency
from app.engine.ir.models import LogicalQueryPlan
from app.models.execution import (
    ExecutionResult,
    QueryExecution,
    QueryExecutionRequest,
)
from app.models.workspace import WorkspaceMembership
from app.services.execution_service import (
    ExecutionService,
    get_execution_service,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/query", tags=["query-execution"])


@router.post(
    "/execute",
    response_model=ExecutionResult,
    dependencies=[Depends(rate_limit_dependency(execution_rate_limiter))],
)
def execute_query(
    workspace_id: str,
    request: QueryExecutionRequest,
    execution_service: ExecutionService = Depends(get_execution_service),
    permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Execute a validated logical query plan across target database connections."""
    plan_dict = request.logical_plan
    if isinstance(plan_dict, dict):
        plan = LogicalQueryPlan.model_validate(plan_dict)
    elif isinstance(plan_dict, LogicalQueryPlan):
        plan = plan_dict
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid logical query plan format.",
        )

    return execution_service.execute_plan(
        workspace_id=workspace_id,
        user_id=permission.user_id,
        plan=plan,
        natural_query=request.natural_query,
        conversation_id=request.conversation_id,
    )


@router.get("/executions", response_model=list[QueryExecution])
def list_executions(
    workspace_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    execution_service: ExecutionService = Depends(get_execution_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """List execution history records for a workspace."""
    return execution_service.list_executions(workspace_id=workspace_id, limit=limit, skip=skip)


@router.get("/executions/{execution_id}", response_model=QueryExecution)
def get_execution(
    workspace_id: str,
    execution_id: str,
    execution_service: ExecutionService = Depends(get_execution_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Retrieve detailed execution trace by ID."""
    execution = execution_service.get_execution(
        workspace_id=workspace_id, execution_id=execution_id
    )
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution '{execution_id}' not found.",
        )
    return execution
