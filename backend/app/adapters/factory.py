from app.adapters.base import BaseDatabaseAdapter
from app.adapters.elasticsearch import ElasticsearchAdapter
from app.adapters.mongodb import MongoAdapter
from app.adapters.postgres import PostgresAdapter
from app.core.exceptions import AppError
from app.models.connection import DatabaseConnection, DatabaseType


def create_adapter(
    connection: DatabaseConnection,
    decrypted_secret: str | None = None,
) -> BaseDatabaseAdapter:
    """Instantiate appropriate concrete database adapter for given connection configuration."""
    # Determine password or URI from decrypted secret
    password = decrypted_secret or ""
    uri: str | None = None
    if connection.options.get("is_uri") or (decrypted_secret and "://" in decrypted_secret):
        uri = decrypted_secret
        password = ""

    if connection.db_type == DatabaseType.POSTGRESQL:
        return PostgresAdapter(
            connection_id=connection.id,
            name=connection.name,
            host=connection.host,
            port=connection.port,
            database=connection.database,
            user=connection.username,
            password=password,
            uri=uri,
            options=connection.options,
        )
    elif connection.db_type == DatabaseType.MONGODB:
        return MongoAdapter(
            connection_id=connection.id,
            name=connection.name,
            host=connection.host,
            port=connection.port,
            database=connection.database,
            user=connection.username,
            password=password,
            uri=uri,
            options=connection.options,
        )
    elif connection.db_type == DatabaseType.ELASTICSEARCH:
        return ElasticsearchAdapter(
            connection_id=connection.id,
            name=connection.name,
            host=connection.host,
            port=connection.port,
            database=connection.database,
            user=connection.username,
            password=password,
            uri=uri,
            options=connection.options,
        )
    else:
        raise AppError(f"Unsupported database type: '{connection.db_type}'")
