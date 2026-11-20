from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import Field

from app.models.base import AppBaseModel


class DatabaseType(StrEnum):
    POSTGRESQL = "postgres"
    MONGODB = "mongodb"
    ELASTICSEARCH = "elasticsearch"


class ConnectionStatus(StrEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    CONNECTING = "connecting"
    ERROR = "error"


class DatabaseConnection(AppBaseModel):
    """Encrypted connection configuration to a target heterogeneous database."""

    workspace_id: str
    name: str = Field(min_length=2, max_length=100)
    db_type: DatabaseType

    # Common connection metadata
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None

    # Encrypted connection secrets (never stored or logged in plain text)
    encrypted_secret: str = ""

    # Connection options (SSL, timeout, etc.)
    options: dict[str, Any] = Field(default_factory=dict)

    status: ConnectionStatus = ConnectionStatus.OFFLINE
    status_message: str | None = None
    last_verified_at: datetime | None = None
    last_schema_refresh_at: datetime | None = None
    is_enabled: bool = True


class DatabaseConnectionCreate(AppBaseModel):
    name: str = Field(min_length=2, max_length=100)
    db_type: DatabaseType
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None
    uri: str | None = None
    options: dict[str, Any] = Field(default_factory=dict)


class DatabaseConnectionUpdate(AppBaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None
    uri: str | None = None
    is_enabled: bool | None = None
    options: dict[str, Any] | None = None


class DatabaseConnectionResponse(AppBaseModel):
    workspace_id: str
    name: str
    db_type: DatabaseType
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    status: ConnectionStatus
    status_message: str | None = None
    last_verified_at: datetime | None = None
    last_schema_refresh_at: datetime | None = None
    is_enabled: bool
