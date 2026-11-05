import time
from datetime import date, datetime
from typing import Any

from bson import ObjectId
from bson.decimal128 import Decimal128
from pymongo import MongoClient

from app.adapters.base import BaseDatabaseAdapter, ConnectionTestResult
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.core.security import redact_connection_string
from app.models.schema import (
    Cardinality,
    RelationshipProvenance,
    SchemaField,
    SchemaObject,
    SchemaRelationship,
    SchemaSnapshot,
    compute_schema_fingerprint,
)

logger = setup_logging()


def _infer_type(val: Any) -> str:
    """Infer high-level normalized type from BSON / Python value."""
    if val is None:
        return "null"
    if isinstance(val, bool):
        return "boolean"
    if isinstance(val, int):
        return "integer"
    if isinstance(val, float):
        return "float"
    if isinstance(val, ObjectId):
        return "objectId"
    if isinstance(val, datetime):
        return "datetime"
    if isinstance(val, list):
        return "array"
    if isinstance(val, dict):
        return "object"
    if isinstance(val, str):
        return "string"
    return "unknown"


class MongoAdapter(BaseDatabaseAdapter):
    """MongoDB adapter using PyMongo."""

    def __init__(
        self,
        connection_id: str,
        name: str,
        host: str | None = None,
        port: int | None = None,
        database: str | None = None,
        user: str | None = None,
        password: str | None = None,
        uri: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(connection_id, name)
        self.host = host or "localhost"
        self.port = port or 27017
        self.database = database or "test"
        self.user = user or ""
        self.password = password or ""
        self.uri = uri
        self.options = options or {}
        self._client: MongoClient | None = None

    def _get_client(self) -> MongoClient:
        if self._client is None:
            if self.uri:
                conn_uri = self.uri
            elif self.user and self.password:
                conn_uri = f"mongodb://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}?authSource=admin"
            else:
                conn_uri = f"mongodb://{self.host}:{self.port}/{self.database}"

            self._client = MongoClient(
                conn_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
        return self._client

    def test_connection(self) -> ConnectionTestResult:
        start_time = time.perf_counter()
        try:
            client = self._get_client()
            info = client.server_info()
            version = str(info.get("version", "MongoDB"))
            duration = (time.perf_counter() - start_time) * 1000
            return ConnectionTestResult(
                success=True,
                latency_ms=round(duration, 2),
                server_version=f"MongoDB v{version}",
                database_name=self.database,
            )
        except Exception as e:
            duration = (time.perf_counter() - start_time) * 1000
            sanitized_err = redact_connection_string(str(e))
            logger.warning("MongoDB connection test failed: %s", sanitized_err)
            return ConnectionTestResult(
                success=False,
                latency_ms=round(duration, 2),
                database_name=self.database,
                error_message=sanitized_err,
            )

    def get_metadata(self) -> dict[str, Any]:
        return {
            "adapter": "mongodb",
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "read_only_enforced": True,
        }

    def discover_schema(self, workspace_id: str) -> SchemaSnapshot:
        """Introspect collections, sample documents to infer field types, and detect references."""
        try:
            client = self._get_client()
            db = client[self.database]

            # List non-system collections
            collection_names = sorted(
                [c for c in db.list_collection_names() if not c.startswith("system.")]
            )
            objects: list[SchemaObject] = []

            for coll_name in collection_names:
                coll = db[coll_name]

                # Estimate document count
                doc_count: int | None = None
                try:
                    doc_count = coll.estimated_document_count()
                except Exception:
                    try:
                        doc_count = coll.count_documents({})
                    except Exception:
                        doc_count = None

                # Sample up to 50 documents
                sample_docs: list[dict[str, Any]] = list(coll.find().limit(50))

                # Track observed types and sample values per field
                field_types: dict[str, set[str]] = {}
                field_samples: dict[str, list[Any]] = {}
                total_sampled = len(sample_docs)
                field_presence_count: dict[str, int] = {}

                for doc in sample_docs:
                    for key, val in doc.items():
                        field_presence_count[key] = field_presence_count.get(key, 0) + 1
                        t = _infer_type(val)
                        field_types.setdefault(key, set()).add(t)

                        # Store up to 3 non-null sample values
                        if val is not None and key != "_id":
                            curr_samples = field_samples.setdefault(key, [])
                            sample_str = str(val)[:80]
                            if len(curr_samples) < 3 and sample_str not in curr_samples:
                                curr_samples.append(sample_str)

                # Ensure _id is present even if sample was empty
                if "_id" not in field_types:
                    field_types["_id"] = {"objectId"}

                # Build SchemaFields
                fields: list[SchemaField] = []
                for field_name in sorted(field_types.keys()):
                    types = field_types[field_name] - {"null"}
                    if not types:
                        final_type = "string"
                    elif len(types) == 1:
                        final_type = next(iter(types))
                    elif types == {"integer", "float"}:
                        final_type = "float"
                    else:
                        final_type = "mixed"

                    is_pk = field_name == "_id"
                    presence = field_presence_count.get(field_name, 0)
                    is_nullable = not is_pk and (
                        presence < total_sampled or "null" in field_types[field_name]
                    )

                    fields.append(
                        SchemaField(
                            name=field_name,
                            data_type=final_type,
                            is_primary_key=is_pk,
                            is_foreign_key=False,
                            is_nullable=is_nullable,
                            sample_values=field_samples.get(field_name, []),
                        )
                    )

                # Infer relationships based on naming conventions (e.g., user_id -> users / user)
                relationships: list[SchemaRelationship] = []
                for field in fields:
                    fname = field.name
                    if fname.endswith("_id") and fname != "_id":
                        target_singular = fname[:-3]
                        target_plural = f"{target_singular}s"
                        target_candidate = None
                        if target_plural in collection_names:
                            target_candidate = target_plural
                        elif target_singular in collection_names:
                            target_candidate = target_singular

                        if target_candidate and target_candidate != coll_name:
                            field.is_foreign_key = True
                            relationships.append(
                                SchemaRelationship(
                                    source_table=coll_name,
                                    source_fields=[fname],
                                    target_table=target_candidate,
                                    target_fields=["_id"],
                                    provenance=RelationshipProvenance.INFERRED,
                                    cardinality=Cardinality.MANY_TO_ONE,
                                    confidence=0.8,
                                )
                            )

                objects.append(
                    SchemaObject(
                        connection_id=self.connection_id,
                        name=coll_name,
                        schema_name=self.database,
                        object_type="collection",
                        fields=fields,
                        relationships=relationships,
                        row_count_estimate=doc_count,
                    )
                )

            fingerprint = compute_schema_fingerprint(objects)
            return SchemaSnapshot(
                workspace_id=workspace_id,
                connection_id=self.connection_id,
                fingerprint=fingerprint,
                objects=objects,
                total_objects=len(objects),
            )
        except Exception as e:
            sanitized_err = redact_connection_string(str(e))
            logger.error("MongoDB schema discovery failed: %s", sanitized_err)
            raise RuntimeError(f"MongoDB schema discovery error: {sanitized_err}") from e

    def execute_query(
        self,
        query: Any,
        parameters: dict[str, Any] | None = None,
        limit: int = 1000,
        timeout_seconds: float = 30.0,
    ) -> list[dict[str, Any]]:
        """Safely execute a compiled read-only MongoDB aggregation pipeline."""
        # 1. Extract collection name and pipeline
        if hasattr(query, "collection") and hasattr(query, "pipeline"):
            collection_name = query.collection
            pipeline = query.pipeline
        elif isinstance(query, dict) and "collection" in query and "pipeline" in query:
            collection_name = str(query["collection"])
            pipeline = list(query["pipeline"])
        else:
            raise AppError("Query must specify 'collection' and 'pipeline' list.")

        # 2. Strict read-only safety validation
        disallowed_stages = {"$out", "$merge", "$indexStats", "$planCacheStats", "$collStats"}
        for stage in pipeline:
            if not isinstance(stage, dict):
                continue
            for stage_key in stage.keys():
                if stage_key.lower() in disallowed_stages:
                    raise AppError(
                        f"Disallowed MongoDB aggregation stage '{stage_key}' detected. "
                        "Only read-only aggregation queries are permitted."
                    )

        # 3. Normalization helper
        def normalize_val(val: Any) -> Any:
            if val is None:
                return None
            if isinstance(val, ObjectId):
                return str(val)
            if isinstance(val, (datetime, date)):
                return val.isoformat()
            if isinstance(val, Decimal128):
                float_val = float(str(val))
                return int(float_val) if float_val.is_integer() else float_val
            if isinstance(val, bytes):
                return val.hex()
            if isinstance(val, list):
                return [normalize_val(item) for item in val]
            if isinstance(val, dict):
                return {k: normalize_val(v) for k, v in val.items()}
            return val

        # 4. Execute pipeline
        timeout_ms = max(int(timeout_seconds * 1000), 1000)
        try:
            client = self._get_client()
            db = client[self.database]
            coll = db[collection_name]

            cursor = coll.aggregate(pipeline, maxTimeMS=timeout_ms)
            results: list[dict[str, Any]] = []
            for doc in cursor:
                results.append({k: normalize_val(v) for k, v in doc.items()})
                if len(results) >= limit:
                    break

            return results
        except Exception as e:
            sanitized_err = redact_connection_string(str(e))
            logger.error("MongoDB query execution failed: %s", sanitized_err)
            raise RuntimeError(f"MongoDB execution error: {sanitized_err}") from e

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
