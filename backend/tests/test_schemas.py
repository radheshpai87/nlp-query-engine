from typing import Any
from unittest.mock import MagicMock, patch

import mongomock
from fastapi.testclient import TestClient

from app.adapters.elasticsearch import ElasticsearchAdapter
from app.adapters.mongodb import MongoAdapter
from app.adapters.postgres import PostgresAdapter
from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import (
    Cardinality,
    RelationshipProvenance,
    SchemaField,
    SchemaObject,
    SchemaRelationship,
    SchemaSnapshot,
    compute_schema_fingerprint,
)
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.relationship_repository import RelationshipRepository
from app.repositories.schema_repository import SchemaRepository
from app.services.audit_service import AuditService
from app.services.schema_service import SchemaService


def test_compute_schema_fingerprint_is_deterministic() -> None:
    obj1 = SchemaObject(
        connection_id="conn-1",
        name="users",
        schema_name="public",
        object_type="table",
        fields=[
            SchemaField(name="id", data_type="integer", is_primary_key=True),
            SchemaField(name="email", data_type="varchar", is_nullable=False),
        ],
    )
    obj2 = SchemaObject(
        connection_id="conn-1",
        name="orders",
        schema_name="public",
        object_type="table",
        fields=[
            SchemaField(name="id", data_type="integer", is_primary_key=True),
            SchemaField(name="user_id", data_type="integer", is_foreign_key=True),
        ],
        relationships=[
            SchemaRelationship(
                source_table="orders",
                source_fields=["user_id"],
                target_table="users",
                target_fields=["id"],
                provenance=RelationshipProvenance.FOREIGN_KEY,
                cardinality=Cardinality.MANY_TO_ONE,
            )
        ],
    )

    # Different ordering in list must produce the exact same fingerprint
    fp1 = compute_schema_fingerprint([obj1, obj2])
    fp2 = compute_schema_fingerprint([obj2, obj1])
    assert fp1 == fp2
    assert len(fp1) == 64

    # Any modification must produce a different fingerprint
    obj1_modified = SchemaObject(
        connection_id="conn-1",
        name="users",
        schema_name="public",
        object_type="table",
        fields=[
            SchemaField(name="id", data_type="integer", is_primary_key=True),
            SchemaField(name="email", data_type="text", is_nullable=False),  # changed type
        ],
    )
    fp_modified = compute_schema_fingerprint([obj1_modified, obj2])
    assert fp_modified != fp1


def test_postgres_adapter_discover_schema_mocked() -> None:
    adapter = PostgresAdapter(
        connection_id="conn-pg-1",
        name="Postgres DB",
        database="production_db",
    )

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    # Sequence of fetchall results for queries:
    # 1. tables
    # 2. columns
    # 3. primary keys
    # 4. foreign keys
    # 5. row estimates
    mock_cursor.fetchall.side_effect = [
        # tables
        [
            ("public", "users", "BASE TABLE"),
            ("public", "orders", "BASE TABLE"),
        ],
        # columns
        [
            ("public", "users", "id", "integer", "NO"),
            ("public", "users", "email", "character varying", "NO"),
            ("public", "orders", "id", "integer", "NO"),
            ("public", "orders", "user_id", "integer", "NO"),
            ("public", "orders", "total", "numeric", "YES"),
        ],
        # primary keys
        [
            ("public", "users", "id"),
            ("public", "orders", "id"),
        ],
        # foreign keys
        [
            ("public", "orders", "user_id", "public", "users", "id"),
        ],
        # row estimates
        [
            ("public", "users", 1500),
            ("public", "orders", 42000),
        ],
    ]

    with patch("psycopg.connect", return_value=mock_conn):
        snapshot = adapter.discover_schema(workspace_id="ws-123")

    assert snapshot.workspace_id == "ws-123"
    assert snapshot.connection_id == "conn-pg-1"
    assert snapshot.total_objects == 2

    # Check users table
    users_obj = next(o for o in snapshot.objects if o.name == "users")
    assert users_obj.row_count_estimate == 1500
    user_id_field = next(f for f in users_obj.fields if f.name == "id")
    assert user_id_field.is_primary_key is True

    # Check orders table
    orders_obj = next(o for o in snapshot.objects if o.name == "orders")
    assert orders_obj.row_count_estimate == 42000
    order_user_fk = next(f for f in orders_obj.fields if f.name == "user_id")
    assert order_user_fk.is_foreign_key is True
    assert len(orders_obj.relationships) == 1
    rel = orders_obj.relationships[0]
    assert rel.source_table == "orders"
    assert rel.target_table == "users"
    assert rel.source_fields == ["user_id"]
    assert rel.target_fields == ["id"]
    assert rel.provenance == RelationshipProvenance.FOREIGN_KEY


def test_mongo_adapter_discover_schema_mocked() -> None:
    mock_client: mongomock.MongoClient = mongomock.MongoClient()
    test_db = mock_client["ecommerce"]

    # Populate sample documents
    test_db["customers"].insert_many(
        [
            {"_id": "cust-1", "name": "Alice", "city": "Bengaluru", "age": 30},
            {"_id": "cust-2", "name": "Bob", "city": "Mumbai", "is_active": True},
        ]
    )
    test_db["orders"].insert_many(
        [
            {"_id": "ord-1", "customers_id": "cust-1", "amount": 250.50},
            {"_id": "ord-2", "customers_id": "cust-2", "amount": 100.00},
        ]
    )

    adapter = MongoAdapter(
        connection_id="conn-mongo-1",
        name="Mongo DB",
        database="ecommerce",
    )

    with patch.object(adapter, "_get_client", return_value=mock_client):
        snapshot = adapter.discover_schema(workspace_id="ws-123")

    assert snapshot.workspace_id == "ws-123"
    assert snapshot.total_objects == 2

    cust_obj = next(o for o in snapshot.objects if o.name == "customers")
    cust_id = next(f for f in cust_obj.fields if f.name == "_id")
    assert cust_id.is_primary_key is True

    orders_obj = next(o for o in snapshot.objects if o.name == "orders")
    cust_fk = next(f for f in orders_obj.fields if f.name == "customers_id")
    assert cust_fk.is_foreign_key is True
    assert len(orders_obj.relationships) == 1
    rel = orders_obj.relationships[0]
    assert rel.source_table == "orders"
    assert rel.target_table == "customers"
    assert rel.provenance == RelationshipProvenance.INFERRED


def test_elasticsearch_adapter_discover_schema_mocked() -> None:
    adapter = ElasticsearchAdapter(
        connection_id="conn-es-1",
        name="ES Analytics",
        database="analytics",
    )

    mock_client = MagicMock()
    mock_client.indices.get_mapping.return_value = {
        "logs-2026": {
            "mappings": {
                "properties": {
                    "timestamp": {"type": "date"},
                    "status_code": {"type": "integer"},
                    "message": {"type": "text"},
                    "http": {
                        "properties": {
                            "method": {"type": "keyword"},
                            "path": {"type": "keyword"},
                        }
                    },
                }
            }
        },
        ".kibana_internal": {"mappings": {}},  # System index to ignore
    }
    mock_client.count.return_value = {"count": 10500}

    with patch.object(adapter, "_get_client", return_value=mock_client):
        snapshot = adapter.discover_schema(workspace_id="ws-123")

    assert snapshot.workspace_id == "ws-123"
    # .kibana_internal must be filtered out
    assert snapshot.total_objects == 1
    log_obj = snapshot.objects[0]
    assert log_obj.name == "logs-2026"
    assert log_obj.row_count_estimate == 10500

    field_names = [f.name for f in log_obj.fields]
    assert "_id" in field_names
    assert "timestamp" in field_names
    assert "http.method" in field_names
    assert "http.path" in field_names


def test_schema_service_refresh_and_change_detection(mock_db: Any) -> None:
    schema_repo = SchemaRepository(db=mock_db)
    conn_repo = ConnectionRepository(db=mock_db)
    relationship_repo = RelationshipRepository(db=mock_db)
    audit_service = AuditService()

    conn = DatabaseConnection(
        workspace_id="ws-sch-1",
        name="Test Postgres",
        db_type=DatabaseType.POSTGRESQL,
        database="app_db",
    )
    conn_repo.create(conn)

    service = SchemaService(
        schema_repo=schema_repo,
        connection_repo=conn_repo,
        relationship_repo=relationship_repo,
        audit_service=audit_service,
    )

    mock_snapshot = SchemaSnapshot(
        workspace_id="ws-sch-1",
        connection_id=conn.id,
        fingerprint="initial-fp",
        objects=[
            SchemaObject(
                connection_id=conn.id,
                name="products",
                schema_name="public",
                object_type="table",
                fields=[
                    SchemaField(name="id", data_type="integer", is_primary_key=True),
                    SchemaField(name="sku", data_type="varchar"),
                ],
            )
        ],
        total_objects=1,
    )

    with patch("app.services.schema_service.create_adapter") as mock_factory:
        mock_adapter = MagicMock()
        mock_adapter.discover_schema.return_value = mock_snapshot
        mock_factory.return_value = mock_adapter

        # 1. First refresh -> new snapshot persisted
        first = service.refresh_schema(workspace_id="ws-sch-1", connection_id=conn.id)
        assert first.fingerprint == compute_schema_fingerprint(mock_snapshot.objects)
        assert schema_repo.count() == 1

        # 2. Second refresh with same schema -> no duplicate created
        second = service.refresh_schema(workspace_id="ws-sch-1", connection_id=conn.id)
        assert second.id == first.id
        assert schema_repo.count() == 1

        # 3. Search schema objects
        search_results = service.search_schema_objects("ws-sch-1", "sku")
        assert len(search_results) == 1
        assert search_results[0].field_name == "sku"
        assert search_results[0].match_type == "field"

        search_table = service.search_schema_objects("ws-sch-1", "product")
        assert len(search_table) == 1
        assert search_table[0].object_name == "products"
        assert search_table[0].match_type == "object"


def test_schema_api_routes(
    client: TestClient,
    test_user: User,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
    mock_db: Any,
) -> None:
    conn_repo = ConnectionRepository(db=mock_db)
    conn = DatabaseConnection(
        workspace_id=test_workspace.id,
        name="Store MongoDB",
        db_type=DatabaseType.MONGODB,
        database="store",
    )
    conn_repo.create(conn)

    # 1. GET before refresh should return 404
    resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/{conn.id}",
        headers=user_auth_headers,
    )
    assert resp.status_code == 404

    # 2. POST refresh schema
    mock_snap = SchemaSnapshot(
        workspace_id=test_workspace.id,
        connection_id=conn.id,
        fingerprint="snap-1",
        objects=[
            SchemaObject(
                connection_id=conn.id,
                name="items",
                schema_name="store",
                object_type="collection",
                fields=[
                    SchemaField(name="_id", data_type="objectId", is_primary_key=True),
                    SchemaField(name="price", data_type="float"),
                ],
            )
        ],
        total_objects=1,
    )

    with patch("app.services.schema_service.create_adapter") as mock_factory:
        mock_adapter = MagicMock()
        mock_adapter.discover_schema.return_value = mock_snap
        mock_factory.return_value = mock_adapter

        refresh_resp = client.post(
            f"/api/v1/workspaces/{test_workspace.id}/schemas/{conn.id}/refresh",
            headers=user_auth_headers,
        )
        assert refresh_resp.status_code == 200
        snap_data = refresh_resp.json()
        assert snap_data["connection_id"] == conn.id
        assert len(snap_data["objects"]) == 1

    # 3. GET latest schema
    get_resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/{conn.id}",
        headers=user_auth_headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["total_objects"] == 1

    # 4. List workspace schemas
    list_resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas",
        headers=user_auth_headers,
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 5. Search workspace schemas
    search_resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/search?q=price",
        headers=user_auth_headers,
    )
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) == 1
    assert results[0]["field_name"] == "price"
