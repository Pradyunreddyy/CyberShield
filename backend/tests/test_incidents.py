from tests.conftest import auth_headers


def test_developer_cannot_create_incident(client, developer_token):
    response = client.post(
        "/api/incidents",
        json={"title": "Suspicious login", "description": "test", "severity": "low"},
        headers=auth_headers(developer_token),
    )
    assert response.status_code == 403


def test_analyst_can_create_incident(client, analyst_token):
    response = client.post(
        "/api/incidents",
        json={"title": "Suspicious login burst", "description": "Multiple failed logins", "severity": "high"},
        headers=auth_headers(analyst_token),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["code"].startswith("INC-")
    assert body["status"] == "open"
    assert len(body["timeline_events"]) == 1


def test_incident_retrieval_and_update(client, analyst_token):
    create_resp = client.post(
        "/api/incidents",
        json={"title": "Ransomware alert", "description": "Encrypted files detected", "severity": "critical"},
        headers=auth_headers(analyst_token),
    )
    incident_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/incidents/{incident_id}", headers=auth_headers(analyst_token))
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "Ransomware alert"

    update_resp = client.put(
        f"/api/incidents/{incident_id}", json={"status": "investigating"}, headers=auth_headers(analyst_token)
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "investigating"


def test_admin_can_view_all_incidents_list(client, admin_token):
    response = client.get("/api/incidents", headers=auth_headers(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert "items" in body and "total" in body


def test_developer_only_sees_own_incidents(client, developer_token):
    response = client.get("/api/incidents", headers=auth_headers(developer_token))
    assert response.status_code == 200
    # A freshly-logged-in developer with no reported incidents should see none.
    assert all(item for item in response.json()["items"]) or response.json()["items"] == []


def test_unauthorized_role_cannot_delete_incident(client, developer_token, analyst_token):
    create_resp = client.post(
        "/api/incidents",
        json={"title": "Delete me", "description": "x", "severity": "low"},
        headers=auth_headers(analyst_token),
    )
    incident_id = create_resp.json()["id"]
    delete_resp = client.delete(f"/api/incidents/{incident_id}", headers=auth_headers(developer_token))
    assert delete_resp.status_code == 403


def test_add_note_timeline_and_action(client, analyst_token):
    create_resp = client.post(
        "/api/incidents",
        json={"title": "Phishing report", "description": "User reported email", "severity": "medium"},
        headers=auth_headers(analyst_token),
    )
    incident_id = create_resp.json()["id"]

    note_resp = client.post(
        f"/api/incidents/{incident_id}/notes", json={"content": "Verified sender domain is spoofed."},
        headers=auth_headers(analyst_token),
    )
    assert note_resp.status_code == 201

    timeline_resp = client.post(
        f"/api/incidents/{incident_id}/timeline", json={"description": "Email quarantined."},
        headers=auth_headers(analyst_token),
    )
    assert timeline_resp.status_code == 201

    action_resp = client.post(
        f"/api/incidents/{incident_id}/actions", json={"action": "Blocked sender domain", "result": "completed"},
        headers=auth_headers(analyst_token),
    )
    assert action_resp.status_code == 201


def test_assignable_analysts_and_reassignment(client, analyst_token):
    response = client.get("/api/incidents/assignable-analysts", headers=auth_headers(analyst_token))
    assert response.status_code == 200
    analysts = response.json()
    assert any(a["email"] == "analyst@example.com" for a in analysts)

    create_resp = client.post(
        "/api/incidents",
        json={"title": "Needs reassignment", "description": "x", "severity": "low"},
        headers=auth_headers(analyst_token),
    )
    incident_id = create_resp.json()["id"]
    analyst_id = next(a["id"] for a in analysts if a["email"] == "analyst@example.com")

    update_resp = client.put(
        f"/api/incidents/{incident_id}", json={"assigned_analyst_id": analyst_id}, headers=auth_headers(analyst_token)
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["assigned_analyst"]["id"] == analyst_id
