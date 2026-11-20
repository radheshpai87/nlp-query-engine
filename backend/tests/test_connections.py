from fastapi.testclient import TestClient
from pymongo.database import Database

from app.core.auth import create_access_token, hash_password
from app.core.security import decrypt_secret
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.user_repository import UserRepository


def test_create_database_connection(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    payload = {
        "name": "E-Commerce PostgreSQL",
        "db_type": "postgres",
        "host": "localhost",
        "port": 5432,
        "database": "ecommerce_demo",
        "username": "pguser",
        "password": "MySuperSecretPassword123!",
    }

    response = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
        json=payload,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "E-Commerce PostgreSQL"
    assert data["db_type"] == "postgres"
    # Password must NEVER be returned in response!
    assert "password" not in data
    assert "encrypted_secret" not in data

    # Verify that secret was encrypted at rest in MongoDB
    conn_repo = ConnectionRepository(db=mock_db)
    persisted = conn_repo.get_by_id(data["id"])
    assert persisted is not None
    assert persisted.encrypted_secret != ""
    assert "MySuperSecretPassword123!" not in persisted.encrypted_secret
    assert decrypt_secret(persisted.encrypted_secret) == "MySuperSecretPassword123!"


def test_duplicate_connection_name_rejected(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
) -> None:
    payload = {
        "name": "Unique Database",
        "db_type": "mongodb",
        "host": "localhost",
        "port": 27017,
        "database": "events",
    }
    res1 = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
        json=payload,
    )
    assert res1.status_code == 201

    res2 = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
        json=payload,
    )
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_test_ephemeral_connection(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
) -> None:
    # Test pre-save verification with unreachable database
    payload = {
        "name": "Ephemeral Check",
        "db_type": "postgres",
        "host": "127.0.0.1",
        "port": 54329,
        "database": "temp",
        "username": "temp",
        "password": "temp_password",
    }
    response = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections/test-ephemeral",
        headers=user_auth_headers,
        json=payload,
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is False
    assert res["error_message"] is not None


def test_cross_workspace_connection_isolation(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    # Create connection in test_workspace
    create_res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
        json={
            "name": "Confidential DB",
            "db_type": "mongodb",
            "host": "localhost",
            "port": 27017,
            "database": "secret_data",
        },
    )
    assert create_res.status_code == 201
    conn_id = create_res.json()["id"]

    # Create outsider user
    user_repo = UserRepository(db=mock_db)
    outsider = user_repo.create(
        User(
            email="intruder@external.com",
            full_name="Intruder",
            hashed_password=hash_password("Password123!"),
        )
    )
    outsider_token = create_access_token({"sub": outsider.id, "email": outsider.email})
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    # Outsider attempts to read connection
    res = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/connections/{conn_id}",
        headers=outsider_headers,
    )
    assert res.status_code == 403


def test_delete_connection(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
) -> None:
    create_res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
        json={
            "name": "Deletable DB",
            "db_type": "elasticsearch",
            "uri": "http://localhost:9200",
        },
    )
    assert create_res.status_code == 201
    conn_id = create_res.json()["id"]

    del_res = client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/connections/{conn_id}",
        headers=user_auth_headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Ensure it no longer appears in listing
    list_res = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
    )
    assert all(c["id"] != conn_id for c in list_res.json())


def test_update_connection(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
) -> None:
    create_res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/connections",
        headers=user_auth_headers,
        json={
            "name": "Updatable Postgres",
            "db_type": "postgres",
            "host": "localhost",
            "port": 5432,
            "database": "demo_db",
            "username": "user",
            "password": "InitialPassword123!",
        },
    )
    assert create_res.status_code == 201
    conn_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/v1/workspaces/{test_workspace.id}/connections/{conn_id}",
        headers=user_auth_headers,
        json={
            "name": "Renamed Postgres DB",
            "is_enabled": False,
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Renamed Postgres DB"
    assert update_res.json()["is_enabled"] is False
    assert "password" not in update_res.json()
