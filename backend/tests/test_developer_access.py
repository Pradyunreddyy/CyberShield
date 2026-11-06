"""Developer workflow: report incidents, view/analyze only their own, nothing else.

These exercise the API directly: the backend, not the UI, is what enforces access.
"""
import uuid

from app.database.session import SessionLocal
from app.models.incident import Incident
from app.models.scan import AIAnalysis
from tests.conftest import auth_headers

ANALYZE = "/api/ai/analyze-incident"


def _me(client, token):
    return client.get("/api/auth/me", headers=auth_headers(token)).json()


def _create(client, token, title="Reported incident", **extra):
    body = {"title": title, "description": "Repeated failed logins from one address.", "severity": "medium", **extra}
    return client.post("/api/incidents", json=body, headers=auth_headers(token))


def _analyze(client, token, incident_id=None, description="Repeated failed logins from one address."):
    body = {"description": description}
    if incident_id:
        body["incident_id"] = incident_id
    return client.post(ANALYZE, json=body, headers=auth_headers(token))


def _second_developer(client):
    email = f"dev2.{uuid.uuid4().hex[:8]}@example.com"
    password = "SecondDev-Pass-123!"
    reg = client.post("/api/auth/register", json={"full_name": "Second Developer", "email": email, "password": password})
    assert reg.status_code in (200, 201), reg.text
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def _ai_rows(incident_id):
    with SessionLocal() as db:
        return db.query(AIAnalysis).filter(AIAnalysis.incident_id == incident_id).count()


# ---- creating ---------------------------------------------------------------
def test_developer_creates_incident_as_reporter(client, developer_token):
    me = _me(client, developer_token)
    response = _create(client, developer_token, "Developer-reported phishing email")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["reporter"]["id"] == me["id"]
    assert body["source"] == "manual"

    # Persisted with the authenticated developer as reporter (checked in the database itself).
    with SessionLocal() as db:
        row = db.query(Incident).filter(Incident.id == body["id"]).one()
        assert row.reporter_id == me["id"]
        assert row.assigned_analyst_id is None


def test_developer_can_open_and_list_their_own_incident(client, developer_token):
    created = _create(client, developer_token, "My own incident").json()
    detail = client.get(f"/api/incidents/{created['id']}", headers=auth_headers(developer_token))
    assert detail.status_code == 200
    listed = client.get("/api/incidents", headers=auth_headers(developer_token)).json()["items"]
    assert created["id"] in [i["id"] for i in listed]


def test_developer_cannot_assign_an_analyst_when_creating(client, developer_token, analyst_token):
    analyst_id = _me(client, analyst_token)["id"]
    response = _create(client, developer_token, "Sneaky assignment", assigned_analyst_id=analyst_id)
    assert response.status_code == 403
    # ...and nothing was saved.
    with SessionLocal() as db:
        assert db.query(Incident).filter(Incident.title == "Sneaky assignment").count() == 0


def test_analyst_can_still_assign_when_creating(client, analyst_token):
    analyst_id = _me(client, analyst_token)["id"]
    response = _create(client, analyst_token, "Analyst assigns", assigned_analyst_id=analyst_id)
    assert response.status_code == 201
    assert response.json()["assigned_analyst"]["id"] == analyst_id


# ---- visibility -------------------------------------------------------------
def test_developer_cannot_view_other_users_incidents(client, developer_token, analyst_token):
    others = _create(client, analyst_token, "Analyst's incident").json()
    assert client.get(f"/api/incidents/{others['id']}", headers=auth_headers(developer_token)).status_code == 403

    other_dev_token = _second_developer(client)
    other_dev = _create(client, other_dev_token, "Other developer's incident").json()
    assert client.get(f"/api/incidents/{other_dev['id']}", headers=auth_headers(developer_token)).status_code == 403
    titles = [i["title"] for i in client.get("/api/incidents", headers=auth_headers(developer_token)).json()["items"]]
    assert "Other developer's incident" not in titles


# ---- AI analyzer ------------------------------------------------------------
def test_developer_can_analyze_their_own_incident(client, developer_token):
    incident = _create(client, developer_token, "Analyze me").json()
    before = _ai_rows(incident["id"])
    response = _analyze(client, developer_token, incident["id"])
    assert response.status_code == 200, response.text
    assert response.json()["degraded"] is True  # AI_PROVIDER=disabled in tests -> labelled fallback
    assert _ai_rows(incident["id"]) == before + 1


def test_developer_cannot_analyze_another_users_incident(client, developer_token, analyst_token):
    analyst_incident = _create(client, analyst_token, "Not the developer's").json()
    other_dev_incident = _create(client, _second_developer(client), "Another developer's").json()
    for target in (analyst_incident, other_dev_incident):
        before = _ai_rows(target["id"])
        response = _analyze(client, developer_token, target["id"])
        assert response.status_code == 403
        assert _ai_rows(target["id"]) == before  # denied before the AI is called or anything is stored


def test_developer_analyze_denials_do_not_reveal_which_ids_exist(client, developer_token, analyst_token):
    real_but_not_theirs = _create(client, analyst_token, "Exists, not theirs").json()["id"]
    responses = [
        _analyze(client, developer_token, real_but_not_theirs),  # exists, not theirs
        _analyze(client, developer_token, str(uuid.uuid4())),  # does not exist
        _analyze(client, developer_token),  # free text, no incident
    ]
    assert [r.status_code for r in responses] == [403, 403, 403]
    assert len({r.json()["detail"] for r in responses}) == 1


def test_analyst_and_admin_can_analyze_any_incident_and_free_text(client, developer_token, analyst_token, admin_token):
    developer_incident = _create(client, developer_token, "Developer's, analysed by staff").json()["id"]
    for token in (analyst_token, admin_token):
        assert _analyze(client, token, developer_incident).status_code == 200
        assert _analyze(client, token).status_code == 200  # free-form text without an incident id


# ---- restricted management operations --------------------------------------
def test_developer_cannot_use_incident_management_operations(client, developer_token):
    incident_id = _create(client, developer_token, "Mine, but not mine to manage").json()["id"]
    headers = auth_headers(developer_token)
    base = f"/api/incidents/{incident_id}"
    assert client.put(base, json={"status": "resolved"}, headers=headers).status_code == 403
    assert client.delete(base, headers=headers).status_code == 403
    assert client.post(f"{base}/notes", json={"content": "x"}, headers=headers).status_code == 403
    assert client.post(f"{base}/timeline", json={"description": "x"}, headers=headers).status_code == 403
    assert client.post(f"{base}/actions", json={"action": "Blocked IP", "result": "completed"}, headers=headers).status_code == 403
    assert client.get("/api/incidents/assignable-analysts", headers=headers).status_code == 403
    # the incident is untouched
    assert client.get(base, headers=headers).json()["status"] == "open"