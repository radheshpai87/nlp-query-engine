from fastapi.testclient import TestClient
from pymongo.database import Database

from app.core.auth import create_access_token, hash_password
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceRole
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository


def test_create_and_list_workspaces(
    client: TestClient, user_auth_headers: dict[str, str], test_user: User
) -> None:
    # Create workspace
    create_res = client.post(
        "/api/v1/workspaces",
        headers=user_auth_headers,
        json={"name": "Logistics Hub", "description": "Logistics data"},
    )
    assert create_res.status_code == 201
    ws_data = create_res.json()
    assert ws_data["name"] == "Logistics Hub"
    assert ws_data["owner_id"] == test_user.id
    assert ws_data["role"] == "admin"

    # List workspaces
    list_res = client.get("/api/v1/workspaces", headers=user_auth_headers)
    assert list_res.status_code == 200
    workspaces = list_res.json()
    assert len(workspaces) >= 1
    assert any(w["id"] == ws_data["id"] for w in workspaces)


def test_workspace_isolation_cross_tenant_denied(
    client: TestClient,
    test_user: User,
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    """User B must be rejected when attempting to access User A's workspace."""
    # Create User B (outsider)
    user_repo = UserRepository(db=mock_db)
    user_b = user_repo.create(
        User(
            email="outsider@company.com",
            full_name="Outsider User",
            hashed_password=hash_password("Password123!"),
        )
    )
    assert user_b.id is not None
    user_b_token = create_access_token({"sub": user_b.id, "email": user_b.email})
    headers_b = {"Authorization": f"Bearer {user_b_token}"}

    # User B tries to read User A's workspace
    res = client.get(f"/api/v1/workspaces/{test_workspace.id}", headers=headers_b)
    assert res.status_code == 403
    assert "access" in res.json()["detail"].lower()


def test_workspace_role_authorization_member_cannot_add_members(
    client: TestClient,
    test_user: User,
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    """A member with VIEWER role cannot add members; only ADMIN can."""
    user_repo = UserRepository(db=mock_db)
    workspace_repo = WorkspaceRepository(db=mock_db)

    # Create Member User
    viewer_user = user_repo.create(
        User(
            email="viewer@company.com",
            full_name="Viewer User",
            hashed_password=hash_password("Password123!"),
        )
    )
    assert viewer_user.id is not None
    # Add as VIEWER to test_workspace
    workspace_repo.add_member(test_workspace.id, viewer_user.id, role=WorkspaceRole.VIEWER)

    viewer_token = create_access_token({"sub": viewer_user.id, "email": viewer_user.email})
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # Viewer attempts to add a new member
    res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/members",
        headers=viewer_headers,
        json={"email": "newbie@company.com", "role": "member"},
    )
    assert res.status_code == 403
    assert "Insufficient permissions" in res.json()["detail"]


def test_admin_can_add_member(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    # Create user to invite
    user_repo = UserRepository(db=mock_db)
    invited = user_repo.create(
        User(
            email="colleague@company.com",
            full_name="Colleague",
            hashed_password=hash_password("Password123!"),
        )
    )
    assert invited.id is not None

    res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/members",
        headers=user_auth_headers,
        json={"email": "colleague@company.com", "role": "member"},
    )
    assert res.status_code == 201
    assert res.json()["status"] == "success"
    assert res.json()["role"] == "member"


def test_update_and_delete_workspace(
    client: TestClient, user_auth_headers: dict[str, str], test_workspace: Workspace
) -> None:
    # 1. Update workspace
    res_update = client.patch(
        f"/api/v1/workspaces/{test_workspace.id}",
        headers=user_auth_headers,
        json={"name": "Renamed Analytics Hub", "description": "New description"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Renamed Analytics Hub"

    # 2. Delete workspace
    res_del = client.delete(
        f"/api/v1/workspaces/{test_workspace.id}",
        headers=user_auth_headers,
    )
    assert res_del.status_code == 200
    assert res_del.json()["deleted"] is True


def test_update_member_role_and_remove_member(
    client: TestClient,
    user_auth_headers: dict[str, str],
    test_workspace: Workspace,
    mock_db: Database,
) -> None:
    user_repo = UserRepository(db=mock_db)
    team_user = user_repo.create(
        User(
            email="teammate@company.com",
            full_name="Teammate",
            hashed_password=hash_password("Password123!"),
        )
    )

    # Add member
    add_res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/members",
        headers=user_auth_headers,
        json={"email": "teammate@company.com", "role": "viewer"},
    )
    assert add_res.status_code == 201

    # Update member role to member
    role_res = client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/members/{team_user.id}",
        headers=user_auth_headers,
        json={"role": "member"},
    )
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "member"

    # Remove member
    rem_res = client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/members/{team_user.id}",
        headers=user_auth_headers,
    )
    assert rem_res.status_code == 200
    assert rem_res.json()["removed"] is True
