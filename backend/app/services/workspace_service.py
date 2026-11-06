from fastapi import Depends

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.models.workspace import (
    Workspace,
    WorkspaceCreate,
    WorkspaceMembership,
    WorkspaceResponse,
    WorkspaceRole,
)
from app.repositories.user_repository import UserRepository, get_user_repository
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository


class WorkspaceService:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository | None = None,
        user_repo: UserRepository | None = None,
    ) -> None:
        self.workspace_repo = workspace_repo or WorkspaceRepository()
        self.user_repo = user_repo or UserRepository()

    def list_user_workspaces(self, user_id: str) -> list[WorkspaceResponse]:
        """List all active workspaces the user belongs to, with their corresponding role."""
        memberships = self.workspace_repo.get_user_memberships(user_id)
        result: list[WorkspaceResponse] = []
        for m in memberships:
            ws = self.workspace_repo.get_by_id(m.workspace_id)
            if ws and ws.is_active:
                result.append(
                    WorkspaceResponse(
                        id=ws.id,
                        name=ws.name,
                        description=ws.description,
                        owner_id=ws.owner_id,
                        role=m.role,
                        created_at=ws.created_at,
                        updated_at=ws.updated_at,
                    )
                )
        return result

    def create_workspace(self, user_id: str, data: WorkspaceCreate) -> WorkspaceResponse:
        """Create a new workspace and designate creator as admin."""
        ws = Workspace(
            name=data.name,
            description=data.description,
            owner_id=user_id,
        )
        created = self.workspace_repo.create(ws)
        self.workspace_repo.add_member(
            workspace_id=created.id,
            user_id=user_id,
            role=WorkspaceRole.ADMIN,
        )
        return WorkspaceResponse(
            id=created.id,
            name=created.name,
            description=created.description,
            owner_id=created.owner_id,
            role=WorkspaceRole.ADMIN,
            created_at=created.created_at,
            updated_at=created.updated_at,
        )

    def get_workspace_details(self, workspace_id: str, user_id: str) -> WorkspaceResponse:
        """Retrieve workspace details ensuring caller has active membership."""
        membership = self.workspace_repo.get_membership(workspace_id, user_id)
        if not membership:
            raise AuthorizationError(f"Access denied to workspace '{workspace_id}'")

        ws = self.workspace_repo.get_by_id(workspace_id)
        if not ws or not ws.is_active:
            raise ResourceNotFoundError(f"Workspace '{workspace_id}' not found")

        return WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            description=ws.description,
            owner_id=ws.owner_id,
            role=membership.role,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
        )

    def add_user_to_workspace(
        self,
        workspace_id: str,
        user_email: str,
        role: WorkspaceRole,
        requester_id: str,
    ) -> WorkspaceMembership:
        """Add user by email to workspace (requires ADMIN role)."""
        requester_membership = self.workspace_repo.get_membership(workspace_id, requester_id)
        if not requester_membership or requester_membership.role != WorkspaceRole.ADMIN:
            raise AuthorizationError("Only workspace admins can manage membership")

        target_user = self.user_repo.get_by_email(user_email.lower().strip())
        if not target_user:
            raise ResourceNotFoundError(f"User with email '{user_email}' not found")

        return self.workspace_repo.add_member(workspace_id, target_user.id, role=role)


def get_workspace_service(
    workspace_repo: WorkspaceRepository = Depends(get_workspace_repository),
    user_repo: UserRepository = Depends(get_user_repository),
) -> WorkspaceService:
    return WorkspaceService(workspace_repo=workspace_repo, user_repo=user_repo)
