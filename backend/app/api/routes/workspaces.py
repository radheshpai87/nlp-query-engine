from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.models.user import User
from app.models.workspace import (
    WorkspaceCreate,
    WorkspaceMembership,
    WorkspaceResponse,
    WorkspaceRole,
)
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository
from app.repositories.schema_repository import SchemaRepository, get_schema_repository
from app.nlp.suggested_queries import SuggestedQueriesGenerator
from app.nlp.providers.base import BaseLLMProvider
from app.nlp.providers.factory import get_llm_provider
from app.services.workspace_service import WorkspaceService, get_workspace_service

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class AddMemberRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER


class UpdateMemberRoleRequest(BaseModel):
    role: WorkspaceRole


class UpdateWorkspaceRequest(BaseModel):
    name: str | None = None
    description: str | None = None


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Any:
    return workspace_service.list_user_workspaces(current_user.id)


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Any:
    return workspace_service.create_workspace(current_user.id, data)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    try:
        return workspace_service.get_workspace_details(workspace_id, current_user.id)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message) from e
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: str,
    data: UpdateWorkspaceRequest,
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker([WorkspaceRole.ADMIN])),
) -> Any:
    try:
        return workspace_service.update_workspace(workspace_id, name=data.name, description=data.description)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.delete("/{workspace_id}", status_code=status.HTTP_200_OK)
def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker([WorkspaceRole.ADMIN])),
) -> Any:
    try:
        success = workspace_service.delete_workspace(workspace_id, requester_id=current_user.id)
        return {"status": "success", "workspace_id": workspace_id, "deleted": success}
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message) from e
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.post("/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    workspace_id: str,
    member_in: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker([WorkspaceRole.ADMIN])),
) -> Any:
    try:
        membership = workspace_service.add_user_to_workspace(
            workspace_id=workspace_id,
            user_email=member_in.email,
            role=member_in.role,
            requester_id=current_user.id,
        )
        return {
            "status": "success",
            "workspace_id": workspace_id,
            "user_id": membership.user_id,
            "role": membership.role,
        }
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message) from e
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.patch("/{workspace_id}/members/{user_id}")
def update_member_role(
    workspace_id: str,
    user_id: str,
    data: UpdateMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker([WorkspaceRole.ADMIN])),
) -> Any:
    try:
        membership = workspace_service.update_member_role(
            workspace_id=workspace_id,
            target_user_id=user_id,
            role=data.role,
            requester_id=current_user.id,
        )
        return {"status": "success", "workspace_id": workspace_id, "user_id": user_id, "role": membership.role}
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message) from e


@router.delete("/{workspace_id}/members/{user_id}")
def remove_member(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker([WorkspaceRole.ADMIN])),
) -> Any:
    try:
        success = workspace_service.remove_user_from_workspace(
            workspace_id=workspace_id,
            target_user_id=user_id,
            requester_id=current_user.id,
        )
        return {"status": "success", "workspace_id": workspace_id, "user_id": user_id, "removed": success}
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message) from e


@router.get("/{workspace_id}/members")
def list_members(
    workspace_id: str,
    workspace_repo: WorkspaceRepository = Depends(get_workspace_repository),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Any:
    members = workspace_repo.get_workspace_members(workspace_id)
    return [
        {
            "id": m.id,
            "user_id": m.user_id,
            "role": m.role,
            "created_at": m.created_at,
        }
        for m in members
    ]


@router.get("/{workspace_id}/suggested-queries", response_model=list[str])
def get_workspace_suggested_queries(
    workspace_id: str,
    _current_user: User = Depends(get_current_user),
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> list[str]:
    """Dynamically generate suggested queries from introspected database schemas and LLM synthesis."""
    snapshots = schema_repo.get_all_latest_for_workspace(workspace_id)
    generator = SuggestedQueriesGenerator(provider=llm_provider)
    return generator.generate(snapshots)

