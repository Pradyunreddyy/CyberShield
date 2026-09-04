from tests.conftest import DEMO_PASSWORDS, auth_headers


def test_register_creates_developer_account(client):
    response = client.post(
        "/api/auth/register",
        json={"full_name": "Test User", "email": "newdev@example.com", "password": "SuperSecret123!"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user"]["role"] == "developer"
    assert "access_token" in body


def test_register_duplicate_email_fails(client):
    client.post(
        "/api/auth/register",
        json={"full_name": "Dup", "email": "dup@example.com", "password": "SuperSecret123!"},
    )
    response = client.post(
        "/api/auth/register",
        json={"full_name": "Dup2", "email": "dup@example.com", "password": "SuperSecret123!"},
    )
    assert response.status_code == 409


def test_login_success(client):
    response = client.post(
        "/api/auth/login", json={"email": "admin@example.com", "password": DEMO_PASSWORDS["admin@example.com"]}
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_login_invalid_credentials(client):
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "wrong-password"})
    assert response.status_code == 401


def test_protected_route_requires_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_protected_route_rejects_invalid_token(client):
    response = client.get("/api/auth/me", headers=auth_headers("this-is-not-a-valid-jwt"))
    assert response.status_code == 401


def test_me_returns_current_user(client, admin_token):
    response = client.get("/api/auth/me", headers=auth_headers(admin_token))
    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"
