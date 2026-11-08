from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.adapters.base import ConnectionTestResult
from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.core.exceptions import AppError, ResourceNotFoundError
from app.models.connection import (
    DatabaseConnectionCreate,
    DatabaseConnectionResponse,
)
from app.models.user import User
from app.models.workspace import WorkspaceMembership, WorkspaceRole
from app.services.connection_service import ConnectionService, get_connection_service

router = APIRouter(prefix="/workspaces/{workspace_id}/connections", tags=["connections"])


@router.get("", response_model=list[DatabaseConnectionResponse])
def list_connections(
    workspace_id: str,
    connection_service: ConnectionService = Depends(get_connection_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    return connection_service.list_connections(workspace_id)


@router.post("", response_model=DatabaseConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(
    workspace_id: str,
    data: DatabaseConnectionCreate,
    current_user: User = Depends(get_current_user),
    connection_service: ConnectionService = Depends(get_connection_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
    ),
) -> Any:
    try:
        return connection_service.create_connection(
            workspace_id=workspace_id,
            user_id=current_user.id,
            data=data,
        )
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/test-ephemeral", response_model=ConnectionTestResult)
def test_ephemeral(
    workspace_id: str,
    data: DatabaseConnectionCreate,
    connection_service: ConnectionService = Depends(get_connection_service),
    _permission: WorkspaceMembership = Depends(
        WorkspacePermissionChecker([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
    ),
) -> Any:
    return connection_service.test_ephemeral_connection(data)


@router.get("/{connection_id}", response_model=DatabaseConnectionResponse)
def get_connection(
    workspace_id: str,
    connection_id: str,
    connection_service: ConnectionService = Depends(get_connection_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    try:
        return connection_service.get_connection(workspace_id, connection_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.post("/{connection_id}/test", response_model=ConnectionTestResult)
def test_connection(
    workspace_id: str,
    connection_id: str,
    connection_service: ConnectionService = Depends(get_connection_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    try:
        return connection_service.test_connection(workspace_id, connection_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.delete("/{connection_id}", status_code=status.HTTP_200_OK)
def delete_connection(
    workspace_id: str,
    connection_id: str,
    current_user: User = Depends(get_current_user),
    connection_service: ConnectionService = Depends(get_connection_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker([WorkspaceRole.ADMIN])),
) -> Any:
    try:
        success = connection_service.delete_connection(workspace_id, current_user.id, connection_id)
        return {"status": "success", "deleted": success, "connection_id": connection_id}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
