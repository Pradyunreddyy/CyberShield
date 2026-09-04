# AI-Assisted Cybersecurity Incident Response Platform

A full-stack Security Operations Center (SOC) platform for recording, investigating, and resolving cybersecurity incidents — with an AI Incident Analyzer and an integrated Project Security Analyzer that turns suspicious code findings directly into tracked incidents.

**Stack:** React (Vite) · FastAPI (Python) · PostgreSQL · JWT Auth · Anthropic/OpenAI API · Vercel (frontend) · Render (backend)

---

## Table of Contents

1. [Features](#features)
2. [User Roles](#user-roles)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Local Setup](#local-setup)
6. [Environment Variables](#environment-variables)
7. [Running Tests](#running-tests)
8. [API Documentation](#api-documentation)
9. [Docker](#docker)
10. [Git & GitHub Workflow](#git--github-workflow)
11. [Deployment: PostgreSQL + Render (Backend)](#deployment-postgresql--render-backend)
12. [Deployment: Vercel (Frontend)](#deployment-vercel-frontend)
13. [Common Deployment Errors](#common-deployment-errors)
14. [Final Testing Checklist](#final-testing-checklist)
15. [Demonstration Sequence](#demonstration-sequence)
16. [Where AI Is Used](#where-ai-is-used)
17. [Project Security Analyzer ↔ Incident Response](#project-security-analyzer--incident-response)
18. [Security Considerations](#security-considerations)

---

## Features

- **Incident Management** — full lifecycle (Open → Investigating → Contained → Resolved → Closed) with search, filters, sorting, pagination, notes, timeline, and response actions.
- **AI Incident Analyzer** — sends incident description/logs/indicators to an LLM and returns a structured, advisory risk assessment (never a final verdict — a human analyst always decides).
- **Project Security Analyzer** — upload a `.zip` project for **safe, static** analysis (no code is ever executed); flags suspicious patterns, hardcoded secrets, risky dependencies, and lets an analyst or developer convert a finding directly into a tracked incident.
- **SOC Dashboard** — live summary cards and charts, with clearly-labeled demo data shown until real incidents exist.
- **Analytics** — incidents by severity/type/status, trends over time, average resolution time, scan statistics.
- **Alerts** — automatic alerts for critical incidents, suspicious scans, reassignments, and status changes, with read/unread state.
- **Admin Panel** — user management (create, disable, change roles), audit logs, and a platform settings/overview page.
- **Audit Logging** — every security-relevant action (login, incident changes, uploads, role changes, etc.) is recorded, with secrets automatically stripped.
- **JWT Auth + Backend-Enforced RBAC** — the backend independently re-checks every permission; the frontend hiding a button is a convenience, never the security boundary.

## User Roles

| Role | Can do |
|---|---|
| **Developer** | Register/login, view their dashboard, upload projects to the Project Security Analyzer, view findings + AI explanations, create an incident from a serious finding, view *only* incidents/scans they created, view their profile. |
| **Security Analyst** | Everything above the incident-response workflow: create/update/assign incidents, investigate (notes, timeline, response actions), run the AI Incident Analyzer, review all project scans, view analytics and alerts. |
| **Administrator** | Everything an analyst can do, plus: manage users (create, disable, change roles), view all incidents/scans, view audit logs, and platform settings. |

Demo accounts (seeded automatically on first run against an empty database):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `AdminDemo123!` |
| Analyst | `analyst@example.com` | `AnalystDemo123!` |
| Developer | `developer@example.com` | `DeveloperDemo123!` |

> ⚠️ These are demo passwords for local/evaluation use only. Change them (or set `ENABLE_DEMO_SEED=false`) before any real deployment.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full breakdown of the module layout and data flow. In short: a single FastAPI backend (Route → Service → Repository → Model) talks to PostgreSQL and an external AI provider; the React frontend talks only to the backend's REST API — it never touches the database or the AI API key directly.

## Project Structure

```
cybersecurity-incident-response-platform/
├── backend/
│   ├── app/
│   │   ├── core/            # config, security (hashing/JWT)
│   │   ├── database/        # SQLAlchemy session/engine/base
│   │   ├── models/          # ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── repositories/    # DB access
│   │   ├── services/        # business logic
│   │   ├── ai/              # pluggable AI provider + AIService
│   │   ├── scanners/        # upload validation, safe extraction, static/dependency analysis
│   │   ├── api/routes/      # FastAPI routers
│   │   ├── main.py
│   │   └── seed.py          # demo account seeding
│   ├── alembic/              # DB migrations
│   ├── tests/                 # pytest suite
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/, context/, hooks/, layouts/, components/, pages/
│   ├── package.json
│   ├── .env.example
│   └── vercel.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── SECURITY.md
├── postman/
│   └── cybersecurity-platform.postman_collection.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Local Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Git**
- (Optional) **PostgreSQL** 14+ locally, or use the included `docker-compose.yml`, or just use the SQLite default for a zero-config demo.

### 1. Clone and open in VS Code

```bash
git clone <your-repo-url>
cd cybersecurity-incident-response-platform
code .
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux
```

Edit `.env`:
- Leave `DATABASE_URL=sqlite:///./dev.db` for a zero-config local run, **or** point it at a local/Docker Postgres instance.
- Set a real `JWT_SECRET_KEY` (any long random string is fine for local dev).
- Add your `AI_API_KEY` if you want live AI responses; leave `AI_PROVIDER=disabled` to test the graceful-fallback path with no key at all.

Run database migrations (creates all tables):

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

On first startup against an empty database, the three demo accounts above are created automatically.

### 3. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux
npm run dev
```

- Frontend: http://localhost:5173

Log in with any demo account and you're in.

## Environment Variables

**Backend (`backend/.env`)** — see `backend/.env.example` for the full annotated list:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (SQLite for local, PostgreSQL in production) |
| `JWT_SECRET_KEY` | Signs/verifies JWT access tokens — must be a long random secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `CORS_ORIGINS` | Comma-separated allow-list of frontend origins (never `*` in production) |
| `AI_PROVIDER` | `anthropic` \| `openai` \| `disabled` |
| `AI_API_KEY` | API key for the selected AI provider — **add your own key here** |
| `AI_MODEL` | Model name for the selected provider |
| `UPLOAD_MAX_SIZE_BYTES`, `UPLOAD_ALLOWED_EXTENSIONS`, `MAX_FILES_PER_ARCHIVE`, `MAX_UNCOMPRESSED_ARCHIVE_BYTES` | Project Security Analyzer upload limits |
| `ENABLE_DEMO_SEED` | Seed demo accounts on an empty database (`true`/`false`) |

**Frontend (`frontend/.env`)**:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend (local: `http://localhost:8000`; production: your Render URL) |

## Running Tests

```bash
cd backend
source .venv/bin/activate      # or .venv\Scripts\activate on Windows
pytest -v
```

The suite (30 tests) covers registration/login, JWT protection, role-based authorization on every sensitive route, incident CRUD + notes/timeline/actions, project upload validation (rejects wrong extensions and oversized files), static-analysis finding detection, scan → incident conversion, the AI endpoint's graceful degradation path, and admin user/audit-log management. Tests run against an isolated SQLite file and never hit a real AI provider (`AI_PROVIDER=disabled` in `tests/conftest.py`), so they're fast and fully deterministic.

You can also test the live API manually with the Postman collection at `postman/cybersecurity-platform.postman_collection.json` — import it, set the `base_url` variable, run **Auth → Login** first (it auto-populates `access_token` for every other request), then explore.

## API Documentation

FastAPI auto-generates interactive Swagger docs at **`/docs`** (and ReDoc at `/redoc`) from the route type hints and docstrings — every endpoint documents its request/response schemas, auth requirements, and error responses. This is what you should show your professor to demonstrate the API surface.

## Docker

To run the backend + PostgreSQL together locally without installing Postgres yourself:

```bash
docker compose up --build
```

This starts Postgres, waits for it to be healthy, runs Alembic migrations, and starts the backend on `http://localhost:8000`. The frontend is run separately with `npm run dev` (it's deployed to Vercel, not Docker, in production).

## Git & GitHub Workflow

```bash
git init
git add .
git commit -m "Initial commit: cybersecurity incident response platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

To create the GitHub repository: go to github.com → **New repository** → give it a name → **do not** initialize with a README (you already have one) → create → copy the HTTPS URL into the `git remote add origin` command above.

**Never commit:** `.env`, API keys, passwords, database credentials, JWT secrets, uploaded user files, `node_modules/`, Python virtual environments, or build output. All of these are already covered by the root `.gitignore`.

## Deployment: PostgreSQL + Render (Backend)

### Step 1 — Create the PostgreSQL database on Render

1. In the Render dashboard, click **New → PostgreSQL**.
2. Give it a name (e.g. `incident-platform-db`), choose a region, and create it.
3. Once provisioned, copy the **Internal Database URL** (if your backend will also run on Render — faster/free) or the **External Database URL** (if connecting from elsewhere).

### Step 2 — Create the Render Web Service (backend)

1. Push your code to GitHub first (see above).
2. In Render: **New → Web Service** → connect your GitHub repository.
3. **Root Directory:** `backend`
4. **Runtime:** Python 3
5. **Build Command:** `pip install -r requirements.txt`
6. **Start Command:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3 — Configure environment variables on Render

In the Web Service's **Environment** tab, add:

```
DATABASE_URL=<the Postgres URL from Step 1>
JWT_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(48))">
CORS_ORIGINS=https://<your-app>.vercel.app
AI_PROVIDER=anthropic
AI_API_KEY=<your AI provider API key>
AI_MODEL=claude-sonnet-4-6
ENVIRONMENT=production
ENABLE_DEMO_SEED=true
```

(You can leave `CORS_ORIGINS` as `http://localhost:5173` initially and update it after you have your Vercel URL in Step "Configure backend CORS" below.)

### Step 4 — Deploy and verify

1. Click **Create Web Service** (or **Manual Deploy** if it already exists). Render will install dependencies, run migrations, and start Uvicorn.
2. Check the **Logs** tab — you should see `Application startup complete` and the demo-seed log line.
3. Visit `https://<your-backend>.onrender.com/api/health` — should return `{"status": "ok"}`.
4. Visit `https://<your-backend>.onrender.com/docs` — Swagger UI should load.

## Deployment: Vercel (Frontend)

1. Push your code to GitHub (if not already done).
2. In Vercel: **Add New → Project** → import your GitHub repository.
3. **Root Directory:** `frontend`
4. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist` (defaults are correct).
5. **Environment Variables:** add `VITE_API_BASE_URL` = `https://<your-backend>.onrender.com`
6. Click **Deploy**.
7. Once deployed, visit your Vercel URL and confirm the login page loads.

### Configure backend CORS

Go back to your Render backend's environment variables and set:

```
CORS_ORIGINS=https://<your-app>.vercel.app
```

Save — Render will redeploy automatically. **Redeploy the frontend too if you changed `VITE_API_BASE_URL` after the first deploy**, since Vite bakes env vars in at build time.

### Verify the full production stack

Open your Vercel URL, log in with a demo account, and confirm the dashboard loads real data from the Render backend (open the browser's Network tab to confirm requests go to your Render URL, not `localhost`).

## Common Deployment Errors

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend shows a blank page / network errors in console | `VITE_API_BASE_URL` wasn't set (or was set after the build) | Set the env var in Vercel, then trigger a **new** deploy — Vite env vars are baked in at build time, not read at runtime. |
| `CORS policy: No 'Access-Control-Allow-Origin'` in browser console | Backend's `CORS_ORIGINS` doesn't include your Vercel domain | Update `CORS_ORIGINS` on Render to your exact Vercel URL (including `https://`, no trailing slash), redeploy. |
| Render backend crashes on boot with a DB connection error | `DATABASE_URL` missing/incorrect, or migrations haven't run | Confirm the env var matches the Postgres instance's connection string exactly; confirm the start command includes `alembic upgrade head`. |
| `401 Unauthorized` on every request after login | Clock skew or a `JWT_SECRET_KEY` that changed between deploys | Keep `JWT_SECRET_KEY` stable across deploys; don't regenerate it unless you intend to invalidate all sessions. |
| AI Incident Analyzer always returns "fallback" results | `AI_API_KEY` missing/invalid, or `AI_PROVIDER=disabled` | Set a valid key and provider on Render; the fallback is intentional — the app is designed to degrade gracefully rather than error out. |
| Project upload fails with 413 | File exceeds `UPLOAD_MAX_SIZE_BYTES` | Increase the env var, or use a smaller test archive. |
| `relation "users" does not exist` on first request | Migrations didn't run before the app started | Re-check the Render start command includes `alembic upgrade head &&` before the `uvicorn` command. |

## Final Testing Checklist

- [ ] Frontend runs locally (`npm run dev`)
- [ ] Backend runs locally (`uvicorn app.main:app --reload`)
- [ ] Database connects (SQLite by default, or Postgres via `DATABASE_URL`)
- [ ] Registration works (creates a `developer` account)
- [ ] Login works for all three roles
- [ ] JWT protection works (`/api/auth/me` returns 401 without a token)
- [ ] Role-based access works (developer gets 403 creating an incident; non-admin gets 403 on `/api/admin/*`)
- [ ] Incident creation and updates work
- [ ] Dashboard displays real data once incidents exist (and clearly-labeled demo data before that)
- [ ] AI Incident Analyzer returns a structured result (real or graceful fallback)
- [ ] Project upload works and rejects non-ZIP/oversized files
- [ ] Security analysis detects at least one seeded suspicious pattern
- [ ] A finding can be converted into an incident, and the link is visible on the incident
- [ ] Analytics charts render real data
- [ ] Alerts appear for critical incidents/suspicious scans and can be marked read
- [ ] Audit logs record key actions and never contain secrets
- [ ] `pytest` passes (30/30)
- [ ] Swagger UI (`/docs`) loads and documents every endpoint
- [ ] Docker Compose brings up backend + Postgres successfully
- [ ] Backend deploys to Render and `/api/health` responds
- [ ] Frontend deploys to Vercel and loads the login page
- [ ] Deployed frontend successfully talks to the deployed backend (not localhost)
- [ ] No secrets appear in the frontend bundle or GitHub repository
- [ ] Uploaded files are validated, randomly named, and cleaned up after scanning

## Demonstration Sequence

A ~10-minute walkthrough for your professor:

1. **Login as Developer** (`developer@example.com`)
2. Go to **Project Security Analyzer** → upload a sample `.zip` containing an obviously risky pattern (e.g. a file with `os.system(input())` or a hardcoded `AKIA...` key)
3. Show the **findings** — note the risk levels and the AI-generated plain-language explanation on high/critical findings
4. Click **Create Security Incident** on the top finding → note the new incident code (e.g. `INC-1002`)
5. **Log out, log in as Security Analyst** (`analyst@example.com`)
6. Open the new incident from **Incidents** → walk through the **Overview**, **Investigation**, and **Timeline** tabs (the timeline already shows automatic system events)
7. Go to the **AI Analyzer** tab → run it against the incident description → show the structured risk assessment and the "advisory only" disclaimer
8. Add a **Response Action** (e.g. "Isolated machine") and change the status to **Resolved**
9. Open the **Dashboard** → show updated summary cards and charts reflecting the new incident
10. Open **Analytics** → show severity/type/status breakdowns and average resolution time
11. **Log out, log in as Admin** (`admin@example.com`)
12. Show **Users** (create or disable a user) and **Audit Logs** (find the entries for everything just demonstrated)
13. Open the backend's **Swagger UI** (`/docs`) and show the full documented API surface

**What each team member can demonstrate**, if working in a group:
- *Backend/API member*: Swagger UI, authentication & RBAC, database schema, the AI service's graceful-fallback design.
- *Frontend member*: the dashboard, incident workflow UI, role-based navigation, charts.
- *Security/analysis member*: the Project Security Analyzer's safety measures (no code execution, path-traversal/zip-bomb protection) and the static analysis rules.
- *DevOps member*: Docker Compose, Render/Vercel deployment, environment variable management, CORS configuration.

## Where AI Is Used

1. **AI Incident Analyzer** (`POST /api/ai/analyze-incident`) — an analyst provides incident description/logs/indicators; the backend sends a structured prompt to the configured AI provider and returns risk level, possible type, summary, suspicious indicators, recommended investigation steps, and recommended response actions. Always labeled advisory; a rule-based fallback keeps the feature usable even if the AI provider is unreachable.
2. **Project Security Analyzer finding explanations** — for high/critical static-analysis findings, the backend asks the AI to produce a plain-language explanation and recommendation, purely to help a developer/analyst understand *why* a pattern was flagged. The AI never makes the pass/fail call itself — that's always the static rule engine.

Both integrations live entirely in `backend/app/ai/` and are called **server-side only**; the AI API key never reaches the browser. The provider is swappable via the `AI_PROVIDER` environment variable (`anthropic` / `openai` / `disabled`) without touching any calling code.

## Project Security Analyzer ↔ Incident Response

The Project Security Analyzer is an **additional detection input**, not a separate product bolted onto the side. The primary workflow stays: **Detection → Incident → Investigation → AI Assistance → Response → Resolution → Analytics**. The scanner just gives you a second way to reach "Detection":

```
Project Upload → Security Analysis → Finding → [Create Security Incident] → Investigation → AI Assistance → Response → Resolution
```

The link is persisted in the database (`Incident.source_finding_id → ScanFinding.id`), so an analyst investigating an incident with `source = "project_scanner"` can always trace it back to the exact file, pattern, and scan that triggered it.

## Security Considerations

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full table of risks considered, mitigations implemented, and how each was tested.

---

*Screenshots: add your own screenshots of the Dashboard, Incident Detail, Project Security Analyzer, and Analytics pages here before submitting.*
