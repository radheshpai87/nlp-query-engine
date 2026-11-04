from enum import StrEnum
from typing import Any

from pydantic import Field

from app.models.ambiguity import PendingClarification
from app.models.base import AppBaseModel


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(AppBaseModel):
    """Conversational turn message."""

    conversation_id: str
    role: MessageRole
    content: str
    clarification: PendingClarification | None = None
    query_plan: dict[str, Any] | None = None
    generated_query: str | None = None
    target_databases: list[str] = Field(default_factory=list)
    execution_result: dict[str, Any] | None = None
    duration_ms: float | None = None


class Conversation(AppBaseModel):
    """User conversation thread with state and history."""

    workspace_id: str
    user_id: str
    title: str = "New Conversation"
    is_archived: bool = False
    pending_clarification: PendingClarification | None = None
    active_query: str | None = None
    resolved_context: dict[str, Any] = Field(default_factory=dict)
