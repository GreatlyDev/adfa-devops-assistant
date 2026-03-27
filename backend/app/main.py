from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine
from app.models.deployment import DeploymentLog
from app.routes.logs import router as logs_router

Base.metadata.create_all(bind=engine)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(
    title="ADFA Backend API",
    description="Automated Deployment Feedback Assistant",
    version="0.1.0"
)

app.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="frontend-assets")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


app.include_router(logs_router)
