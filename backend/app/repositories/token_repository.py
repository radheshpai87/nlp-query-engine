import hashlib
from datetime import UTC, datetime
from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.base import utc_now
from app.models.token import RefreshToken
from app.repositories.base import BaseRepository


def hash_token(raw_token: str) -> str:
    """Hash raw refresh token for safe storage at rest."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(RefreshToken, "refresh_tokens", db=db)

    def get_active_by_token(self, raw_token: str) -> RefreshToken | None:
        token_hash = hash_token(raw_token)
        now = datetime.now(UTC)
        doc = self.find_one({"token_hash": token_hash, "is_revoked": False})
        if doc and doc.expires_at > now:
            return doc
        return None

    def revoke_token(self, raw_token: str) -> None:
        token_hash = hash_token(raw_token)
        doc = self.find_one({"token_hash": token_hash})
        if doc:
            self.update(doc.id, {"is_revoked": True, "revoked_at": utc_now()})

    def revoke_all_for_user(self, user_id: str) -> None:
        self.collection.update_many(
            {"user_id": user_id, "is_revoked": False},
            {"$set": {"is_revoked": True, "revoked_at": utc_now()}},
        )


def get_refresh_token_repository(
    db: Database = Depends(get_metadata_db),
) -> RefreshTokenRepository:
    return RefreshTokenRepository(db=db)
