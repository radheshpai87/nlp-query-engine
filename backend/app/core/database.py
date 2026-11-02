from pymongo import ASCENDING, MongoClient
from pymongo.database import Database

from app.core.config import get_settings
from app.core.logging import setup_logging

logger = setup_logging()

_mongo_client: MongoClient | None = None
_test_db: Database | None = None


def set_test_database(db: Database | None) -> None:
    """Inject a test database (e.g. mongomock) for isolated automated testing."""
    global _test_db
    _test_db = db


def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        settings = get_settings()
        logger.info("Connecting to application metadata MongoDB at %s", settings.APP_MONGO_URI)
        _mongo_client = MongoClient(
            settings.APP_MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
    return _mongo_client


def get_metadata_db() -> Database:
    global _test_db
    if _test_db is not None:
        return _test_db

    settings = get_settings()
    client = get_mongo_client()
    return client[settings.APP_MONGO_DB_NAME]


def init_metadata_indexes(db: Database | None = None) -> None:
    """Initialize necessary indexes for application metadata performance and uniqueness."""
    target_db = db if db is not None else get_metadata_db()
    try:
        # Users: unique email
        target_db.users.create_index([("email", ASCENDING)], unique=True)

        # Workspaces: owner index
        target_db.workspaces.create_index([("owner_id", ASCENDING)])

        # Workspace Memberships: compound unique (workspace_id, user_id)
        target_db.workspace_memberships.create_index(
            [("workspace_id", ASCENDING), ("user_id", ASCENDING)],
            unique=True,
        )

        # Connections: workspace index
        target_db.connections.create_index(
            [("workspace_id", ASCENDING), ("name", ASCENDING)],
            unique=True,
        )

        # Conversations
        target_db.conversations.create_index([("workspace_id", ASCENDING), ("user_id", ASCENDING)])

        # Messages: ordered by creation
        target_db.messages.create_index([("conversation_id", ASCENDING), ("created_at", ASCENDING)])

        # Schema snapshots
        target_db.schema_snapshots.create_index(
            [("workspace_id", ASCENDING), ("connection_id", ASCENDING)]
        )

        # Audit events: fast time-range querying
        target_db.audit_events.create_index(
            [("workspace_id", ASCENDING), ("created_at", ASCENDING)]
        )

        # Saved queries
        target_db.saved_queries.create_index([("workspace_id", ASCENDING), ("user_id", ASCENDING)])

        logger.info("Application metadata indexes verified successfully.")
    except Exception as e:
        logger.warning("Could not initialize MongoDB indexes: %s", e)


def close_mongo_connection() -> None:
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        logger.info("Closed application metadata MongoDB connection.")
