import os
from collections.abc import Generator
from typing import cast

import mongomock
import pytest
from fastapi.testclient import TestClient
from pymongo.database import Database

from app.core.auth import create_access_token, hash_password
from app.core.config import Settings, get_settings
from app.core.database import init_metadata_indexes, set_test_database
from app.main import create_app
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceRole
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    os.environ["APP_ENV"] = "test"
    os.environ["DEBUG"] = "true"
    os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-chars-long"
    os.environ["ENCRYPTION_KEY"] = "dGhpcy1pcy1hLWR1bW15LWtleS1mb3ItZGV2LW9ubHk="
    os.environ["LLM_PROVIDER"] = "mock"
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture(autouse=True)
def mock_db() -> Generator[Database, None, None]:
    """Provide a fresh, clean in-memory MongoDB database for each test."""
    client: mongomock.MongoClient = mongomock.MongoClient()
    db = cast(Database, client["test_nlp_query_engine_meta"])
    set_test_database(db)
    init_metadata_indexes(db)
    yield db
    set_test_database(None)


@pytest.fixture
def client(test_settings: Settings) -> TestClient:
    app = create_app()
    return TestClient(app)


@pytest.fixture
def test_user(mock_db: Database) -> User:
    repo = UserRepository(db=mock_db)
    user = User(
        email="architect@example.com",
        full_name="Principal Architect",
        hashed_password=hash_password("Password123!"),
    )
    return repo.create(user)


@pytest.fixture
def user_auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token({"sub": test_user.id, "email": test_user.email, "is_superuser": False})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(mock_db: Database) -> User:
    repo = UserRepository(db=mock_db)
    user = User(
        email="superadmin@example.com",
        full_name="System Administrator",
        hashed_password=hash_password("SuperSecretAdmin123!"),
        is_superuser=True,
    )
    return repo.create(user)


@pytest.fixture
def admin_auth_headers(admin_user: User) -> dict[str, str]:
    token = create_access_token({"sub": admin_user.id, "email": admin_user.email, "is_superuser": True})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_workspace(test_user: User, mock_db: Database) -> Workspace:
    repo = WorkspaceRepository(db=mock_db)
    ws = Workspace(
        name="Production Workspace",
        description="Main production analytics workspace",
        owner_id=test_user.id,
    )
    created = repo.create(ws)
    repo.add_member(created.id, test_user.id, role=WorkspaceRole.ADMIN)
    return created
