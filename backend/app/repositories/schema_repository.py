from typing import Any, cast

from fastapi import Depends
from pymongo import DESCENDING
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.schema import SchemaSnapshot
from app.repositories.base import BaseRepository


class SchemaRepository(BaseRepository[SchemaSnapshot]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(SchemaSnapshot, "schema_snapshots", db=db)

    def get_latest_for_connection(
        self, workspace_id: str, connection_id: str
    ) -> SchemaSnapshot | None:
        """Fetch the most recent schema snapshot for a specific connection."""
        ws_ids = list({workspace_id, workspace_id.replace("-", "_"), workspace_id.replace("_", "-")})
        if workspace_id == "default":
            ws_ids.extend(["ws_default", "ws-default"])
        doc = self.collection.find_one(
            {"workspace_id": {"$in": ws_ids}, "connection_id": connection_id},
            sort=[("created_at", DESCENDING)],
        )
        if doc:
            return cast(SchemaSnapshot, self.model_cls.from_mongo(doc))
        return None

    def get_all_latest_for_workspace(self, workspace_id: str) -> list[SchemaSnapshot]:
        """Fetch the latest schema snapshot for each unique connection in the workspace."""
        ws_ids = list({workspace_id, workspace_id.replace("-", "_"), workspace_id.replace("_", "-")})
        if workspace_id == "default":
            ws_ids.extend(["ws_default", "ws-default"])
        pipeline: list[dict[str, Any]] = [
            {"$match": {"workspace_id": {"$in": ws_ids}}},
            {"$sort": {"created_at": DESCENDING}},
            {
                "$group": {
                    "_id": "$connection_id",
                    "latest_doc": {"$first": "$$ROOT"},
                }
            },
            {"$replaceRoot": {"newRoot": "$latest_doc"}},
        ]
        docs = list(self.collection.aggregate(pipeline))
        return [cast(SchemaSnapshot, self.model_cls.from_mongo(d)) for d in docs]

    def delete_by_connection(self, workspace_id: str, connection_id: str) -> int:
        result = self.collection.delete_many(
            {"workspace_id": workspace_id, "connection_id": connection_id}
        )
        return int(result.deleted_count)


def get_schema_repository(db: Database = Depends(get_metadata_db)) -> SchemaRepository:
    return SchemaRepository(db=db)
