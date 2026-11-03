import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class AppBaseModel(BaseModel):
    """Base application model with stable identifier and UTC timestamps."""

    id: str = Field(default_factory=generate_uuid)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    model_config = {
        "populate_by_name": True,
    }

    def to_mongo(self) -> dict[str, Any]:
        """Convert model to dictionary for MongoDB persistence, mapping id to _id."""
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(cls, data: dict[str, Any]) -> Any:
        """Instantiate model from MongoDB document, mapping _id to id."""
        if not data:
            return None
        doc = dict(data)
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        for k, v in doc.items():
            if isinstance(v, datetime) and v.tzinfo is None:
                doc[k] = v.replace(tzinfo=UTC)
        return cls(**doc)
