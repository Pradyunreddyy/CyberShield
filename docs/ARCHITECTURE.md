# Architecture

## High-level overview

```
┌─────────────────┐        HTTPS/JSON (REST)        ┌──────────────────────┐
│   React (Vite)   │ ───────────────────────────────▶ │   FastAPI backend    │
│   Frontend        │ ◀─────────────────────────────── │   (JWT-protected)    │
│   (Vercel)        │                                   │   (Render)            │
└─────────────────┘                                   └──────────┬───────────┘
                                                                    │
                                        ┌───────────────────────────┼───────────────────────────┐
                                        │                            │                            │
                               ┌────────▼────────┐          ┌────────▼────────┐         ┌────────▼────────┐
                               │   PostgreSQL      │          │  AI Provider     │         │  Local temp      │
                               │   (Render)         │          │  (Anthropic/     │         │  upload storage  │
                               │                    │          │   OpenAI API)    │         │  (scan sandbox)  │
                               └────────────────────┘          └──────────────────┘         └──────────────────┘
```

The backend is a single FastAPI service; there is deliberately no microservice split, per the project's "don't overengineer" requirement. Everything the frontend needs — auth, incidents, AI analysis, the Project Security Analyzer, analytics, alerts, and admin — is exposed through one versioned REST API under `/api`.

## Backend module layout

```
backend/app/
  core/         # settings (env vars), password hashing, JWT
  database/     # SQLAlchemy engine/session/declarative base
  models/       # ORM models (User, Incident, ProjectScan, ScanFinding, Alert, AuditLog, ...)
  schemas/      # Pydantic request/response schemas
  repositories/ # Pure DB access (no business logic)
  services/     # Business logic (incident lifecycle, dashboard/analytics aggregation, scan orchestration, audit, alerts)
  ai/           # Pluggable AI provider (Anthropic/OpenAI/disabled) + AIService
  scanners/     # File validation, safe archive extraction, static analysis, dependency analysis
  api/routes/   # FastAPI routers - one file per resource
  main.py       # App wiring: CORS, error handlers, router registration, startup
```

This is a fairly standard layered architecture:

**Route → Service → Repository → Model**

Routes only handle HTTP concerns (parsing input, checking role dependencies, returning schemas). Services hold business rules (e.g. "creating a critical incident also creates an alert"). Repositories are thin, testable data-access functions. This separation is what lets `tests/` exercise business logic through the real HTTP layer while still being fast (SQLite in-memory-style file DB, no network calls).

## Data flow: Project Security Analyzer → Incident

This is the connective tissue between the two halves of the platform:

1. A developer uploads a `.zip` via `POST /api/scans`.
2. `scanners/file_validator.py` checks extension + magic bytes, enforces the size limit, and stores the file under a **randomized** server-side name.
3. `scanners/archive_handler.py` extracts it into a temp directory, rejecting path-traversal entries, absolute paths, symlinks, and archives that are too large/have too many entries (zip-bomb protection).
4. `scanners/static_analyzer.py` and `scanners/dependency_analyzer.py` scan the extracted **text** files with regex-based rules (never executing anything).
5. High/critical findings are optionally sent to `ai/ai_service.py` for a plain-language explanation.
6. Findings and the scan record are persisted (`ProjectScan`, `ScanFinding`).
7. From a finding, `POST /api/scans/{scan_id}/findings/{finding_id}/create-incident` calls `incident_service.create_incident_from_finding`, which creates an `Incident` row with `source="project_scanner"` and a foreign key back to the originating `ScanFinding` — preserving the full trail from upload to resolution.

## Frontend module layout

```
frontend/src/
  api/          # axios client + typed endpoint wrappers
  context/      # AuthContext (JWT/session), ToastContext (notifications)
  hooks/        # useAuth
  layouts/      # DashboardLayout (sidebar+topbar), AuthLayout (login/register)
  components/   # Sidebar, TopBar, Badges, StatCard, Form controls, Modal, Primitives
  pages/        # One file per route; admin/ subfolder for admin-only pages
```

Role-based UI (hiding the "Create Incident" button from developers, hiding Analytics/Admin nav items) is a **convenience**, not a security boundary — every one of those actions is independently re-checked by the backend's `require_roles(...)` dependencies. A developer who crafts a raw API request to `POST /api/incidents` still gets a `403`.

## Why these design tokens

The UI is designed to read as an internal SOC tool rather than a marketing site: a near-black base, hairline borders instead of drop shadows, a signal-blue accent for interactive elements, and a strict, colorblind-safe severity palette (critical/high/medium/low) reused identically across badges and charts. Monospace type (`JetBrains Mono`) is reserved for scannable, tabular data — incident codes, timestamps, IPs, code snippets — while `Inter` handles everything else. This mirrors how real SOC/SIEM tooling separates "data you scan" from "prose you read."
