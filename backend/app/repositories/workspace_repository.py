from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.workspace import Workspace, WorkspaceMembership, WorkspaceRole
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(Workspace, "workspaces", db=db)
        self.membership_repo = BaseRepository[WorkspaceMembership](
            WorkspaceMembership, "workspace_memberships", db=db
        )

    def get_by_id(self, id: str) -> Workspace | None:
        if id == "default":
            ws = super().get_by_id("ws_default") or super().get_by_id("ws-default")
            if ws:
                return ws
        ws = super().get_by_id(id)
        if not ws and "-" in id:
            ws = super().get_by_id(id.replace("-", "_"))
        elif not ws and "_" in id:
            ws = super().get_by_id(id.replace("_", "-"))
        return ws

    def get_user_memberships(self, user_id: str) -> list[WorkspaceMembership]:
        """Retrieve all active memberships for a user."""
        return self.membership_repo.find({"user_id": user_id, "is_active": True})

    def get_membership(self, workspace_id: str, user_id: str) -> WorkspaceMembership | None:
        """Check user membership in a specific workspace."""
        if workspace_id == "default":
            membership = self.membership_repo.find_one(
                {"workspace_id": "ws_default", "user_id": user_id, "is_active": True}
            ) or self.membership_repo.find_one(
                {"workspace_id": "ws-default", "user_id": user_id, "is_active": True}
            )
            if membership:
                return membership
        membership = self.membership_repo.find_one(
            {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "is_active": True,
            }
        )
        if not membership and "-" in workspace_id:
            membership = self.membership_repo.find_one(
                {
                    "workspace_id": workspace_id.replace("-", "_"),
                    "user_id": user_id,
                    "is_active": True,
                }
            )
        elif not membership and "_" in workspace_id:
            membership = self.membership_repo.find_one(
                {
                    "workspace_id": workspace_id.replace("_", "-"),
                    "user_id": user_id,
                    "is_active": True,
                }
            )
        return membership

    def add_member(
        self,
        workspace_id: str,
        user_id: str,
        role: WorkspaceRole = WorkspaceRole.MEMBER,
    ) -> WorkspaceMembership:
        """Add or update workspace membership."""
        existing = self.membership_repo.find_one(
            {
                "workspace_id": workspace_id,
                "user_id": user_id,
            }
        )
        if existing:
            updated = self.membership_repo.update(existing.id, {"role": role, "is_active": True})
            return updated or existing

        membership = WorkspaceMembership(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
            is_active=True,
        )
        return self.membership_repo.create(membership)

    def remove_member(self, workspace_id: str, user_id: str) -> bool:
        """Deactivate workspace membership."""
        existing = self.get_membership(workspace_id, user_id)
        if not existing:
            return False
        return self.membership_repo.update(existing.id, {"is_active": False}) is not None

    def get_workspace_members(self, workspace_id: str) -> list[WorkspaceMembership]:
        """List active members in a workspace."""
        return self.membership_repo.find({"workspace_id": workspace_id, "is_active": True})


def get_workspace_repository(db: Database = Depends(get_metadata_db)) -> WorkspaceRepository:
    return WorkspaceRepository(db=db)
