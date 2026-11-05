from typing import Any, Generic, TypeVar, cast

from pymongo.collection import Collection
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.base import AppBaseModel, utc_now

T = TypeVar("T", bound=AppBaseModel)


class BaseRepository(Generic[T]):
    """Generic repository providing typed persistence operations over a MongoDB collection."""

    def __init__(
        self, model_cls: type[T], collection_name: str, db: Database | None = None
    ) -> None:
        self.model_cls = model_cls
        self.collection_name = collection_name
        self._db = db

    @property
    def collection(self) -> Collection:
        db = self._db if self._db is not None else get_metadata_db()
        return db[self.collection_name]

    def create(self, entity: T) -> T:
        """Persist a new model document."""
        doc = entity.to_mongo()
        self.collection.insert_one(doc)
        return entity

    def get_by_id(self, entity_id: str) -> T | None:
        """Retrieve document by string ID."""
        doc = self.collection.find_one({"_id": entity_id})
        if not doc:
            return None
        return cast(T, self.model_cls.from_mongo(doc))

    def find_one(self, filter_query: dict[str, Any]) -> T | None:
        """Find single matching document."""
        doc = self.collection.find_one(filter_query)
        if not doc:
            return None
        return cast(T, self.model_cls.from_mongo(doc))

    def find(
        self,
        filter_query: dict[str, Any] | None = None,
        limit: int = 100,
        skip: int = 0,
        sort: list[tuple[str, int]] | None = None,
    ) -> list[T]:
        """Find matching documents with pagination and sorting."""
        query = filter_query or {}
        cursor = self.collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)

        return [cast(T, self.model_cls.from_mongo(doc)) for doc in cursor]

    def update(self, entity_id: str, update_data: dict[str, Any]) -> T | None:
        """Update fields on existing document."""
        data = dict(update_data)
        data["updated_at"] = utc_now()
        data.pop("id", None)
        data.pop("_id", None)

        res = self.collection.find_one_and_update(
            {"_id": entity_id},
            {"$set": data},
            return_document=True,
        )
        if not res:
            return None
        return cast(T, self.model_cls.from_mongo(res))

    def delete(self, entity_id: str) -> bool:
        """Delete document by ID."""
        res = self.collection.delete_one({"_id": entity_id})
        return res.deleted_count > 0

    def count(self, filter_query: dict[str, Any] | None = None) -> int:
        """Count documents matching filter."""
        return int(self.collection.count_documents(filter_query or {}))
