from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.models.deployment import DeploymentLog
from app.routes.logs import router as logs_router


def get_frontend_dir() -> Path | None:
    current_file = Path(__file__).resolve()
    possible_frontend_dirs = [parent / "frontend" for parent in current_file.parents]

    for directory in possible_frontend_dirs:
        if directory.exists():
            return directory

    return None


FRONTEND_DIR = get_frontend_dir()
DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def get_allowed_origins() -> list[str]:
    origins = os.getenv("ALLOWED_ORIGINS")
    if not origins:
        return DEFAULT_CORS_ORIGINS

    return [origin.strip() for origin in origins.split(",") if origin.strip()]

app = FastAPI(
    title="ADFA Backend API",
    description="Automated Deployment Feedback Assistant",
    version="0.1.0"
)

if FRONTEND_DIR is not None:
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="frontend-assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to ADFA - Automated Deployment Feedback Assistant"
    }


@app.get("/dashboard", include_in_schema=False)
def read_dashboard():
    if FRONTEND_DIR is None:
        return JSONResponse(
            status_code=503,
            content={"detail": "Frontend assets are not available in this environment."},
        )

    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


app.include_router(logs_router)
