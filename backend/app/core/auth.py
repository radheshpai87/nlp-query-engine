from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings
from app.models.user import User
from app.models.workspace import WorkspaceMembership, WorkspaceRole
from app.repositories.user_repository import UserRepository, get_user_repository
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository

security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt directly."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create signed JWT access token."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta if expires_delta else timedelta(minutes=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return str(jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM))


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate JWT access token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return dict(payload)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    """FastAPI dependency to extract and authorize currently authenticated user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
        )

    user = user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated",
        )

    return user


def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """FastAPI dependency to authorize superuser/admin users."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource.",
        )
    return current_user


class WorkspacePermissionChecker:
    """Enforces workspace membership and role-based permissions."""

    def __init__(self, allowed_roles: list[WorkspaceRole] | None = None) -> None:
        self.allowed_roles = allowed_roles or [
            WorkspaceRole.ADMIN,
            WorkspaceRole.MEMBER,
            WorkspaceRole.VIEWER,
        ]

    def __call__(
        self,
        workspace_id: str,
        current_user: User = Depends(get_current_user),
        workspace_repo: WorkspaceRepository = Depends(get_workspace_repository),
    ) -> WorkspaceMembership:
        # Check workspace existence
        workspace = workspace_repo.get_by_id(workspace_id)
        if not workspace and workspace_id == "ws-default":
            workspace = workspace_repo.get_by_id("ws_default")
            if workspace:
                workspace_id = "ws_default"
        if not workspace or not workspace.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace '{workspace_id}' not found",
            )

        # Superusers bypass membership checks
        if current_user.is_superuser:
            return WorkspaceMembership(
                workspace_id=workspace_id,
                user_id=current_user.id,
                role=WorkspaceRole.ADMIN,
            )

        # Check membership
        membership = workspace_repo.get_membership(workspace_id, current_user.id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this workspace",
            )

        # Check role permission
        if membership.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role in [{', '.join(r.value for r in self.allowed_roles)}], but got '{membership.role.value}'",
            )

        return membership
