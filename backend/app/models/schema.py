import hashlib
import json
from enum import StrEnum
from typing import Any

from pydantic import Field

from app.models.base import AppBaseModel


class RelationshipProvenance(StrEnum):
    FOREIGN_KEY = "foreign_key"
    INFERRED = "inferred"
    USER_DEFINED = "user_defined"


class Cardinality(StrEnum):
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_ONE = "many_to_one"
    MANY_TO_MANY = "many_to_many"
    UNKNOWN = "unknown"


class SchemaField(AppBaseModel):
    name: str
    data_type: str
    is_primary_key: bool = False
    is_foreign_key: bool = False
    is_nullable: bool = True
    description: str | None = None
    sample_values: list[Any] = Field(default_factory=list)


class SchemaRelationship(AppBaseModel):
    source_table: str
    source_fields: list[str]
    target_table: str
    target_fields: list[str]
    provenance: RelationshipProvenance = RelationshipProvenance.FOREIGN_KEY
    cardinality: Cardinality = Cardinality.UNKNOWN
    confidence: float = 1.0


class SchemaObject(AppBaseModel):
    connection_id: str
    name: str
    schema_name: str | None = "public"
    object_type: str = "table"  # table, view, collection, index
    description: str | None = None
    fields: list[SchemaField] = Field(default_factory=list)
    relationships: list[SchemaRelationship] = Field(default_factory=list)
    row_count_estimate: int | None = None


class SchemaSnapshot(AppBaseModel):
    workspace_id: str
    connection_id: str
    fingerprint: str
    objects: list[SchemaObject] = Field(default_factory=list)
    total_objects: int = 0


class SchemaSearchResult(AppBaseModel):
    connection_id: str
    connection_name: str | None = None
    object_name: str
    object_type: str
    field_name: str | None = None
    data_type: str | None = None
    match_type: str  # "object" or "field"
    snippet: str | None = None


class UserDefinedRelationshipCreate(AppBaseModel):
    name: str | None = None
    source_connection_id: str
    source_table: str
    source_fields: list[str] = Field(min_length=1)
    target_connection_id: str
    target_table: str
    target_fields: list[str] = Field(min_length=1)
    cardinality: Cardinality = Cardinality.MANY_TO_ONE
    description: str | None = None


class UserDefinedRelationship(AppBaseModel):
    workspace_id: str
    name: str | None = None
    source_connection_id: str
    source_table: str
    source_fields: list[str]
    target_connection_id: str
    target_table: str
    target_fields: list[str]
    provenance: RelationshipProvenance = RelationshipProvenance.USER_DEFINED
    cardinality: Cardinality = Cardinality.MANY_TO_ONE
    confidence: float = 1.0
    description: str | None = None
    created_by: str | None = None


class GraphNode(AppBaseModel):
    id: str  # unique node ID, e.g. "conn_id::table_name"
    name: str
    connection_id: str
    connection_name: str
    database_type: str  # postgres, mongodb, elasticsearch
    schema_name: str | None = None
    object_type: str = "table"  # table, collection, index
    fields: list[SchemaField] = Field(default_factory=list)
    row_count_estimate: int | None = None


class GraphEdge(AppBaseModel):
    id: str
    source_node_id: str
    source_field: str
    target_node_id: str
    target_field: str
    provenance: RelationshipProvenance
    cardinality: Cardinality = Cardinality.MANY_TO_ONE
    confidence: float = 1.0
    is_cross_database: bool = False
    description: str | None = None


class SchemaGraphStatistics(AppBaseModel):
    total_nodes: int = 0
    total_edges: int = 0
    foreign_keys_count: int = 0
    inferred_count: int = 0
    user_defined_count: int = 0
    cross_database_count: int = 0


class SchemaGraphResponse(AppBaseModel):
    workspace_id: str
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    statistics: SchemaGraphStatistics = Field(default_factory=SchemaGraphStatistics)


def compute_schema_fingerprint(objects: list[SchemaObject]) -> str:
    """Compute a deterministic SHA-256 fingerprint for a collection of schema objects."""
    canonical_list = []
    # Sort objects deterministically by schema_name and name
    for obj in sorted(objects, key=lambda o: (o.schema_name or "", o.name)):
        obj_dict: dict[str, Any] = {
            "name": obj.name,
            "schema_name": obj.schema_name,
            "object_type": obj.object_type,
            "fields": [
                {
                    "name": f.name,
                    "data_type": f.data_type,
                    "is_primary_key": f.is_primary_key,
                    "is_foreign_key": f.is_foreign_key,
                    "is_nullable": f.is_nullable,
                }
                for f in sorted(obj.fields, key=lambda f: f.name)
            ],
            "relationships": [
                {
                    "source_table": r.source_table,
                    "source_fields": sorted(r.source_fields),
                    "target_table": r.target_table,
                    "target_fields": sorted(r.target_fields),
                    "provenance": str(r.provenance),
                    "cardinality": str(r.cardinality),
                }
                for r in sorted(
                    obj.relationships,
                    key=lambda r: (r.source_table, "".join(r.source_fields), r.target_table),
                )
            ],
        }
        canonical_list.append(obj_dict)

    canonical_json = json.dumps(canonical_list, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
