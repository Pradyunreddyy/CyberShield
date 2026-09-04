import os
import tempfile

# Configure the environment BEFORE the app is imported anywhere.
_TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "incident_platform_test.db")
if os.path.exists(_TEST_DB_PATH):
    os.remove(_TEST_DB_PATH)

os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["AI_PROVIDER"] = "disabled"  # deterministic fallback behaviour, no network calls in tests
os.environ["ENABLE_DEMO_SEED"] = "true"
os.environ["UPLOAD_TMP_DIR"] = os.path.join(tempfile.gettempdir(), "incident_platform_test_uploads")
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

import pytest
from fastapi.testclient import TestClient

from app.main import app

DEMO_PASSWORDS = {
    "admin@example.com": "AdminDemo123!",
    "analyst@example.com": "AnalystDemo123!",
    "developer@example.com": "DeveloperDemo123!",
}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture()
def admin_token(client):
    return _login(client, "admin@example.com", DEMO_PASSWORDS["admin@example.com"])


@pytest.fixture()
def analyst_token(client):
    return _login(client, "analyst@example.com", DEMO_PASSWORDS["analyst@example.com"])


@pytest.fixture()
def developer_token(client):
    return _login(client, "developer@example.com", DEMO_PASSWORDS["developer@example.com"])


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
