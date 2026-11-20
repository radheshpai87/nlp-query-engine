from datetime import datetime
from pydantic import EmailStr, Field

from app.models.base import AppBaseModel


class User(AppBaseModel):
    """User account entity."""

    email: EmailStr
    full_name: str
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    default_workspace_id: str | None = None
    onboarding_completed: bool = False
    reset_token: str | None = None
    reset_token_expires_at: datetime | None = None


class UserCreate(AppBaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)


class UserUpdate(AppBaseModel):
    full_name: str | None = None
    default_workspace_id: str | None = None
    onboarding_completed: bool | None = None


class ChangePasswordRequest(AppBaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ForgotPasswordRequest(AppBaseModel):
    email: EmailStr


class ResetPasswordRequest(AppBaseModel):
    token: str
    new_password: str = Field(min_length=8)


class UserResponse(AppBaseModel):
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool
    default_workspace_id: str | None = None
    onboarding_completed: bool = False
