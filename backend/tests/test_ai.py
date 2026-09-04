from tests.conftest import auth_headers


def test_developer_cannot_use_ai_analyzer(client, developer_token):
    response = client.post(
        "/api/ai/analyze-incident", json={"description": "Multiple failed logins then success"},
        headers=auth_headers(developer_token),
    )
    assert response.status_code == 403


def test_analyst_can_use_ai_analyzer_with_graceful_fallback(client, analyst_token):
    response = client.post(
        "/api/ai/analyze-incident",
        json={"description": "Multiple failed login attempts followed by a successful login from a new country."},
        headers=auth_headers(analyst_token),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    # AI_PROVIDER=disabled in tests, so the endpoint must degrade gracefully rather than fail.
    assert body["degraded"] is True
    assert "disclaimer" in body
    assert "advisory" in body["disclaimer"].lower()
    assert body["risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")


def test_ai_analyzer_validates_input_length(client, analyst_token):
    response = client.post(
        "/api/ai/analyze-incident", json={"description": "hi"}, headers=auth_headers(analyst_token)
    )
    assert response.status_code == 422
