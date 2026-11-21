from datetime import datetime, timezone
from typing import Any
from pydantic import Field

from app.models.base import AppBaseModel


class QueryFeedback(AppBaseModel):
    """User feedback on query plan generation, execution, and semantic interpretation."""

    workspace_id: str
    user_id: str
    query_text: str
    is_correct: bool  # True for "Right", False for "Not Right"
    conversation_id: str | None = None
    message_id: str | None = None
    category: str | None = None  # "accurate", "wrong_table", "wrong_filter", "wrong_aggregation", "syntax_error", "other"
    user_notes: str | None = None
    corrected_query: str | None = None
    generated_query: str | None = None
    generated_plan: dict[str, Any] | None = None
    target_databases: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateFeedbackRequest(AppBaseModel):
    query_text: str = Field(min_length=1, description="The original natural language query")
    is_correct: bool = Field(description="True if result was right, False if not right")
    conversation_id: str | None = None
    message_id: str | None = None
    category: str | None = Field(default=None, description="Category of error or confirmation")
    user_notes: str | None = Field(default=None, description="User explanation, notes, or expected behavior")
    corrected_query: str | None = Field(default=None, description="Expected SQL or query statement")
    generated_query: str | None = None
    generated_plan: dict[str, Any] | None = None
    target_databases: list[str] = Field(default_factory=list)


class FeedbackLearningSummary(AppBaseModel):
    total_feedback: int = 0
    positive_count: int = 0
    negative_count: int = 0
    accuracy_rate: float = 0.0
    common_issues: dict[str, int] = Field(default_factory=dict)
    active_learning_rules_count: int = 0
