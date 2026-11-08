from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.models.ambiguity import (
    AmbiguityEvaluationResult,
    ClarificationResolutionRequest,
    ClarificationResolutionResponse,
    PendingClarification,
)
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.services.ambiguity_service import (
    AmbiguityService,
    get_ambiguity_service,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/ambiguity", tags=["ambiguity"])


class EvaluateQueryRequest(BaseModel):
    query: str = Field(min_length=1, description="Natural language query string")
    resolved_context: dict[str, Any] | None = Field(
        default=None,
        description="Previously resolved parameters or active filters in the conversation",
    )


class ResolveClarificationPayload(BaseModel):
    request: ClarificationResolutionRequest
    pending_clarifications: list[PendingClarification] = Field(
        default_factory=list,
        description="Active pending clarifications list",
    )


@router.post("/evaluate", response_model=AmbiguityEvaluationResult)
def evaluate_query(
    workspace_id: str,
    payload: EvaluateQueryRequest,
    current_user: User = Depends(get_current_user),
    ambiguity_service: AmbiguityService = Depends(get_ambiguity_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Evaluate natural language query for vague predicates, ambiguous metrics, or multiple candidate sources."""
    return ambiguity_service.evaluate_query(
        workspace_id=workspace_id,
        query=payload.query,
        resolved_context=payload.resolved_context,
        user_id=current_user.id,
    )


@router.post("/resolve", response_model=ClarificationResolutionResponse)
def resolve_clarification(
    workspace_id: str,
    payload: ResolveClarificationPayload,
    current_user: User = Depends(get_current_user),
    ambiguity_service: AmbiguityService = Depends(get_ambiguity_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Resolve an interactive clarification question and update query parameters."""
    return ambiguity_service.resolve_clarification(
        workspace_id=workspace_id,
        request=payload.request,
        pending_clarifications=payload.pending_clarifications,
        user_id=current_user.id,
    )
