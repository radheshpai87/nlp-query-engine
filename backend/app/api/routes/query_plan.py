from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import WorkspacePermissionChecker
from app.core.rate_limit import ai_query_rate_limiter, rate_limit_dependency
from app.engine.generators.models import CompilationResult
from app.engine.ir.models import (
    LogicalQueryPlan,
    PlanExplanation,
    PlanValidationResult,
)
from app.engine.service import QueryPlanService, get_query_plan_service
from app.models.workspace import WorkspaceMembership
from app.nlp.providers.base import BaseLLMProvider
from app.nlp.providers.factory import get_llm_provider

router = APIRouter(
    prefix="/workspaces/{workspace_id}/query/plan",
    tags=["query-plan"],
    dependencies=[Depends(rate_limit_dependency(ai_query_rate_limiter))],
)


class SynthesizePlanRequest(BaseModel):
    query: str = Field(min_length=1, description="Natural language query string")
    resolved_context: dict[str, Any] | None = Field(
        default=None, description="Resolved ambiguity context"
    )


@router.post("/synthesize", response_model=LogicalQueryPlan)
def synthesize_plan(
    workspace_id: str,
    payload: SynthesizePlanRequest,
    plan_service: QueryPlanService = Depends(get_query_plan_service),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Synthesize a dynamic schema-grounded LogicalQueryPlan from a query and resolved context."""
    return plan_service.synthesize_plan(
        workspace_id=workspace_id,
        query=payload.query,
        resolved_context=payload.resolved_context,
        llm_provider=llm_provider,
    )


@router.post("/compile", response_model=CompilationResult)
def compile_plan(
    workspace_id: str,
    plan: LogicalQueryPlan,
    plan_service: QueryPlanService = Depends(get_query_plan_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Compile an optimized logical query plan into PostgreSQL SQL, MongoDB MQL, Elasticsearch DSL, or a cross-database plan."""
    return plan_service.compile_plan(workspace_id, plan)


@router.post("/validate", response_model=PlanValidationResult)
def validate_plan(
    workspace_id: str,
    plan: LogicalQueryPlan,
    plan_service: QueryPlanService = Depends(get_query_plan_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Validate a database-agnostic logical query plan against workspace schemas and read-only policies."""
    return plan_service.validate_plan(workspace_id, plan)


@router.post("/explain", response_model=PlanExplanation)
def explain_plan(
    workspace_id: str,
    plan: LogicalQueryPlan,
    plan_service: QueryPlanService = Depends(get_query_plan_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Produce a human-readable explanation and step-by-step pipeline from a logical plan."""
    return plan_service.explain_plan(plan)


@router.post("/optimize", response_model=LogicalQueryPlan)
def optimize_plan(
    workspace_id: str,
    plan: LogicalQueryPlan,
    plan_service: QueryPlanService = Depends(get_query_plan_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Apply optimization passes to a logical query plan."""
    return plan_service.optimize_plan(plan)
