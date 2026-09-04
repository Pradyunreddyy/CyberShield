import io
import zipfile

from app.core.config import settings
from tests.conftest import auth_headers


def _build_test_zip(files: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buffer.getvalue()


def test_reject_non_zip_extension(client, developer_token):
    response = client.post(
        "/api/scans",
        files={"file": ("malware.exe", b"MZ\x90\x00fake-binary", "application/octet-stream")},
        headers=auth_headers(developer_token),
    )
    assert response.status_code == 415


def test_reject_file_too_large(client, developer_token, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_MAX_SIZE_BYTES", 10)  # 10 bytes, trivially exceeded
    zip_bytes = _build_test_zip({"main.py": "print('hello world, this is bigger than 10 bytes')"})
    response = client.post(
        "/api/scans",
        files={"file": ("project.zip", zip_bytes, "application/zip")},
        headers=auth_headers(developer_token),
    )
    assert response.status_code == 413


def test_upload_and_scan_detects_suspicious_pattern(client, developer_token):
    zip_bytes = _build_test_zip(
        {
            "app/server.py": "import os\ncmd = input()\nos.system(cmd)\n",
            "app/README.md": "A safe file with no issues.\n",
        }
    )
    response = client.post(
        "/api/scans",
        files={"file": ("example-project.zip", zip_bytes, "application/zip")},
        headers=auth_headers(developer_token),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "completed"
    assert body["files_scanned"] >= 2
    assert body["overall_risk"] in ("high", "critical")
    assert any(f["finding_type"] == "OS command execution" for f in body["findings"])


def test_developer_cannot_view_others_scan(client, developer_token, analyst_token):
    zip_bytes = _build_test_zip({"safe.py": "print('all good')\n"})
    upload_resp = client.post(
        "/api/scans", files={"file": ("safe.zip", zip_bytes, "application/zip")}, headers=auth_headers(analyst_token)
    )
    scan_id = upload_resp.json()["id"]
    response = client.get(f"/api/scans/{scan_id}", headers=auth_headers(developer_token))
    assert response.status_code == 403


def test_create_incident_from_finding(client, developer_token):
    zip_bytes = _build_test_zip({"server.js": "const { exec } = require('child_process'); exec(userInput);"})
    upload_resp = client.post(
        "/api/scans", files={"file": ("node-app.zip", zip_bytes, "application/zip")}, headers=auth_headers(developer_token)
    )
    scan = upload_resp.json()
    assert len(scan["findings"]) >= 1
    finding_id = scan["findings"][0]["id"]

    incident_resp = client.post(
        f"/api/scans/{scan['id']}/findings/{finding_id}/create-incident",
        json={},
        headers=auth_headers(developer_token),
    )
    assert incident_resp.status_code == 201, incident_resp.text
    incident = incident_resp.json()
    assert incident["source"] == "project_scanner"
    assert incident["source_finding_id"] == finding_id
