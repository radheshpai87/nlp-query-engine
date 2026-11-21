from typing import Any
from fastapi import APIRouter, Depends, Query, status

from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.models.feedback import CreateFeedbackRequest, FeedbackLearningSummary, QueryFeedback
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.services.feedback_service import FeedbackService, get_feedback_service

router = APIRouter(prefix="/workspaces/{workspace_id}/feedback", tags=["feedback"])


@router.post("", response_model=QueryFeedback, status_code=status.HTTP_201_CREATED)
def submit_query_feedback(
    workspace_id: str,
    payload: CreateFeedbackRequest,
    current_user: User = Depends(get_current_user),
    service: FeedbackService = Depends(get_feedback_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> QueryFeedback:
    """Submit user feedback ('Right' or 'Not Right') with optional corrections for query learning."""
    return service.record_feedback(
        workspace_id=workspace_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.get("", response_model=list[QueryFeedback])
def list_workspace_feedback(
    workspace_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    _current_user: User = Depends(get_current_user),
    service: FeedbackService = Depends(get_feedback_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> list[QueryFeedback]:
    """Retrieve recorded query feedback history for a workspace."""
    return service.list_feedback(workspace_id=workspace_id, limit=limit)


@router.get("/learning-summary", response_model=FeedbackLearningSummary)
def get_feedback_learning_summary(
    workspace_id: str,
    _current_user: User = Depends(get_current_user),
    service: FeedbackService = Depends(get_feedback_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> FeedbackLearningSummary:
    """Retrieve aggregated accuracy and active learning rule statistics for continuous improvement."""
    return service.get_learning_summary(workspace_id=workspace_id)
