from typing import Any
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

from app.core.auth import get_current_user
from app.core.config import get_settings
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


# -----------------------------------------------------------------------------
# OAuth 2.0 (Google & GitHub)
# -----------------------------------------------------------------------------


@router.get("/oauth/config")
def get_oauth_config() -> Any:
    """Check which OAuth providers are configured and ready."""
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    google_configured = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)
    github_configured = bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)

    return {
        "google": {
            "configured": google_configured,
            "login_url": f"{base_url}/api/v1/auth/google/login",
            "redirect_uri": f"{base_url}/api/v1/auth/google/callback",
        },
        "github": {
            "configured": github_configured,
            "login_url": f"{base_url}/api/v1/auth/github/login",
            "redirect_uri": f"{base_url}/api/v1/auth/github/callback",
        },
    }


@router.get("/google/login")
def google_login() -> RedirectResponse:
    """Initiate Google OAuth 2.0 Authorization Code flow."""
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    redirect_uri = f"{base_url}/api/v1/auth/google/callback"

    if not settings.GOOGLE_CLIENT_ID:
        return RedirectResponse(
            url=f"{base_url}/login?error=Google+OAuth+is+not+configured.+Please+set+GOOGLE_CLIENT_ID+and+GOOGLE_CLIENT_SECRET"
        )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str | None = None,
    error: str | None = None,
    auth_service: AuthService = Depends(get_auth_service),
) -> RedirectResponse:
    """Handle Google OAuth 2.0 callback, exchange code for userinfo, and log in."""
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")

    if error:
        return RedirectResponse(url=f"{base_url}/login?error=Google+login+failed:+{error}")

    if not code:
        return RedirectResponse(url=f"{base_url}/login?error=Missing+Google+authorization+code")

    redirect_uri = f"{base_url}/api/v1/auth/google/callback"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            if token_resp.status_code != 200:
                return RedirectResponse(url=f"{base_url}/login?error=Failed+to+exchange+Google+code")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                return RedirectResponse(url=f"{base_url}/login?error=Failed+to+fetch+Google+profile")

            google_user = userinfo_resp.json()
            email = google_user.get("email")
            name = google_user.get("name") or email.split("@")[0]

            if not email:
                return RedirectResponse(url=f"{base_url}/login?error=Google+account+has+no+email")

            user, jwt_token = auth_service.authenticate_oauth(email=email, full_name=name, provider="google")
            return RedirectResponse(url=f"{base_url}/login?token={jwt_token}&success=true")
    except Exception as e:
        return RedirectResponse(url=f"{base_url}/login?error=Google+login+exception:+{str(e)}")


@router.get("/github/login")
def github_login() -> RedirectResponse:
    """Initiate GitHub OAuth 2.0 Authorization Code flow."""
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    redirect_uri = f"{base_url}/api/v1/auth/github/callback"

    if not settings.GITHUB_CLIENT_ID:
        return RedirectResponse(
            url=f"{base_url}/login?error=GitHub+OAuth+is+not+configured.+Please+set+GITHUB_CLIENT_ID+and+GITHUB_CLIENT_SECRET"
        )

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
    }
    github_auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback")
async def github_callback(
    code: str | None = None,
    error: str | None = None,
    auth_service: AuthService = Depends(get_auth_service),
) -> RedirectResponse:
    """Handle GitHub OAuth 2.0 callback, exchange code for userinfo, and log in."""
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")

    if error:
        return RedirectResponse(url=f"{base_url}/login?error=GitHub+login+failed:+{error}")

    if not code:
        return RedirectResponse(url=f"{base_url}/login?error=Missing+GitHub+authorization+code")

    redirect_uri = f"{base_url}/api/v1/auth/github/callback"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                return RedirectResponse(url=f"{base_url}/login?error=Failed+to+exchange+GitHub+code")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return RedirectResponse(url=f"{base_url}/login?error=GitHub+did+not+return+access+token")

            # Fetch user profile
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Nexus-Query-Engine",
                },
            )
            github_user = user_resp.json() if user_resp.status_code == 200 else {}

            # Fetch emails
            email_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Nexus-Query-Engine",
                },
            )
            emails = email_resp.json() if email_resp.status_code == 200 and isinstance(email_resp.json(), list) else []

            # Prioritize primary verified email
            primary_email = None
            for e in emails:
                if e.get("primary") and e.get("verified"):
                    primary_email = e.get("email")
                    break
            if not primary_email and emails:
                primary_email = emails[0].get("email")
            if not primary_email:
                primary_email = github_user.get("email")

            if not primary_email:
                return RedirectResponse(url=f"{base_url}/login?error=GitHub+account+has+no+verified+email")

            full_name = github_user.get("name") or github_user.get("login") or primary_email.split("@")[0]
            user, jwt_token = auth_service.authenticate_oauth(email=primary_email, full_name=full_name, provider="github")
            return RedirectResponse(url=f"{base_url}/login?token={jwt_token}&success=true")
    except Exception as e:
        return RedirectResponse(url=f"{base_url}/login?error=GitHub+login+exception:+{str(e)}")
