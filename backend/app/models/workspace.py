from enum import StrEnum

from pydantic import Field

from app.models.base import AppBaseModel


class WorkspaceRole(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Workspace(AppBaseModel):
    """Logical tenant workspace for database connections and queries."""

    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    owner_id: str
    is_active: bool = True


class WorkspaceMembership(AppBaseModel):
    """Relationship binding a User to a Workspace with a defined authorization Role."""

    workspace_id: str
    user_id: str
    role: WorkspaceRole = WorkspaceRole.MEMBER
    is_active: bool = True


class WorkspaceCreate(AppBaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None


class WorkspaceResponse(AppBaseModel):
    name: str
    description: str | None = None
    owner_id: str
    role: WorkspaceRole | None = None
