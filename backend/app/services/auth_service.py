import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import Depends

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.exceptions import AppError
from app.models.token import RefreshToken
from app.models.user import User, UserCreate, UserUpdate
from app.models.workspace import Workspace, WorkspaceRole
from app.repositories.token_repository import (
    RefreshTokenRepository,
    get_refresh_token_repository,
    hash_token,
)
from app.repositories.user_repository import UserRepository, get_user_repository
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository

REFRESH_TOKEN_EXPIRE_DAYS = 30
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Standard secure access token lifetime


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository | None = None,
        workspace_repo: WorkspaceRepository | None = None,
        token_repo: RefreshTokenRepository | None = None,
    ) -> None:
        self.user_repo = user_repo or UserRepository()
        self.workspace_repo = workspace_repo or WorkspaceRepository()
        self.token_repo = token_repo or RefreshTokenRepository()

    def create_refresh_token(self, user_id: str) -> str:
        """Create and persist a hashed refresh token for the user."""
        raw_token = secrets.token_urlsafe(48)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_entity = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.token_repo.create(refresh_entity)
        return raw_token

    def register(self, user_in: UserCreate) -> tuple[User, str, str]:
        """Register a new user and create their initial default personal workspace."""
        normalized_email = user_in.email.lower().strip()
        existing = self.user_repo.get_by_email(normalized_email)
        if existing:
            raise AppError(f"User with email '{normalized_email}' already exists. Please sign in.")

        # Create user
        user = User(
            email=normalized_email,
            full_name=user_in.full_name,
            hashed_password=hash_password(user_in.password),
            onboarding_completed=False,
        )
        created_user = self.user_repo.create(user)

        # Create initial default workspace for the user
        initial_workspace = Workspace(
            name=f"{created_user.full_name}'s Workspace",
            description="Personal workspace",
            owner_id=created_user.id,
        )
        created_ws = self.workspace_repo.create(initial_workspace)

        # Bind as admin of personal workspace
        self.workspace_repo.add_member(
            workspace_id=created_ws.id,
            user_id=created_user.id,
            role=WorkspaceRole.ADMIN,
        )

        # Update user default workspace
        self.user_repo.update(created_user.id, {"default_workspace_id": created_ws.id})
        created_user.default_workspace_id = created_ws.id

        # Generate Access and Refresh Tokens
        access_token = create_access_token(
            {"sub": created_user.id, "email": created_user.email, "is_superuser": created_user.is_superuser},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = self.create_refresh_token(created_user.id)
        return created_user, access_token, refresh_token

    def authenticate(self, email: str, password: str) -> tuple[User, str, str]:
        """Verify user credentials and return authenticated user, access token and refresh token."""
        normalized_email = email.lower().strip()
        user = self.user_repo.get_by_email(normalized_email)
        if not user:
            raise AppError("No account found with this email. Please sign up first.")

        if not verify_password(password, user.hashed_password):
            raise AppError("Invalid email or password")

        if not user.is_active:
            raise AppError("User account is deactivated")

        access_token = create_access_token(
            {"sub": user.id, "email": user.email, "is_superuser": user.is_superuser},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = self.create_refresh_token(user.id)
        return user, access_token, refresh_token

    def authenticate_oauth(
        self,
        email: str,
        full_name: str,
        provider: str = "oauth",
        mode: str = "login",
    ) -> tuple[User, str, str]:
        """Authenticate or register a user logging in via an OAuth provider (Google or GitHub)."""
        normalized_email = email.lower().strip()
        user = self.user_repo.get_by_email(normalized_email)

        if user:
            if not user.is_active:
                raise AppError("User account is deactivated")
            if not user.full_name and full_name:
                self.user_repo.update(user.id, {"full_name": full_name})
                user.full_name = full_name
            access_token = create_access_token(
                {"sub": user.id, "email": user.email, "is_superuser": user.is_superuser},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            )
            refresh_token = self.create_refresh_token(user.id)
            return user, access_token, refresh_token

        # User does not exist
        if mode == "login":
            raise AppError("No account found with this email. Please sign up first.")

        # Register new OAuth user (mode == "signup")
        user = User(
            email=normalized_email,
            full_name=full_name or normalized_email.split("@")[0],
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            onboarding_completed=True,
        )
        created_user = self.user_repo.create(user)

        # Assign to default workspace if available or create a personal one
        default_ws = self.workspace_repo.get_by_id("ws_default")
        if default_ws:
            self.workspace_repo.add_member(
                workspace_id="ws_default",
                user_id=created_user.id,
                role=WorkspaceRole.MEMBER,
            )
            ws_id = "ws_default"
        else:
            initial_workspace = Workspace(
                name=f"{created_user.full_name}'s Workspace",
                description="Personal workspace",
                owner_id=created_user.id,
            )
            created_ws = self.workspace_repo.create(initial_workspace)
            self.workspace_repo.add_member(
                workspace_id=created_ws.id,
                user_id=created_user.id,
                role=WorkspaceRole.ADMIN,
            )
            ws_id = created_ws.id

        self.user_repo.update(created_user.id, {"default_workspace_id": ws_id})
        created_user.default_workspace_id = ws_id

        access_token = create_access_token(
            {"sub": created_user.id, "email": created_user.email, "is_superuser": created_user.is_superuser},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = self.create_refresh_token(created_user.id)
        return created_user, access_token, refresh_token

    def refresh_access_token(self, refresh_token: str) -> tuple[User, str, str]:
        """Validate refresh token and issue new access & rotated refresh token."""
        token_doc = self.token_repo.get_active_by_token(refresh_token)
        if not token_doc:
            raise AppError("Invalid or expired refresh token. Please sign in again.")

        user = self.user_repo.get_by_id(token_doc.user_id)
        if not user or not user.is_active:
            raise AppError("User account not found or deactivated.")

        # Rotate token: revoke old token
        self.token_repo.revoke_token(refresh_token)

        # Issue new token pair
        new_access_token = create_access_token(
            {"sub": user.id, "email": user.email, "is_superuser": user.is_superuser},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        new_refresh_token = self.create_refresh_token(user.id)
        return user, new_access_token, new_refresh_token

    def logout(self, refresh_token: str | None = None, user_id: str | None = None) -> None:
        """Revoke active refresh token or all user tokens."""
        if refresh_token:
            self.token_repo.revoke_token(refresh_token)
        elif user_id:
            self.token_repo.revoke_all_for_user(user_id)

    def forgot_password(self, email: str) -> str:
        """Generate secure password reset token (valid for 1 hour)."""
        normalized_email = email.lower().strip()
        user = self.user_repo.get_by_email(normalized_email)
        if not user or not user.is_active:
            return "simulated-reset-token-sent"

        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(hours=1)
        self.user_repo.update(
            user.id,
            {
                "reset_token": reset_token,
                "reset_token_expires_at": expires_at,
            },
        )
        return reset_token

    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password using valid token."""
        user = self.user_repo.find_one({"reset_token": token, "is_active": True})
        if not user:
            raise AppError("Invalid or expired password reset token")

        if user.reset_token_expires_at:
            exp = user.reset_token_expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=UTC)
            if datetime.now(UTC) > exp:
                raise AppError("Password reset token has expired. Please request a new one.")

        self.user_repo.update(
            user.id,
            {
                "hashed_password": hash_password(new_password),
                "reset_token": None,
                "reset_token_expires_at": None,
            },
        )
        return True

    def update_profile(self, user_id: str, data: UserUpdate) -> User:
        """Update user profile metadata."""
        update_dict: dict[str, Any] = {}
        if data.full_name is not None:
            update_dict["full_name"] = data.full_name.strip()
        if data.default_workspace_id is not None:
            update_dict["default_workspace_id"] = data.default_workspace_id
        if data.onboarding_completed is not None:
            update_dict["onboarding_completed"] = data.onboarding_completed

        if not update_dict:
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise AppError("User not found")
            return user

        updated = self.user_repo.update(user_id, update_dict)
        if not updated:
            raise AppError("User not found")
        return updated

    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Allow logged-in user to change their password."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise AppError("User not found")

        if not verify_password(current_password, user.hashed_password):
            raise AppError("Incorrect current password")

        self.user_repo.update(
            user.id,
            {"hashed_password": hash_password(new_password)},
        )
        return True


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    workspace_repo: WorkspaceRepository = Depends(get_workspace_repository),
    token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
) -> AuthService:
    return AuthService(user_repo=user_repo, workspace_repo=workspace_repo, token_repo=token_repo)
