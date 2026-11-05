import re
from typing import Any

from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.audit import AuditEvent
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditEvent]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(AuditEvent, "audit_events", db=db)

    def get_by_workspace(self, workspace_id: str, limit: int = 100) -> list[AuditEvent]:
        return self.find(
            {"workspace_id": workspace_id},
            limit=limit,
            sort=[("sequence", -1)],
        )

    def get_last_event(self, workspace_id: str) -> AuditEvent | None:
        """Fetch the most recent event for hash chain linkage."""
        events = self.find(
            {"workspace_id": workspace_id},
            limit=1,
            sort=[("sequence", -1)],
        )
        return events[0] if events else None

    def get_chronological_events(self, workspace_id: str) -> list[AuditEvent]:
        """Fetch all workspace events in chronological order for chain verification."""
        return self.find(
            {"workspace_id": workspace_id},
            limit=10000,
            sort=[("sequence", 1)],
        )

    def query_events(
        self,
        workspace_id: str,
        action: str | None = None,
        resource_type: str | None = None,
        user_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        limit: int = 50,
        skip: int = 0,
    ) -> tuple[list[AuditEvent], int]:
        """Query audit events with multiple filter criteria and text search."""
        filter_query: dict[str, Any] = {"workspace_id": workspace_id}

        if action:
            filter_query["action"] = action
        if resource_type:
            filter_query["resource_type"] = resource_type
        if user_id:
            filter_query["user_id"] = user_id
        if status:
            filter_query["status"] = status

        if search:
            escaped = re.escape(search)
            pattern = {"$regex": escaped, "$options": "i"}
            filter_query["$or"] = [
                {"action": pattern},
                {"resource_type": pattern},
                {"resource_id": pattern},
                {"user_id": pattern},
                {"status": pattern},
            ]

        total = self.count(filter_query)
        items = self.find(
            filter_query,
            limit=limit,
            skip=skip,
            sort=[("sequence", -1)],
        )
        return items, total


def get_audit_repository(db: Database = Depends(get_metadata_db)) -> AuditRepository:
    return AuditRepository(db=db)
