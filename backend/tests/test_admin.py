from tests.conftest import auth_headers


def test_non_admin_cannot_list_users(client, analyst_token, developer_token):
    for token in (analyst_token, developer_token):
        response = client.get("/api/admin/users", headers=auth_headers(token))
        assert response.status_code == 403


def test_admin_can_list_users(client, admin_token):
    response = client.get("/api/admin/users", headers=auth_headers(admin_token))
    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert "admin@example.com" in emails


def test_admin_can_create_user_with_role(client, admin_token):
    response = client.post(
        "/api/admin/users",
        json={"full_name": "New Analyst", "email": "new.analyst@example.com", "password": "SuperSecret123!", "role": "analyst"},
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 201, response.text
    assert response.json()["role"] == "analyst"


def test_admin_can_change_user_role_and_disable(client, admin_token):
    create_resp = client.post(
        "/api/admin/users",
        json={"full_name": "Temp User", "email": "temp.user@example.com", "password": "SuperSecret123!", "role": "developer"},
        headers=auth_headers(admin_token),
    )
    user_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/api/admin/users/{user_id}", json={"role": "analyst", "is_active": False}, headers=auth_headers(admin_token)
    )
    assert update_resp.status_code == 200
    body = update_resp.json()
    assert body["role"] == "analyst"
    assert body["is_active"] is False


def test_disabled_user_cannot_login(client, admin_token):
    create_resp = client.post(
        "/api/admin/users",
        json={"full_name": "Disabled User", "email": "disabled.user@example.com", "password": "SuperSecret123!", "role": "developer"},
        headers=auth_headers(admin_token),
    )
    user_id = create_resp.json()["id"]
    client.put(f"/api/admin/users/{user_id}", json={"is_active": False}, headers=auth_headers(admin_token))

    login_resp = client.post(
        "/api/auth/login", json={"email": "disabled.user@example.com", "password": "SuperSecret123!"}
    )
    assert login_resp.status_code == 403


def test_admin_can_view_audit_logs(client, admin_token):
    response = client.get("/api/admin/audit-logs", headers=auth_headers(admin_token))
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_non_admin_cannot_view_audit_logs(client, analyst_token):
    response = client.get("/api/admin/audit-logs", headers=auth_headers(analyst_token))
    assert response.status_code == 403
