"""Tests for Multi-Database Seeding & Orchestration Script (Phase 12)."""

from collections.abc import Generator
from unittest.mock import MagicMock, patch

import mongomock
import pytest

from app.core.security import decrypt_secret
from scripts.seed_demo_databases import (
    seed_all,
    seed_elasticsearch_target,
    seed_metadata,
    seed_mongodb_target,
    seed_postgres,
)


@pytest.fixture
def mock_mongo_client() -> Generator[mongomock.MongoClient, None, None]:
    client: mongomock.MongoClient = mongomock.MongoClient()
    with patch("scripts.seed_demo_databases.MongoClient", return_value=client):
        yield client


def test_seed_metadata_mocked(mock_mongo_client: mongomock.MongoClient) -> None:
    """Verify application metadata, connections, credentials, and cross-db relations are seeded."""
    success = seed_metadata(
        meta_uri="mongodb://fake:27017/meta",
        meta_db_name="nlp_query_engine_meta",
        introspect=False,
    )
    assert success is True

    db = mock_mongo_client["nlp_query_engine_meta"]

    # Workspace
    ws = db["workspaces"].find_one({"_id": "ws_default"})
    assert ws is not None
    assert ws["name"] == "Demo Workspace"

    # User
    user = db["users"].find_one({"_id": "usr_admin"})
    assert user is not None
    assert user["email"] == "admin@example.com"
    assert user["is_superuser"] is True

    # Connections
    conns = list(db["connections"].find({"workspace_id": "ws_default"}))
    assert len(conns) == 3
    conn_names = {c["name"] for c in conns}
    assert "PostgreSQL E-Commerce" in conn_names
    assert "MongoDB Analytics" in conn_names
    assert "Elasticsearch Catalog" in conn_names

    # Check secret encryption
    pg_conn = db["connections"].find_one({"_id": "conn_postgres_demo"})
    assert pg_conn is not None
    assert pg_conn["encrypted_secret"] != ""
    assert pg_conn["encrypted_secret"] != "postgrespassword"
    decrypted = decrypt_secret(pg_conn["encrypted_secret"])
    assert decrypted == "postgrespassword"

    # Cross-database relationships
    rels = list(db["user_defined_relationships"].find({"workspace_id": "ws_default"}))
    assert len(rels) == 2
    rel_ids = {r["_id"] for r in rels}
    assert "rel_reviews_to_products" in rel_ids
    assert "rel_catalog_to_products" in rel_ids


def test_seed_metadata_idempotency(mock_mongo_client: mongomock.MongoClient) -> None:
    """Verify multiple executions of seed_metadata update cleanly without errors."""
    success_1 = seed_metadata(introspect=False)
    assert success_1 is True

    success_2 = seed_metadata(introspect=False)
    assert success_2 is True

    db = mock_mongo_client["nlp_query_engine_meta"]
    assert db["workspaces"].count_documents({}) == 1
    assert db["users"].count_documents({}) == 1
    assert db["connections"].count_documents({}) == 3


def test_seed_mongodb_target_mocked(mock_mongo_client: mongomock.MongoClient) -> None:
    """Verify target MongoDB collections (events, reviews) are seeded."""
    success = seed_mongodb_target(
        uri="mongodb://fake:27018/analytics_demo",
        db_name="analytics_demo",
    )
    assert success is True

    db = mock_mongo_client["analytics_demo"]
    events = list(db["events"].find())
    assert len(events) >= 10
    assert any(e["event_type"] == "checkout" for e in events)

    reviews = list(db["reviews"].find())
    assert len(reviews) >= 10
    assert any(r["product_id"] == 1 and r["rating"] == 5 for r in reviews)


def test_seed_postgres_mocked() -> None:
    """Verify postgres seeding executes SQL statements."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    mock_connect_cm = MagicMock()
    mock_connect_cm.__enter__.return_value = mock_conn

    with patch("psycopg.connect", return_value=mock_connect_cm):
        success = seed_postgres("postgresql://fake:5432/ecommerce_demo")
        assert success is True
        assert (mock_cursor.execute.call_count + mock_cursor.executemany.call_count) >= 5


def test_seed_postgres_connection_failure() -> None:
    """Verify graceful handling when PostgreSQL is unreachable."""
    with patch("psycopg.connect", side_effect=Exception("Connection refused")):
        success = seed_postgres("postgresql://unreachable:5432/ecommerce_demo")
        assert success is False


def test_seed_elasticsearch_mocked() -> None:
    """Verify elasticsearch seeding indices and documents."""
    mock_es = MagicMock()
    mock_es.ping.return_value = True
    mock_es.indices.exists.return_value = False

    with patch("elasticsearch.Elasticsearch", return_value=mock_es):
        success = seed_elasticsearch_target("http://fake-es:9200")
        assert success is True
        assert mock_es.indices.create.call_count == 2
        assert mock_es.index.call_count >= 8


def test_seed_elasticsearch_unreachable() -> None:
    """Verify graceful handling when Elasticsearch ping fails."""
    mock_es = MagicMock()
    mock_es.ping.return_value = False

    with patch("elasticsearch.Elasticsearch", return_value=mock_es):
        success = seed_elasticsearch_target("http://fake-es:9200")
        assert success is False


def test_seed_all_orchestration(mock_mongo_client: mongomock.MongoClient) -> None:
    """Verify master seed_all orchestrates all steps."""
    with (
        patch("scripts.seed_demo_databases.seed_postgres", return_value=True) as mock_pg,
        patch("scripts.seed_demo_databases.seed_mongodb_target", return_value=True) as mock_mongo,
        patch("scripts.seed_demo_databases.seed_elasticsearch_target", return_value=True) as mock_es,
        patch("scripts.seed_demo_databases.seed_metadata", return_value=True) as mock_meta,
    ):
        results = seed_all()
        assert results["postgres"] is True
        assert results["mongodb_target"] is True
        assert results["elasticsearch"] is True
        assert results["metadata"] is True
        assert mock_pg.called
        assert mock_mongo.called
        assert mock_es.called
        assert mock_meta.called
