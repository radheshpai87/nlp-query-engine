from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models.ambiguity import AmbiguityType, ClarificationOption
from app.models.connection import ConnectionStatus, DatabaseConnection, DatabaseType
from app.models.conversation import Conversation, PendingClarification
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.models.user import User, UserCreate


def test_user_model_and_mongo_conversion() -> None:
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password="hashed_pw_xyz",
    )
    assert user.id is not None
    assert isinstance(user.created_at, datetime)

    # Test mongo conversion
    mongo_doc = user.to_mongo()
    assert "_id" in mongo_doc
    assert mongo_doc["_id"] == user.id
    assert "id" not in mongo_doc

    reconstituted = User.from_mongo(mongo_doc)
    assert reconstituted.id == user.id
    assert reconstituted.email == user.email


def test_user_create_validation() -> None:
    # Valid password
    valid = UserCreate(email="valid@example.com", full_name="Valid", password="password123")
    assert valid.email == "valid@example.com"

    # Password too short (< 8 chars)
    with pytest.raises(ValidationError):
        UserCreate(email="invalid@example.com", full_name="Invalid", password="short")


def test_database_connection_model() -> None:
    conn = DatabaseConnection(
        workspace_id="ws-123",
        name="Production Postgres",
        db_type=DatabaseType.POSTGRESQL,
        host="localhost",
        port=5432,
        database="orders_db",
        encrypted_secret="enc_secret_str",
    )
    assert conn.status == ConnectionStatus.OFFLINE
    assert conn.db_type == "postgres"
    assert conn.is_enabled is True


def test_schema_snapshot_model() -> None:
    field = SchemaField(name="customer_id", data_type="integer", is_primary_key=True)
    obj = SchemaObject(
        connection_id="conn-1",
        name="customers",
        schema_name="public",
        fields=[field],
    )
    snapshot = SchemaSnapshot(
        workspace_id="ws-1",
        connection_id="conn-1",
        fingerprint="fp-abcdef123",
        objects=[obj],
        total_objects=1,
    )
    assert snapshot.total_objects == 1
    assert snapshot.objects[0].fields[0].is_primary_key is True


def test_conversation_and_clarification_model() -> None:
    clarification = PendingClarification(
        ambiguity_type=AmbiguityType.VAGUE_PREDICATE,
        parameter_name="high_value_threshold",
        question="What order amount should qualify as high-value?",
        options=[
            ClarificationOption(label="$500", value=500, is_recommended=True),
            ClarificationOption(label="$1000", value=1000),
            ClarificationOption(label="$5000", value=5000),
        ],
    )
    conv = Conversation(
        workspace_id="ws-1",
        user_id="user-1",
        title="High value order query",
        pending_clarification=clarification,
    )
    assert conv.pending_clarification is not None
    assert conv.pending_clarification.resolved is False
    assert len(conv.pending_clarification.options) == 3
