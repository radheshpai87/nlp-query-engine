from typing import Any

from fastapi.testclient import TestClient

from app.models.connection import DatabaseConnection, DatabaseType
from app.models.schema import (
    Cardinality,
    RelationshipProvenance,
    SchemaField,
    SchemaObject,
    SchemaRelationship,
    SchemaSnapshot,
    UserDefinedRelationshipCreate,
)
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.relationship_repository import RelationshipRepository
from app.repositories.schema_repository import SchemaRepository
from app.services.audit_service import AuditService
from app.services.schema_service import SchemaService


def test_user_defined_relationship_crud(mock_db: Any) -> None:
    conn_repo = ConnectionRepository(db=mock_db)
    schema_repo = SchemaRepository(db=mock_db)
    rel_repo = RelationshipRepository(db=mock_db)
    audit_service = AuditService()

    service = SchemaService(
        schema_repo=schema_repo,
        connection_repo=conn_repo,
        relationship_repo=rel_repo,
        audit_service=audit_service,
    )

    # Create 2 connections: 1 Postgres, 1 Mongo
    conn_pg = conn_repo.create(
        DatabaseConnection(
            workspace_id="ws-rel-test",
            name="PG DB",
            db_type=DatabaseType.POSTGRESQL,
            database="pg_prod",
        )
    )
    conn_mongo = conn_repo.create(
        DatabaseConnection(
            workspace_id="ws-rel-test",
            name="Mongo DB",
            db_type=DatabaseType.MONGODB,
            database="mongo_prod",
        )
    )

    # 1. Create cross-database relationship
    data = UserDefinedRelationshipCreate(
        name="Orders to Customers",
        source_connection_id=conn_pg.id,
        source_table="orders",
        source_fields=["customer_id"],
        target_connection_id=conn_mongo.id,
        target_table="customers",
        target_fields=["_id"],
        cardinality=Cardinality.MANY_TO_ONE,
        description="Links PostgreSQL order to Mongo customer doc",
    )
    rel = service.create_user_defined_relationship("ws-rel-test", data, user_id="u-1")
    assert rel.id is not None
    assert rel.workspace_id == "ws-rel-test"
    assert rel.provenance == RelationshipProvenance.USER_DEFINED
    assert rel.cardinality == Cardinality.MANY_TO_ONE

    # 2. List relationships
    rels = service.list_user_defined_relationships("ws-rel-test")
    assert len(rels) == 1
    assert rels[0].name == "Orders to Customers"

    # 3. Delete relationship
    deleted = service.delete_user_defined_relationship("ws-rel-test", rel.id)
    assert deleted is True
    assert len(service.list_user_defined_relationships("ws-rel-test")) == 0


def test_schema_graph_assembly(mock_db: Any) -> None:
    conn_repo = ConnectionRepository(db=mock_db)
    schema_repo = SchemaRepository(db=mock_db)
    rel_repo = RelationshipRepository(db=mock_db)
    audit_service = AuditService()

    service = SchemaService(
        schema_repo=schema_repo,
        connection_repo=conn_repo,
        relationship_repo=rel_repo,
        audit_service=audit_service,
    )

    # Setup Connections
    conn_pg = conn_repo.create(
        DatabaseConnection(
            workspace_id="ws-graph",
            name="Production Postgres",
            db_type=DatabaseType.POSTGRESQL,
            database="prod_sql",
        )
    )
    conn_mongo = conn_repo.create(
        DatabaseConnection(
            workspace_id="ws-graph",
            name="Activity MongoDB",
            db_type=DatabaseType.MONGODB,
            database="activity_logs",
        )
    )

    # Snapshot 1: Postgres with users and orders (with FK)
    schema_repo.create(
        SchemaSnapshot(
            workspace_id="ws-graph",
            connection_id=conn_pg.id,
            fingerprint="fp-pg",
            objects=[
                SchemaObject(
                    connection_id=conn_pg.id,
                    name="users",
                    fields=[SchemaField(name="id", data_type="int", is_primary_key=True)],
                    row_count_estimate=1000,
                ),
                SchemaObject(
                    connection_id=conn_pg.id,
                    name="orders",
                    fields=[
                        SchemaField(name="id", data_type="int", is_primary_key=True),
                        SchemaField(name="user_id", data_type="int", is_foreign_key=True),
                    ],
                    relationships=[
                        SchemaRelationship(
                            source_table="orders",
                            source_fields=["user_id"],
                            target_table="users",
                            target_fields=["id"],
                            provenance=RelationshipProvenance.FOREIGN_KEY,
                        )
                    ],
                    row_count_estimate=5000,
                ),
            ],
            total_objects=2,
        )
    )

    # Snapshot 2: MongoDB with events collection
    schema_repo.create(
        SchemaSnapshot(
            workspace_id="ws-graph",
            connection_id=conn_mongo.id,
            fingerprint="fp-mongo",
            objects=[
                SchemaObject(
                    connection_id=conn_mongo.id,
                    name="events",
                    fields=[
                        SchemaField(name="_id", data_type="objectId", is_primary_key=True),
                        SchemaField(name="user_ref", data_type="string"),
                    ],
                    row_count_estimate=80000,
                )
            ],
            total_objects=1,
        )
    )

    # Add cross-database user-defined relationship: events.user_ref -> users.id
    service.create_user_defined_relationship(
        "ws-graph",
        UserDefinedRelationshipCreate(
            name="Event to User",
            source_connection_id=conn_mongo.id,
            source_table="events",
            source_fields=["user_ref"],
            target_connection_id=conn_pg.id,
            target_table="users",
            target_fields=["id"],
            cardinality=Cardinality.MANY_TO_ONE,
        ),
    )

    # Assemble graph
    graph = service.get_schema_graph("ws-graph")

    # Assert Nodes
    assert graph.statistics.total_nodes == 3
    node_names = {n.name for n in graph.nodes}
    assert node_names == {"users", "orders", "events"}

    # Assert Edges
    assert graph.statistics.total_edges == 2
    assert graph.statistics.foreign_keys_count == 1
    assert graph.statistics.user_defined_count == 1
    assert graph.statistics.cross_database_count == 1

    cross_edge = next(e for e in graph.edges if e.is_cross_database)
    assert cross_edge.source_field == "user_ref"
    assert cross_edge.target_field == "id"
    assert cross_edge.provenance == RelationshipProvenance.USER_DEFINED


def test_relationship_api_endpoints(
    client: TestClient,
    test_user: User,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
    mock_db: Any,
) -> None:
    conn_repo = ConnectionRepository(db=mock_db)
    conn_pg = conn_repo.create(
        DatabaseConnection(
            workspace_id=test_workspace.id,
            name="Warehouse PG",
            db_type=DatabaseType.POSTGRESQL,
            database="warehouse",
        )
    )
    conn_es = conn_repo.create(
        DatabaseConnection(
            workspace_id=test_workspace.id,
            name="Search ES",
            db_type=DatabaseType.ELASTICSEARCH,
            database="products_es",
        )
    )

    # 1. Create relationship via API
    payload = {
        "name": "Warehouse to ES Sync",
        "source_connection_id": conn_pg.id,
        "source_table": "inventory",
        "source_fields": ["sku"],
        "target_connection_id": conn_es.id,
        "target_table": "search_products",
        "target_fields": ["product_sku"],
        "cardinality": "one_to_one",
        "description": "Inventory sync reference",
    }
    create_resp = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/relationships",
        json=payload,
        headers=user_auth_headers,
    )
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    rel_id = created_data["id"]
    assert created_data["provenance"] == "user_defined"

    # 2. List relationships
    list_resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/relationships",
        headers=user_auth_headers,
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 3. Retrieve schema graph
    graph_resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/graph",
        headers=user_auth_headers,
    )
    assert graph_resp.status_code == 200
    graph_data = graph_resp.json()
    assert graph_data["statistics"]["user_defined_count"] == 1
    assert graph_data["statistics"]["cross_database_count"] == 1

    # 4. Delete relationship
    del_resp = client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/relationships/{rel_id}",
        headers=user_auth_headers,
    )
    assert del_resp.status_code == 204

    # 5. Verify empty
    list_after_resp = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/schemas/relationships",
        headers=user_auth_headers,
    )
    assert len(list_after_resp.json()) == 0
