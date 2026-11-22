from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.models.user import User


def test_admin_metrics_and_user_management(
    client: TestClient, admin_auth_headers: dict[str, str], user_auth_headers: dict[str, str], test_user: User
) -> None:
    # 1. Non-admin user accessing admin metrics should be rejected (403)
    res_forbidden = client.get("/api/v1/admin/metrics", headers=user_auth_headers)
    assert res_forbidden.status_code == 403

    # 2. Admin accessing metrics succeeds (200)
    res_metrics = client.get("/api/v1/admin/metrics", headers=admin_auth_headers)
    assert res_metrics.status_code == 200
    data = res_metrics.json()
    assert "users" in data
    assert "queries" in data
    assert "governance" in data

    # 3. Admin listing users
    res_users = client.get("/api/v1/admin/users", headers=admin_auth_headers)
    assert res_users.status_code == 200
    users = res_users.json()
    assert isinstance(users, list)
    assert len(users) >= 1

    # 4. Admin updating user status
    res_status = client.put(
        f"/api/v1/admin/users/{test_user.id}/status",
        headers=admin_auth_headers,
        json={"is_active": False},
    )
    assert res_status.status_code == 200

    # Verify deactivation works
    res_status_reactivate = client.put(
        f"/api/v1/admin/users/{test_user.id}/status",
        headers=admin_auth_headers,
        json={"is_active": True},
    )
    assert res_status_reactivate.status_code == 200


def test_admin_direct_query(client: TestClient, admin_auth_headers: dict[str, str]) -> None:
    # Test query validation
    res_empty = client.post(
        "/api/v1/admin/direct-query",
        headers=admin_auth_headers,
        json={"query": "   "},
    )
    assert res_empty.status_code == 400
