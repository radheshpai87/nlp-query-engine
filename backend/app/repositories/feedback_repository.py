from typing import Any
from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.feedback import QueryFeedback
from app.repositories.base import BaseRepository


class FeedbackRepository(BaseRepository[QueryFeedback]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(QueryFeedback, "query_feedback", db=db)

    @staticmethod
    def _workspace_filter(workspace_id: str) -> dict[str, Any] | str:
        if workspace_id in ("default", "ws_default", "ws-default"):
            return {"$in": ["ws_default", "ws-default", "default"]}
        return workspace_id

    def get_by_workspace(self, workspace_id: str, limit: int = 100) -> list[QueryFeedback]:
        query = {"workspace_id": self._workspace_filter(workspace_id)}
        return self.find(query, sort=[("created_at", -1)], limit=limit)

    def get_learning_examples(self, workspace_id: str, limit: int = 30) -> list[QueryFeedback]:
        """Fetch high-value positive and negative feedback instances to feed into Schema-RAG learning prompts."""
        query = {"workspace_id": self._workspace_filter(workspace_id)}
        return self.find(query, sort=[("created_at", -1)], limit=limit)


def get_feedback_repository(
    db: Database = Depends(get_metadata_db),
) -> FeedbackRepository:
    return FeedbackRepository(db=db)
