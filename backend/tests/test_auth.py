from fastapi.testclient import TestClient

from app.models.user import User


def test_register_new_user(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "analyst@company.com",
            "full_name": "Data Analyst",
            "password": "SecurePassword123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "analyst@company.com"
    assert data["user"]["full_name"] == "Data Analyst"
    assert data["user"]["default_workspace_id"] is not None


def test_register_duplicate_user_fails(client: TestClient) -> None:
    payload = {
        "email": "duplicate@company.com",
        "full_name": "Duplicate User",
        "password": "SecurePassword123!",
    }
    # First registration
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with same email
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_login_success(client: TestClient) -> None:
    # Register
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@test.com",
            "full_name": "User",
            "password": "MyPassword123!",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "MyPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "user@test.com"


def test_login_invalid_password(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "user2@test.com",
            "full_name": "User 2",
            "password": "CorrectPassword123!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user2@test.com", "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_get_current_user_me(
    client: TestClient, user_auth_headers: dict[str, str], test_user: User
) -> None:
    response = client.get("/api/v1/auth/me", headers=user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user.id
    assert data["email"] == test_user.email


def test_get_current_user_unauthorized(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
