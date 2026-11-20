from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.auth import get_current_user
from app.core.exceptions import AppError
from app.models.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    User,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.auth_service import AuthService, get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        user, token = auth_service.register(user_in)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                default_workspace_id=user.default_workspace_id,
                onboarding_completed=user.onboarding_completed,
                created_at=user.created_at,
                updated_at=user.updated_at,
            ),
        )
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/login", response_model=TokenResponse)
def login(
    login_in: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        user, token = auth_service.authenticate(login_in.email, login_in.password)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                default_workspace_id=user.default_workspace_id,
                onboarding_completed=user.onboarding_completed,
                created_at=user.created_at,
                updated_at=user.updated_at,
            ),
        )
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message) from e


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> Any:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        default_workspace_id=current_user.default_workspace_id,
        onboarding_completed=current_user.onboarding_completed,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        updated = auth_service.update_profile(current_user.id, data)
        return UserResponse(
            id=updated.id,
            email=updated.email,
            full_name=updated.full_name,
            is_active=updated.is_active,
            is_superuser=updated.is_superuser,
            default_workspace_id=updated.default_workspace_id,
            onboarding_completed=updated.onboarding_completed,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        auth_service.change_password(current_user.id, data.current_password, data.new_password)
        return {"status": "success", "message": "Password changed successfully"}
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    reset_token = auth_service.forgot_password(data.email)
    return {
        "status": "success",
        "message": "If the account exists, a password reset link has been dispatched.",
        "reset_token": reset_token,
    }


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        auth_service.reset_password(data.token, data.new_password)
        return {"status": "success", "message": "Password has been reset successfully"}
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)) -> Any:
    return {"status": "success", "message": "Session invalidated"}
