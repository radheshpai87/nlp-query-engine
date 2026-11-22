import json
import secrets
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


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        default_workspace_id=user.default_workspace_id,
        onboarding_completed=user.onboarding_completed,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        user, access_token, refresh_token = auth_service.register(user_in)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_user_response(user),
        )
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/login", response_model=TokenResponse)
def login(
    login_in: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        user, access_token, refresh_token = auth_service.authenticate(login_in.email, login_in.password)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_user_response(user),
        )
    except AppError as e:
        if "No account found" in e.message:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message) from e


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        user, access_token, refresh_token = auth_service.refresh_access_token(payload.refresh_token)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_user_response(user),
        )
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message) from e


@router.post("/logout")
def logout(
    payload: RefreshRequest | None = None,
    auth_service: AuthService = Depends(get_auth_service),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    auth_service.logout(
        refresh_token=payload.refresh_token if payload else None,
        user_id=current_user.id if not payload else None,
    )
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> Any:
    return _to_user_response(current_user)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> Any:
    try:
        user = auth_service.update_profile(current_user.id, user_in)
        return _to_user_response(user)
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/change-password")
def change_password(
    pwd_in: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, str]:
    try:
        auth_service.change_password(current_user.id, pwd_in.current_password, pwd_in.new_password)
        return {"status": "success", "message": "Password updated successfully"}
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, str]:
    token = auth_service.forgot_password(payload.email)
    return {
        "status": "success",
        "message": "If this email exists in our system, a password reset link has been dispatched.",
        "reset_token": token,
    }


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, str]:
    try:
        auth_service.reset_password(payload.token, payload.new_password)
        return {"status": "success", "message": "Password successfully reset. You may now sign in."}
    except AppError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.get("/oauth/config")
def oauth_config() -> dict[str, Any]:
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    return {
        "google": {
            "configured": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            "login_url": f"{base_url}/api/v1/auth/google/login",
            "redirect_uri": f"{base_url}/api/v1/auth/google/callback",
        },
        "github": {
            "configured": bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
            "login_url": f"{base_url}/api/v1/auth/github/login",
            "redirect_uri": f"{base_url}/api/v1/auth/github/callback",
        },
    }


@router.get("/google/login")
def google_login(mode: str = Query("login", description="login or signup")) -> RedirectResponse:
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    redirect_uri = f"{base_url}/api/v1/auth/google/callback"

    if not settings.GOOGLE_CLIENT_ID:
        target = "login" if mode == "login" else "register"
        return RedirectResponse(
            url=f"{base_url}/{target}?error=Google+OAuth+is+not+configured.+Please+set+GOOGLE_CLIENT_ID+and+GOOGLE_CLIENT_SECRET"
        )

    state = json.dumps({"mode": mode, "nonce": secrets.token_hex(8)})
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str | None = None,
    error: str | None = None,
    state: str | None = None,
    auth_service: AuthService = Depends(get_auth_service),
) -> RedirectResponse:
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")

    mode = "login"
    if state:
        try:
            parsed = json.loads(state)
            mode = parsed.get("mode", "login")
        except Exception:
            mode = "login"

    target_page = "login" if mode == "login" else "register"

    if error:
        return RedirectResponse(url=f"{base_url}/{target_page}?error=Google+login+failed:+{error}")

    if not code:
        return RedirectResponse(url=f"{base_url}/{target_page}?error=Missing+Google+authorization+code")

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
                return RedirectResponse(url=f"{base_url}/{target_page}?error=Failed+to+exchange+Google+code")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                return RedirectResponse(url=f"{base_url}/{target_page}?error=Failed+to+fetch+Google+profile")

            google_user = userinfo_resp.json()
            email = google_user.get("email")
            name = google_user.get("name") or email.split("@")[0]

            if not email:
                return RedirectResponse(url=f"{base_url}/{target_page}?error=Google+account+has+no+email")

            try:
                user, jwt_access, jwt_refresh = auth_service.authenticate_oauth(
                    email=email, full_name=name, provider="google", mode=mode
                )
            except AppError as e:
                return RedirectResponse(
                    url=f"{base_url}/register?error={urlencode({'e': e.message})[2:]}"
                )

            return RedirectResponse(
                url=f"{base_url}/login?token={jwt_access}&refresh_token={jwt_refresh}&success=true"
            )
    except Exception as e:
        return RedirectResponse(url=f"{base_url}/{target_page}?error=Google+login+exception:+{str(e)}")


@router.get("/github/login")
def github_login(mode: str = Query("login", description="login or signup")) -> RedirectResponse:
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    redirect_uri = f"{base_url}/api/v1/auth/github/callback"

    if not settings.GITHUB_CLIENT_ID:
        target = "login" if mode == "login" else "register"
        return RedirectResponse(
            url=f"{base_url}/{target}?error=GitHub+OAuth+is+not+configured.+Please+set+GITHUB_CLIENT_ID+and+GITHUB_CLIENT_SECRET"
        )

    state = json.dumps({"mode": mode, "nonce": secrets.token_hex(8)})
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }
    github_auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback")
async def github_callback(
    code: str | None = None,
    error: str | None = None,
    state: str | None = None,
    auth_service: AuthService = Depends(get_auth_service),
) -> RedirectResponse:
    settings = get_settings()
    base_url = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")

    mode = "login"
    if state:
        try:
            parsed = json.loads(state)
            mode = parsed.get("mode", "login")
        except Exception:
            mode = "login"

    target_page = "login" if mode == "login" else "register"

    if error:
        return RedirectResponse(url=f"{base_url}/{target_page}?error=GitHub+login+failed:+{error}")

    if not code:
        return RedirectResponse(url=f"{base_url}/{target_page}?error=Missing+GitHub+authorization+code")

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
                return RedirectResponse(url=f"{base_url}/{target_page}?error=Failed+to+exchange+GitHub+code")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return RedirectResponse(url=f"{base_url}/{target_page}?error=Failed+to+receive+GitHub+access+token")

            user_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "User-Agent": "NLP-Query-Engine",
                },
            )
            if user_resp.status_code != 200:
                return RedirectResponse(url=f"{base_url}/{target_page}?error=Failed+to+fetch+GitHub+profile")

            github_user = user_resp.json()
            name = github_user.get("name") or github_user.get("login") or "GitHub User"
            email = github_user.get("email")

            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                        "User-Agent": "NLP-Query-Engine",
                    },
                )
                if emails_resp.status_code == 200:
                    emails_data = emails_resp.json()
                    for em in emails_data:
                        if em.get("primary") and em.get("verified"):
                            email = em.get("email")
                            break
                    if not email and emails_data:
                        email = emails_data[0].get("email")

            if not email:
                return RedirectResponse(
                    url=f"{base_url}/{target_page}?error=Unable+to+retrieve+verified+email+from+GitHub"
                )

            try:
                user, jwt_access, jwt_refresh = auth_service.authenticate_oauth(
                    email=email, full_name=name, provider="github", mode=mode
                )
            except AppError as e:
                return RedirectResponse(
                    url=f"{base_url}/register?error={urlencode({'e': e.message})[2:]}"
                )

            return RedirectResponse(
                url=f"{base_url}/login?token={jwt_access}&refresh_token={jwt_refresh}&success=true"
            )
    except Exception as e:
        return RedirectResponse(url=f"{base_url}/{target_page}?error=GitHub+login+exception:+{str(e)}")
