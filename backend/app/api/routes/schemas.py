from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.core.rate_limit import general_rate_limiter, rate_limit_dependency
from app.models.schema import (
    SchemaGraphResponse,
    SchemaSearchResult,
    SchemaSnapshot,
    UserDefinedRelationship,
    UserDefinedRelationshipCreate,
)
from app.models.user import User
from app.models.workspace import WorkspaceMembership, WorkspaceRole
from app.services.schema_service import SchemaService, get_schema_service

router = APIRouter(
    prefix="/workspaces/{workspace_id}/schemas",
    tags=["schemas"],
    dependencies=[Depends(rate_limit_dependency(general_rate_limiter))],
)


@router.get("", response_model=list[SchemaSnapshot])
def list_workspace_schemas(
    workspace_id: str,
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """List the latest schema snapshot for all connected databases in the workspace."""
    return schema_service.list_workspace_schemas(workspace_id)


@router.get("/graph", response_model=SchemaGraphResponse)
def get_schema_graph(
    workspace_id: str,
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Retrieve the unified schema graph (nodes, edges, statistics) across all databases."""
    return schema_service.get_schema_graph(workspace_id)


@router.get("/search", response_model=list[SchemaSearchResult])
def search_schema(
    workspace_id: str,
    q: str = Query(..., min_length=1, description="Search query string for tables or fields"),
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Search tables, collections, indices, and fields across all schemas in the workspace."""
    return schema_service.search_schema_objects(workspace_id, q)


# -------------------------------------------------------------
# User-Defined Relationships
# -------------------------------------------------------------


@router.get("/relationships", response_model=list[UserDefinedRelationship])
def list_relationships(
    workspace_id: str,
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """List all user-defined relationships in the workspace."""
    return schema_service.list_user_defined_relationships(workspace_id)


@router.post(
    "/relationships",
    response_model=UserDefinedRelationship,
    status_code=status.HTTP_201_CREATED,
)
def create_relationship(
    workspace_id: str,
    data: UserDefinedRelationshipCreate,
    current_user: User = Depends(get_current_user),
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
    ),
) -> Any:
    """Create a new user-defined relationship across tables or databases."""
    return schema_service.create_user_defined_relationship(
        workspace_id=workspace_id,
        data=data,
        user_id=current_user.id,
    )


@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    workspace_id: str,
    relationship_id: str,
    current_user: User = Depends(get_current_user),
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
    ),
) -> None:
    """Delete a user-defined relationship."""
    schema_service.delete_user_defined_relationship(
        workspace_id=workspace_id,
        relationship_id=relationship_id,
        user_id=current_user.id,
    )


# -------------------------------------------------------------
# Specific Connection Snapshot
# -------------------------------------------------------------


@router.get("/{connection_id}", response_model=SchemaSnapshot)
def get_connection_schema(
    workspace_id: str,
    connection_id: str,
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    """Retrieve the latest schema snapshot for a specific connection."""
    snapshot = schema_service.get_latest_snapshot(workspace_id, connection_id)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No schema snapshot found for this connection. Please trigger a refresh.",
        )
    return snapshot


@router.post("/{connection_id}/refresh", response_model=SchemaSnapshot)
def refresh_connection_schema(
    workspace_id: str,
    connection_id: str,
    current_user: User = Depends(get_current_user),
    schema_service: SchemaService = Depends(get_schema_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
    ),
) -> Any:
    """Trigger live re-introspection of the connected database and persist snapshot."""
    return schema_service.refresh_schema(
        workspace_id=workspace_id,
        connection_id=connection_id,
        user_id=current_user.id,
    )
