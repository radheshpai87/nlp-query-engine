from datetime import UTC
from typing import Any

from fastapi import Depends

from app.adapters.base import ConnectionTestResult
from app.adapters.factory import create_adapter
from app.core.exceptions import AppError, ResourceNotFoundError
from app.core.security import decrypt_secret, encrypt_secret
from app.models.connection import (
    ConnectionStatus,
    DatabaseConnection,
    DatabaseConnectionCreate,
    DatabaseConnectionResponse,
    DatabaseConnectionUpdate,
)
from app.repositories.connection_repository import ConnectionRepository, get_connection_repository
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository
from app.services.audit_service import AuditService, get_audit_service


def _workspace_matches(w1: str, w2: str) -> bool:
    return w1 == w2 or w1.replace("-", "_") == w2.replace("-", "_")


class ConnectionService:
    def __init__(
        self,
        connection_repo: ConnectionRepository | None = None,
        workspace_repo: WorkspaceRepository | None = None,
        audit_service: AuditService | None = None,
    ) -> None:
        self.connection_repo = connection_repo or ConnectionRepository()
        self.workspace_repo = workspace_repo or WorkspaceRepository()
        self.audit_service = audit_service or AuditService()

    def _to_response(self, conn: DatabaseConnection) -> DatabaseConnectionResponse:
        return DatabaseConnectionResponse(
            id=conn.id,
            workspace_id=conn.workspace_id,
            name=conn.name,
            db_type=conn.db_type,
            host=conn.host,
            port=conn.port,
            database=conn.database,
            username=conn.username,
            status=conn.status,
            status_message=conn.status_message,
            last_verified_at=conn.last_verified_at,
            last_schema_refresh_at=conn.last_schema_refresh_at,
            is_enabled=conn.is_enabled,
            created_at=conn.created_at,
            updated_at=conn.updated_at,
        )

    def list_connections(self, workspace_id: str) -> list[DatabaseConnectionResponse]:
        """List all active connections for a workspace with redacted credentials."""
        conns = self.connection_repo.get_by_workspace(workspace_id)
        return [self._to_response(c) for c in conns]

    def get_connection(self, workspace_id: str, connection_id: str) -> DatabaseConnectionResponse:
        conn = self.connection_repo.get_by_id(connection_id)
        if not conn or not _workspace_matches(conn.workspace_id, workspace_id):
            raise ResourceNotFoundError(f"Database connection '{connection_id}' not found")
        return self._to_response(conn)

    def create_connection(
        self,
        workspace_id: str,
        user_id: str,
        data: DatabaseConnectionCreate,
    ) -> DatabaseConnectionResponse:
        # Check duplicate name within workspace
        existing = self.connection_repo.get_by_workspace_and_name(workspace_id, data.name)
        if existing:
            raise AppError(f"A connection named '{data.name}' already exists in this workspace")

        # Determine secret to encrypt (password or URI)
        plain_secret = data.password or data.uri or ""
        options = dict(data.options)
        if data.uri:
            options["is_uri"] = True

        encrypted = encrypt_secret(plain_secret)

        conn = DatabaseConnection(
            workspace_id=workspace_id,
            name=data.name,
            db_type=data.db_type,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            encrypted_secret=encrypted,
            options=options,
            status=ConnectionStatus.CONNECTING,
        )
        created = self.connection_repo.create(conn)

        # Audit event
        self.audit_service.log_event(
            workspace_id=workspace_id,
            user_id=user_id,
            action="CONNECTION_CREATED",
            resource_type="connection",
            resource_id=created.id,
            details={
                "name": created.name,
                "db_type": created.db_type.value,
                "host": created.host or "custom_uri",
            },
        )

        # Automatically test connectivity in background
        self.test_connection(workspace_id, created.id)
        refreshed = self.connection_repo.get_by_id(created.id)
        return self._to_response(refreshed or created)

    def test_ephemeral_connection(self, data: DatabaseConnectionCreate) -> ConnectionTestResult:
        """Test database connection settings before saving."""
        plain_secret = data.password or data.uri or ""
        temp_conn = DatabaseConnection(
            workspace_id="ephemeral",
            name=data.name,
            db_type=data.db_type,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            options=data.options,
        )
        adapter = create_adapter(temp_conn, decrypted_secret=plain_secret)
        try:
            return adapter.test_connection()
        finally:
            adapter.close()

    def test_connection(self, workspace_id: str, connection_id: str) -> ConnectionTestResult:
        """Test existing saved connection and persist latest status."""
        conn = self.connection_repo.get_by_id(connection_id)
        if not conn or not _workspace_matches(conn.workspace_id, workspace_id):
            raise ResourceNotFoundError(f"Database connection '{connection_id}' not found")

        decrypted = decrypt_secret(conn.encrypted_secret)
        adapter = create_adapter(conn, decrypted_secret=decrypted)
        try:
            result = adapter.test_connection()
            new_status = ConnectionStatus.ONLINE if result.success else ConnectionStatus.ERROR
            from datetime import datetime

            self.connection_repo.update(
                conn.id,
                {
                    "status": new_status,
                    "status_message": result.error_message
                    or f"Connected ({result.server_version})",
                    "last_verified_at": datetime.now(UTC),
                },
            )
            return result
        finally:
            adapter.close()

    def update_connection(
        self,
        workspace_id: str,
        user_id: str,
        connection_id: str,
        data: DatabaseConnectionUpdate,
    ) -> DatabaseConnectionResponse:
        """Update connection configuration."""
        conn = self.connection_repo.get_by_id(connection_id)
        if not conn or not _workspace_matches(conn.workspace_id, workspace_id):
            raise ResourceNotFoundError(f"Database connection '{connection_id}' not found")

        updates: dict[str, Any] = {}
        if data.name is not None:
            updates["name"] = data.name.strip()
        if data.host is not None:
            updates["host"] = data.host.strip()
        if data.port is not None:
            updates["port"] = data.port
        if data.database is not None:
            updates["database"] = data.database.strip()
        if data.username is not None:
            updates["username"] = data.username.strip()
        if data.is_enabled is not None:
            updates["is_enabled"] = data.is_enabled
        if data.options is not None:
            updates["options"] = data.options

        new_secret = data.password or data.uri
        if new_secret:
            updates["encrypted_secret"] = encrypt_secret(new_secret)

        updated = self.connection_repo.update(conn.id, updates)
        if not updated:
            raise ResourceNotFoundError(f"Failed to update connection '{connection_id}'")

        self.audit_service.log_event(
            workspace_id=workspace_id,
            user_id=user_id,
            action="CONNECTION_UPDATED",
            resource_type="connection",
            resource_id=connection_id,
            details={"name": updated.name, "is_enabled": updated.is_enabled},
        )
        return self._to_response(updated)

    def delete_connection(self, workspace_id: str, user_id: str, connection_id: str) -> bool:
        """Delete connection and release associated resources."""
        conn = self.connection_repo.get_by_id(connection_id)
        if not conn or not _workspace_matches(conn.workspace_id, workspace_id):
            raise ResourceNotFoundError(f"Database connection '{connection_id}' not found")

        success = self.connection_repo.delete(connection_id)
        if success:
            self.audit_service.log_event(
                workspace_id=workspace_id,
                user_id=user_id,
                action="CONNECTION_DELETED",
                resource_type="connection",
                resource_id=connection_id,
                details={"name": conn.name, "db_type": conn.db_type.value},
            )
        return success


def get_connection_service(
    connection_repo: ConnectionRepository = Depends(get_connection_repository),
    workspace_repo: WorkspaceRepository = Depends(get_workspace_repository),
    audit_service: AuditService = Depends(get_audit_service),
) -> ConnectionService:
    return ConnectionService(
        connection_repo=connection_repo,
        workspace_repo=workspace_repo,
        audit_service=audit_service,
    )
