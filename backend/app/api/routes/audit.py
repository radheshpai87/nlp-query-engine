from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field

from app.core.auth import WorkspacePermissionChecker
from app.models.audit import AuditEvent
from app.models.workspace import WorkspaceMembership, WorkspaceRole
from app.services.audit_service import AuditService, get_audit_service

router = APIRouter(prefix="/workspaces/{workspace_id}/audit", tags=["audit"])


class AuditQueryResponse(BaseModel):
    items: list[AuditEvent]
    total: int
    limit: int
    skip: int


class AuditIntegrityResponse(BaseModel):
    is_valid: bool
    total_events_checked: int
    tampered_event_ids: list[str] = Field(default_factory=list)
    message: str


@router.get("", response_model=AuditQueryResponse)
def get_audit_trail(
    workspace_id: str,
    action: str | None = Query(default=None, description="Filter by event action name"),
    resource_type: str | None = Query(default=None, description="Filter by resource type"),
    user_id: str | None = Query(default=None, description="Filter by actor user ID"),
    status: str | None = Query(default=None, description="Filter by status (SUCCESS, FAILED, DENIED)"),
    search: str | None = Query(default=None, description="Text search across action, resource, or actor"),
    limit: int = Query(default=50, ge=1, le=500, description="Items per page"),
    skip: int = Query(default=0, ge=0, description="Offset"),
    audit_service: AuditService = Depends(get_audit_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
    ),
) -> AuditQueryResponse:
    """Retrieve filtered, paginated audit trail events for compliance governance."""
    items, total = audit_service.query_events(
        workspace_id=workspace_id,
        action=action,
        resource_type=resource_type,
        user_id=user_id,
        status=status,
        search=search,
        limit=limit,
        skip=skip,
    )
    return AuditQueryResponse(items=items, total=total, limit=limit, skip=skip)


@router.get("/integrity", response_model=AuditIntegrityResponse)
def verify_audit_integrity(
    workspace_id: str,
    audit_service: AuditService = Depends(get_audit_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN])
    ),
) -> Any:
    """Verify cryptographic hash-chain tamper-evidence across all recorded audit events."""
    return audit_service.verify_integrity(workspace_id=workspace_id)


@router.get("/export")
def export_audit_trail(
    workspace_id: str,
    format: str = Query(default="json", pattern="^(json|csv)$", description="Export file format"),
    audit_service: AuditService = Depends(get_audit_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN])
    ),
) -> Response:
    """Export workspace audit trail records as CSV or JSON document."""
    data = audit_service.export_events(workspace_id=workspace_id, export_format=format)
    media_type = "text/csv" if format == "csv" else "application/json"
    filename = f"audit_log_{workspace_id}.{format}"
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
