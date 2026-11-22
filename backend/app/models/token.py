from datetime import datetime
from pydantic import EmailStr, Field

from app.models.base import AppBaseModel


class RefreshToken(AppBaseModel):
    """Persisted refresh token session entity."""

    user_id: str
    token_hash: str
    expires_at: datetime
    is_revoked: bool = False
    revoked_at: datetime | None = None
    created_ip: str | None = None
    user_agent: str | None = None


class RefreshTokenRequest(AppBaseModel):
    """Request payload to exchange refresh token for new access token."""

    refresh_token: str


class TokenResponse(AppBaseModel):
    """Dual-token authentication response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, object]
