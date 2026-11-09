from typing import Any
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.models.connection import DatabaseConnection, DatabaseType
from app.models.conversation import Conversation, MessageRole
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.schema_repository import SchemaRepository


def test_conversation_crud_repository(mock_db: Any) -> None:
    repo = ConversationRepository(db=mock_db)

    # 1. Create
    conv = Conversation(
        workspace_id="ws-crud",
        user_id="user-1",
        title="Test Chat",
    )
    created = repo.create(conv)
    assert created.id is not None
    assert created.title == "Test Chat"

    # 2. Get and List
    fetched = repo.get_by_id(created.id)
    assert fetched is not None
    assert fetched.workspace_id == "ws-crud"

    conv_list = repo.get_by_workspace("ws-crud", "user-1")
    assert len(conv_list) == 1

    # 3. Update Title
    updated = repo.update_title(created.id, "Renamed Thread")
    assert updated is not None
    assert updated.title == "Renamed Thread"

    # 4. Delete
    deleted = repo.delete_by_id_and_workspace("ws-crud", created.id)
    assert deleted is True
    assert repo.get_by_id(created.id) is None


def test_conversational_ambiguity_and_resolution_flow(
    client: TestClient,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
    mock_db: Any,
) -> None:
    # Setup test connection and schema
    conn_repo = ConnectionRepository(db=mock_db)
    conn = conn_repo.create(
        DatabaseConnection(
            workspace_id=test_workspace.id,
            name="PG Store",
            db_type=DatabaseType.POSTGRESQL,
            host="localhost",
            database="store",
            username="postgres",
        )
    )

    schema_repo = SchemaRepository(db=mock_db)
    schema_repo.create(
        SchemaSnapshot(
            workspace_id=test_workspace.id,
            connection_id=conn.id,
            fingerprint="fp-store",
            objects=[
                SchemaObject(
                    connection_id=conn.id,
                    name="customers",
                    fields=[
                        SchemaField(name="id", data_type="integer", is_primary_key=True),
                        SchemaField(name="name", data_type="varchar"),
                        SchemaField(name="total_spend", data_type="numeric"),
                    ],
                )
            ],
            total_objects=1,
        )
    )

    # 1. Create a conversation via API
    res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/conversations",
        headers=user_auth_headers,
        json={"title": "High Value Query"},
    )
    assert res.status_code == 201
    conv_data = res.json()
    conv_id = conv_data["id"]

    # 2. Post an ambiguous natural language message ("high-value customers")
    res_msg = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}/messages",
        headers=user_auth_headers,
        json={"content": "Show me high-value customers"},
    )
    assert res_msg.status_code == 200
    turn1 = res_msg.json()
    assert turn1["user_message"]["content"] == "Show me high-value customers"
    # Assistant should return clarification
    assistant1 = turn1["assistant_message"]
    assert assistant1["clarification"] is not None
    clarification_id = assistant1["clarification"]["id"]
    assert (
        "threshold" in assistant1["clarification"]["question"].lower()
        or "high-value" in assistant1["clarification"]["question"].lower()
    )

    # 3. Resolve the clarification prompt
    with patch(
        "app.services.execution_service.ExecutionService._get_adapter_for_connection"
    ) as mock_get_adapter:
        mock_adapter = MagicMock()
        mock_adapter.execute_query.return_value = [
            {"id": 1, "name": "Alice", "total_spend": 2500.00},
            {"id": 2, "name": "Bob", "total_spend": 1200.00},
        ]
        mock_get_adapter.return_value = mock_adapter

        res_clarify = client.post(
            f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}/clarify",
            headers=user_auth_headers,
            json={
                "clarification_id": clarification_id,
                "selected_value": 1000,
            },
        )
        assert res_clarify.status_code == 200
        turn2 = res_clarify.json()
        assert turn2["user_message"]["content"] == "Selected: 1000"
        assistant2 = turn2["assistant_message"]
        assert assistant2["execution_result"] is not None
        assert assistant2["execution_result"]["row_count"] == 2
        assert len(assistant2["execution_result"]["rows"]) == 2
        assert "customers" in assistant2["target_databases"]
        assert assistant2["content"] is not None


def test_conversations_api_full_suite(
    client: TestClient,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
    mock_db: Any,
) -> None:
    # 1. Create conversation
    res_create = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/conversations",
        headers=user_auth_headers,
        json={},
    )
    assert res_create.status_code == 201
    conv = res_create.json()
    assert conv["title"] == "New Conversation"
    conv_id = conv["id"]

    # 2. List conversations
    res_list = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/conversations",
        headers=user_auth_headers,
    )
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) >= 1

    # 3. Patch title
    res_patch = client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}",
        headers=user_auth_headers,
        json={"title": "Updated Analytics Thread"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["title"] == "Updated Analytics Thread"

    # 4. Get conversation
    res_get = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}",
        headers=user_auth_headers,
    )
    assert res_get.status_code == 200
    assert res_get.json()["id"] == conv_id

    # 5. Query without connected databases -> graceful explanation message
    res_msg = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}/messages",
        headers=user_auth_headers,
        json={"content": "Show all orders"},
    )
    assert res_msg.status_code == 200
    msg_data = res_msg.json()
    assert msg_data["user_message"]["role"] == MessageRole.USER
    assert msg_data["assistant_message"]["role"] == MessageRole.ASSISTANT
    assert (
        "No database schemas are currently introspected" in msg_data["assistant_message"]["content"]
    )

    # 6. Get messages
    res_msgs = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}/messages",
        headers=user_auth_headers,
    )
    assert res_msgs.status_code == 200
    assert len(res_msgs.json()) == 2

    # 7. Delete conversation
    res_del = client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/conversations/{conv_id}",
        headers=user_auth_headers,
    )
    assert res_del.status_code == 204


def test_nlp_intent_api(
    client: TestClient,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
) -> None:
    res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/nlp/extract-intent",
        headers=user_auth_headers,
        json={"query": "Show top 10 products by revenue"},
    )
    assert res.status_code == 200
    intent = res.json()
    assert intent["limit"] == 10
