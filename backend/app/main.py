import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import admin, ai, alerts, analytics, auth, dashboard, incidents, scans
from app.core.config import settings
from app.database import Base, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are created directly from the SQLAlchemy models on startup so the
    # app runs out of the box. Alembic migrations are also provided (see
    # /alembic) for anyone who wants a proper migration history against Postgres.
    Base.metadata.create_all(bind=engine)

    if settings.ENABLE_DEMO_SEED:
        from app.demo_data import ensure_demo_data

        ensure_demo_data()

    yield


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    description=(
        "REST API for the AI-Assisted Cybersecurity Incident Response Platform. "
        "Provides incident management, an AI Incident Analyzer, the Project Security "
        "Analyzer (safe static analysis of uploaded code), analytics, alerts, and admin "
        "controls, secured with JWT authentication and backend-enforced role-based access control."
    ),
    version="1.0.0",
)

# --- CORS -------------------------------------------------------------
# Never "*" in production - only the configured, trusted frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Global error handling ---------------------------------------------
# Never leak raw stack traces to the client; log details server-side instead.
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation failed.", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception while processing %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# --- Routers -------------------------------------------------------------
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(scans.router)
app.include_router(alerts.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"], summary="Health check")
def root():
    return {"status": "ok", "service": settings.APP_NAME, "environment": settings.ENVIRONMENT}


@app.get("/api/health", tags=["Health"], summary="Health check (API prefix)")
def health():
    return {"status": "ok"}
