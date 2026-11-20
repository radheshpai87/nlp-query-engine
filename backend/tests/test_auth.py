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


def test_update_profile_and_change_password(
    client: TestClient, user_auth_headers: dict[str, str], test_user: User
) -> None:
    # 1. Update profile
    res = client.put(
        "/api/v1/auth/profile",
        headers=user_auth_headers,
        json={"full_name": "Updated Full Name", "onboarding_completed": True},
    )
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Full Name"
    assert res.json()["onboarding_completed"] is True

    # 2. Change password
    res_pw = client.post(
        "/api/v1/auth/change-password",
        headers=user_auth_headers,
        json={"current_password": "Password123!", "new_password": "NewSecretPassword456!"},
    )
    assert res_pw.status_code == 200
    assert res_pw.json()["status"] == "success"

    # 3. Verify login with new password
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "NewSecretPassword456!"},
    )
    assert res_login.status_code == 200


def test_forgot_and_reset_password_flow(client: TestClient) -> None:
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "reset_test@company.com",
            "full_name": "Reset Test User",
            "password": "OldPassword123!",
        },
    )

    # Request forgot password
    res_forgot = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset_test@company.com"},
    )
    assert res_forgot.status_code == 200
    token = res_forgot.json()["reset_token"]
    assert token

    # Reset password with token
    res_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "BrandNewPassword999!"},
    )
    assert res_reset.status_code == 200
    assert res_reset.json()["status"] == "success"

    # Verify login with new password
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "reset_test@company.com", "password": "BrandNewPassword999!"},
    )
    assert res_login.status_code == 200
