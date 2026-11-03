import hashlib
import json
from datetime import UTC
from typing import Any

from pydantic import Field

from app.models.base import AppBaseModel


class AuditEvent(AppBaseModel):
    """Immutable, cryptographically verifiable audit record for compliance and access monitoring."""

    workspace_id: str
    sequence: int = Field(default=1, description="Strictly monotonic sequence number for workspace")
    user_id: str | None = None
    action: str  # e.g., USER_LOGIN, CONNECTION_CREATED, SCHEMA_REFRESHED, QUERY_EXECUTED
    resource_type: str  # e.g., connection, conversation, query, workspace
    resource_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    ip_address: str | None = None
    status: str = "SUCCESS"  # SUCCESS, FAILED, DENIED
    previous_hash: str | None = None
    event_hash: str | None = None

    def compute_hash(self, prev_hash: str | None = None) -> str:
        """Compute SHA-256 fingerprint of event fields to guarantee tamper-evidence."""
        p_hash = prev_hash if prev_hash is not None else (self.previous_hash or "GENESIS")
        dt = self.created_at if self.created_at.tzinfo is not None else self.created_at.replace(tzinfo=UTC)
        ts_sec = int(dt.timestamp())
        payload = (
            f"{self.id}:{self.sequence}:{ts_sec}:{self.workspace_id}:{self.user_id or ''}:"
            f"{self.action}:{self.resource_type}:{self.resource_id or ''}:{self.status}:"
            f"{p_hash}:{json.dumps(self.details, sort_keys=True, default=str)}"
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
