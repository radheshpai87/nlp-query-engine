from typing import cast

from fastapi import Depends
from pymongo import DESCENDING
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.schema import UserDefinedRelationship
from app.repositories.base import BaseRepository


class RelationshipRepository(BaseRepository[UserDefinedRelationship]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(UserDefinedRelationship, "user_defined_relationships", db=db)

    def get_by_workspace(self, workspace_id: str) -> list[UserDefinedRelationship]:
        ws_ids = list({workspace_id, workspace_id.replace("-", "_"), workspace_id.replace("_", "-")})
        if workspace_id == "default":
            ws_ids.extend(["ws_default", "ws-default"])
        return self.find(
            {"workspace_id": {"$in": ws_ids}},
            sort=[("created_at", DESCENDING)],
        )

    def get_by_id_and_workspace(
        self, workspace_id: str, relationship_id: str
    ) -> UserDefinedRelationship | None:
        ws_ids = list({workspace_id, workspace_id.replace("-", "_"), workspace_id.replace("_", "-")})
        if workspace_id == "default":
            ws_ids.extend(["ws_default", "ws-default"])
        doc = self.collection.find_one({"_id": relationship_id, "workspace_id": {"$in": ws_ids}})
        if doc:
            return cast(UserDefinedRelationship, self.model_cls.from_mongo(doc))
        return None

    def delete_by_id_and_workspace(self, workspace_id: str, relationship_id: str) -> bool:
        ws_ids = list({workspace_id, workspace_id.replace("-", "_"), workspace_id.replace("_", "-")})
        if workspace_id == "default":
            ws_ids.extend(["ws_default", "ws-default"])
        result = self.collection.delete_one({"_id": relationship_id, "workspace_id": {"$in": ws_ids}})
        return result.deleted_count > 0


def get_relationship_repository(
    db: Database = Depends(get_metadata_db),
) -> RelationshipRepository:
    return RelationshipRepository(db=db)
