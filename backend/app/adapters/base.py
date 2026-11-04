from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel

from app.models.schema import SchemaSnapshot


class ConnectionTestResult(BaseModel):
    """Result of a target database connectivity verification."""

    success: bool
    latency_ms: float = 0.0
    server_version: str | None = None
    database_name: str | None = None
    error_message: str | None = None


class BaseDatabaseAdapter(ABC):
    """Abstract contract for target heterogeneous database adapters."""

    def __init__(self, connection_id: str, name: str) -> None:
        self.connection_id = connection_id
        self.name = name

    @abstractmethod
    def test_connection(self) -> ConnectionTestResult:
        """Verify reachability, credentials, and basic read capabilities."""
        pass

    @abstractmethod
    def get_metadata(self) -> dict[str, Any]:
        """Retrieve target database system properties and capabilities."""
        pass

    @abstractmethod
    def discover_schema(self, workspace_id: str) -> SchemaSnapshot:
        """Introspect tables, collections, indices, fields, and relationships."""
        pass

    @abstractmethod
    def execute_query(
        self,
        query: Any,
        parameters: dict[str, Any] | None = None,
        limit: int = 1000,
        timeout_seconds: float = 30.0,
    ) -> list[dict[str, Any]]:
        """Safely execute a compiled read-only query and return normalized records."""
        pass

    @abstractmethod
    def close(self) -> None:
        """Release underlying client connections, connection pools, and sockets."""
        pass
