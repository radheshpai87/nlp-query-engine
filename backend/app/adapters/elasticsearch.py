import time
from typing import Any

from elasticsearch import Elasticsearch

from app.adapters.base import BaseDatabaseAdapter, ConnectionTestResult
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.core.security import redact_connection_string
from app.models.schema import (
    SchemaField,
    SchemaObject,
    SchemaSnapshot,
    compute_schema_fingerprint,
)

logger = setup_logging()


def _flatten_es_properties(props: dict[str, Any], prefix: str = "") -> list[SchemaField]:
    """Recursively flatten Elasticsearch properties into SchemaField definitions."""
    fields: list[SchemaField] = []
    for prop_name, prop_meta in props.items():
        full_name = f"{prefix}.{prop_name}" if prefix else prop_name
        if not isinstance(prop_meta, dict):
            continue

        prop_type = str(prop_meta.get("type", "object"))
        sub_props = prop_meta.get("properties")

        if sub_props and isinstance(sub_props, dict):
            # Include parent object descriptor and flattened sub-fields
            fields.append(
                SchemaField(
                    name=full_name,
                    data_type="object",
                    is_primary_key=False,
                    is_foreign_key=False,
                    is_nullable=True,
                )
            )
            fields.extend(_flatten_es_properties(sub_props, prefix=full_name))
        else:
            fields.append(
                SchemaField(
                    name=full_name,
                    data_type=prop_type,
                    is_primary_key=full_name == "_id",
                    is_foreign_key=False,
                    is_nullable=True,
                )
            )
    return fields


class ElasticsearchAdapter(BaseDatabaseAdapter):
    """Elasticsearch adapter using the official elasticsearch-py client."""

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
        self.endpoint = uri or f"http://{host or 'localhost'}:{port or 9200}"
        self.database = database or "default"
        self.user = user
        self.password = password
        self.options = options or {}
        self._client: Elasticsearch | None = None

    def _get_client(self) -> Elasticsearch:
        if self._client is None:
            kwargs: dict[str, Any] = {
                "hosts": [self.endpoint],
                "request_timeout": 5,
            }
            if self.user and self.password:
                kwargs["basic_auth"] = (self.user, self.password)
            elif "api_key" in self.options:
                kwargs["api_key"] = self.options["api_key"]

            self._client = Elasticsearch(**kwargs)
        return self._client

    def test_connection(self) -> ConnectionTestResult:
        start_time = time.perf_counter()
        try:
            client = self._get_client()
            info = client.info()
            version_info = info.get("version", {})
            number = version_info.get("number", "8.x")
            duration = (time.perf_counter() - start_time) * 1000
            return ConnectionTestResult(
                success=True,
                latency_ms=round(duration, 2),
                server_version=f"Elasticsearch v{number}",
                database_name=self.database,
            )
        except Exception as e:
            duration = (time.perf_counter() - start_time) * 1000
            sanitized_err = redact_connection_string(str(e))
            logger.warning("Elasticsearch connection test failed: %s", sanitized_err)
            return ConnectionTestResult(
                success=False,
                latency_ms=round(duration, 2),
                database_name=self.database,
                error_message=sanitized_err,
            )

    def get_metadata(self) -> dict[str, Any]:
        return {
            "adapter": "elasticsearch",
            "endpoint": self.endpoint,
            "read_only_enforced": True,
        }

    def discover_schema(self, workspace_id: str) -> SchemaSnapshot:
        """Introspect indices, mapping properties, and document counts."""
        try:
            client = self._get_client()
            mappings_dict = client.indices.get_mapping()

            objects: list[SchemaObject] = []
            for index_name, index_data in sorted(mappings_dict.items()):
                # Exclude internal system indices starting with '.'
                if index_name.startswith("."):
                    continue

                # Estimate document count
                doc_count: int | None = None
                try:
                    count_resp = client.count(index=index_name)
                    doc_count = int(count_resp.get("count", 0))
                except Exception:
                    doc_count = None

                mappings = index_data.get("mappings", {})
                props = mappings.get("properties", {})
                fields = _flatten_es_properties(props)

                # Always include _id field if not present
                if not any(f.name == "_id" for f in fields):
                    fields.insert(
                        0,
                        SchemaField(
                            name="_id",
                            data_type="keyword",
                            is_primary_key=True,
                            is_foreign_key=False,
                            is_nullable=False,
                        ),
                    )

                objects.append(
                    SchemaObject(
                        connection_id=self.connection_id,
                        name=index_name,
                        schema_name="elasticsearch",
                        object_type="index",
                        fields=fields,
                        relationships=[],
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
            logger.error("Elasticsearch schema discovery failed: %s", sanitized_err)
            raise RuntimeError(f"Elasticsearch schema discovery error: {sanitized_err}") from e

    def execute_query(
        self,
        query: Any,
        parameters: dict[str, Any] | None = None,
        limit: int = 1000,
        timeout_seconds: float = 30.0,
    ) -> list[dict[str, Any]]:
        """Safely execute a compiled read-only Elasticsearch search or aggregation query."""
        if hasattr(query, "index") and hasattr(query, "query_body"):
            index_name = query.index
            query_body = query.query_body
        elif isinstance(query, dict) and "index" in query and "query_body" in query:
            index_name = str(query["index"])
            query_body = dict(query["query_body"])
        else:
            raise AppError("Query must specify 'index' and 'query_body' dictionary.")

        # Safety: disallow scripts
        if "script" in str(query_body).lower() and not self.options.get("allow_scripts", False):
            raise AppError("Inline scripting is disallowed for security reasons.")

        try:
            client = self._get_client()
            search_client = (
                client.options(request_timeout=timeout_seconds)
                if hasattr(client, "options")
                else client
            )
            res = search_client.search(
                index=index_name,
                body=query_body,
            )

            # Case 1: Aggregations returned
            if "aggregations" in res:
                agg_rows: list[dict[str, Any]] = []
                for agg_key, agg_data in res["aggregations"].items():
                    if isinstance(agg_data, dict) and "buckets" in agg_data:
                        field_clean = agg_key.replace("group_by_", "")
                        for bucket in agg_data["buckets"]:
                            row: dict[str, Any] = {
                                field_clean: bucket.get("key"),
                                "count": bucket.get("doc_count"),
                            }
                            for sub_k, sub_v in bucket.items():
                                if sub_k in ("key", "doc_count", "key_as_string"):
                                    continue
                                if isinstance(sub_v, dict) and "value" in sub_v:
                                    row[sub_k] = sub_v["value"]
                                else:
                                    row[sub_k] = sub_v
                            agg_rows.append(row)
                    elif isinstance(agg_data, dict) and "value" in agg_data:
                        agg_rows.append({agg_key: agg_data["value"]})

                return agg_rows[:limit]

            # Case 2: Hits returned
            hits_data = res.get("hits", {}).get("hits", [])
            rows: list[dict[str, Any]] = []
            for hit in hits_data:
                row_dict = dict(hit.get("_source", {}))
                if "_id" not in row_dict:
                    row_dict["_id"] = hit.get("_id")
                rows.append(row_dict)
                if len(rows) >= limit:
                    break

            return rows
        except Exception as e:
            sanitized_err = redact_connection_string(str(e))
            logger.error("Elasticsearch query execution failed: %s", sanitized_err)
            raise RuntimeError(f"Elasticsearch execution error: {sanitized_err}") from e

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
