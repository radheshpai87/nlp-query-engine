from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.execution import QueryExecution
from app.repositories.base import BaseRepository


class ExecutionRepository(BaseRepository[QueryExecution]):
    """MongoDB repository for storing and querying query execution history."""

    def __init__(self, db: Database | None = None) -> None:
        super().__init__(QueryExecution, "query_executions", db=db)

    def get_by_workspace(
        self, workspace_id: str, limit: int = 50, skip: int = 0
    ) -> list[QueryExecution]:
        """Retrieve recent query execution records for a workspace, ordered by created_at DESC."""
        cursor = (
            self.collection.find({"workspace_id": workspace_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return [self.model_cls.from_mongo(doc) for doc in cursor]

    def get_by_id_and_workspace(
        self, workspace_id: str, execution_id: str
    ) -> QueryExecution | None:
        """Retrieve a specific execution trace by ID and workspace ID."""
        doc = self.collection.find_one({"_id": execution_id, "workspace_id": workspace_id})
        return self.model_cls.from_mongo(doc) if doc else None

    def count_by_workspace(self, workspace_id: str) -> int:
        """Count total query executions recorded in a workspace."""
        return self.collection.count_documents({"workspace_id": workspace_id})


def get_execution_repository(
    db: Database = Depends(get_metadata_db),
) -> ExecutionRepository:
    return ExecutionRepository(db)
