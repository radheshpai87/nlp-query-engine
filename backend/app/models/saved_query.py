from typing import Any

from pydantic import Field

from app.models.base import AppBaseModel


class SavedQuery(AppBaseModel):
    """Reusable bookmarked natural language and parameterized query."""

    workspace_id: str
    user_id: str
    title: str = Field(min_length=2, max_length=120)
    description: str | None = None
    natural_query: str
    target_databases: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)
