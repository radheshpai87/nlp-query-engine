from fastapi import Depends

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.exceptions import AppError
from app.models.user import User, UserCreate
from app.models.workspace import Workspace, WorkspaceRole
from app.repositories.user_repository import UserRepository, get_user_repository
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository | None = None,
        workspace_repo: WorkspaceRepository | None = None,
    ) -> None:
        self.user_repo = user_repo or UserRepository()
        self.workspace_repo = workspace_repo or WorkspaceRepository()

    def register(self, user_in: UserCreate) -> tuple[User, str]:
        """Register a new user and create their initial default personal workspace."""
        normalized_email = user_in.email.lower().strip()
        existing = self.user_repo.get_by_email(normalized_email)
        if existing:
            raise AppError(f"User with email '{normalized_email}' already exists")

        # Create user
        user = User(
            email=normalized_email,
            full_name=user_in.full_name,
            hashed_password=hash_password(user_in.password),
        )
        created_user = self.user_repo.create(user)

        # Create initial default workspace for the user
        initial_workspace = Workspace(
            name=f"{created_user.full_name}'s Workspace",
            description="Personal workspace",
            owner_id=created_user.id,
        )
        created_ws = self.workspace_repo.create(initial_workspace)

        # Bind as admin
        self.workspace_repo.add_member(
            workspace_id=created_ws.id,
            user_id=created_user.id,
            role=WorkspaceRole.ADMIN,
        )

        # Update user default workspace
        self.user_repo.update(created_user.id, {"default_workspace_id": created_ws.id})
        created_user.default_workspace_id = created_ws.id

        # Generate JWT
        token = create_access_token({"sub": created_user.id, "email": created_user.email})
        return created_user, token

    def authenticate(self, email: str, password: str) -> tuple[User, str]:
        """Verify user credentials and return authenticated user and token."""
        normalized_email = email.lower().strip()
        user = self.user_repo.get_by_email(normalized_email)
        if not user or not verify_password(password, user.hashed_password):
            raise AppError("Invalid email or password")

        if not user.is_active:
            raise AppError("User account is deactivated")

        token = create_access_token({"sub": user.id, "email": user.email})
        return user, token


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    workspace_repo: WorkspaceRepository = Depends(get_workspace_repository),
) -> AuthService:
    return AuthService(user_repo=user_repo, workspace_repo=workspace_repo)
