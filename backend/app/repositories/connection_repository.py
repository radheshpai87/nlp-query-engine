from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.connection import DatabaseConnection
from app.repositories.base import BaseRepository


class ConnectionRepository(BaseRepository[DatabaseConnection]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(DatabaseConnection, "connections", db=db)

    def get_by_id(self, id: str) -> DatabaseConnection | None:
        conn = super().get_by_id(id)
        if not conn:
            if "-" in id:
                conn = super().get_by_id(id.replace("-", "_"))
            elif "_" in id:
                conn = super().get_by_id(id.replace("_", "-"))
        if not conn:
            import re
            conn = self.find_one({"name": {"$regex": f"^{re.escape(id)}$", "$options": "i"}})
        return conn

    def get_by_workspace(self, workspace_id: str) -> list[DatabaseConnection]:
        ws_ids = list({workspace_id, workspace_id.replace("-", "_"), workspace_id.replace("_", "-")})
        if workspace_id in ("default", "ws_default", "ws-default"):
            ws_ids.extend(["ws_default", "ws-default", "default"])
        return self.find({"workspace_id": {"$in": ws_ids}, "is_enabled": True})

    def get_by_workspace_and_name(self, workspace_id: str, name: str) -> DatabaseConnection | None:
        conn = self.find_one({"workspace_id": workspace_id, "name": name})
        if not conn and "-" in workspace_id:
            conn = self.find_one({"workspace_id": workspace_id.replace("-", "_"), "name": name})
        elif not conn and "_" in workspace_id:
            conn = self.find_one({"workspace_id": workspace_id.replace("_", "-"), "name": name})
        return conn


def get_connection_repository(db: Database = Depends(get_metadata_db)) -> ConnectionRepository:
    return ConnectionRepository(db=db)
