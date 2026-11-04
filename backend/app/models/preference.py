from typing import Any

from pydantic import Field

from app.models.base import AppBaseModel


class UserPreference(AppBaseModel):
    """User UI and interaction preferences."""

    user_id: str
    theme: str = "system"  # light, dark, system
    default_export_format: str = "csv"  # csv, json
    compact_canvas: bool = False
    custom_settings: dict[str, Any] = Field(default_factory=dict)
