from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.conversation import Conversation, Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(Conversation, "conversations", db=db)
        self.message_repo = BaseRepository[Message](Message, "messages", db=db)

    @staticmethod
    def _workspace_filter(workspace_id: str) -> dict | str:
        if workspace_id in ("default", "ws_default", "ws-default"):
            return {"$in": ["ws_default", "ws-default", "default"]}
        return workspace_id

    def get_by_workspace(self, workspace_id: str, user_id: str | None = None) -> list[Conversation]:
        query: dict = {
            "workspace_id": self._workspace_filter(workspace_id),
            "is_archived": False,
        }
        if user_id:
            query["user_id"] = user_id
        return self.find(query, sort=[("updated_at", -1)])

    def add_message(self, message: Message) -> Message:
        return self.message_repo.create(message)

    def get_messages(self, conversation_id: str) -> list[Message]:
        return self.message_repo.find(
            {"conversation_id": conversation_id},
            sort=[("created_at", 1)],
            limit=500,
        )

    def delete_by_id_and_workspace(self, workspace_id: str, conversation_id: str) -> bool:
        conv = self.find_one({
            "_id": conversation_id,
            "workspace_id": self._workspace_filter(workspace_id),
        })
        if not conv:
            return False
        deleted = self.delete(conversation_id)
        if deleted:
            self.message_repo.collection.delete_many({"conversation_id": conversation_id})
        return deleted

    def update_title(self, conversation_id: str, title: str) -> Conversation | None:
        return self.update(conversation_id, {"title": title})


def get_conversation_repository(
    db: Database = Depends(get_metadata_db),
) -> ConversationRepository:
    return ConversationRepository(db=db)
