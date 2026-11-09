from app.adapters.elasticsearch import ElasticsearchAdapter
from app.adapters.factory import create_adapter
from app.adapters.mongodb import MongoAdapter
from app.adapters.postgres import PostgresAdapter
from app.models.connection import DatabaseConnection, DatabaseType


def test_postgres_adapter_unreachable_host_returns_sanitized_error() -> None:
    adapter = PostgresAdapter(
        connection_id="conn-pg-fail",
        name="Dead PG",
        host="127.0.0.1",
        port=54329,  # Unused port
        database="testdb",
        user="postgres",
        password="super_secret_pg_password",
    )
    res = adapter.test_connection()
    assert res.success is False
    assert res.error_message is not None
    # Password must never appear in error message
    assert "super_secret_pg_password" not in res.error_message
    adapter.close()


def test_mongo_adapter_unreachable_host_returns_sanitized_error() -> None:
    adapter = MongoAdapter(
        connection_id="conn-mongo-fail",
        name="Dead Mongo",
        host="127.0.0.1",
        port=27019,  # Unused port
        database="testdb",
        user="admin",
        password="super_secret_mongo_password",
    )
    res = adapter.test_connection()
    assert res.success is False
    assert res.error_message is not None
    assert "super_secret_mongo_password" not in res.error_message
    adapter.close()


def test_elasticsearch_adapter_unreachable_host_returns_sanitized_error() -> None:
    adapter = ElasticsearchAdapter(
        connection_id="conn-es-fail",
        name="Dead ES",
        uri="http://127.0.0.1:9209",
        password="secret_es_password",
    )
    res = adapter.test_connection()
    assert res.success is False
    assert res.error_message is not None
    assert "secret_es_password" not in res.error_message
    adapter.close()


def test_adapter_factory() -> None:
    conn_pg = DatabaseConnection(
        workspace_id="ws-1",
        name="PG",
        db_type=DatabaseType.POSTGRESQL,
        host="localhost",
        port=5432,
        database="analytics",
    )
    adapter = create_adapter(conn_pg, decrypted_secret="mypassword")
    assert isinstance(adapter, PostgresAdapter)
    assert adapter.name == "PG"
    adapter.close()

    conn_es = DatabaseConnection(
        workspace_id="ws-1",
        name="ES",
        db_type=DatabaseType.ELASTICSEARCH,
        host="localhost",
        port=9200,
    )
    adapter_es = create_adapter(conn_es, decrypted_secret="")
    assert isinstance(adapter_es, ElasticsearchAdapter)
    adapter_es.close()
