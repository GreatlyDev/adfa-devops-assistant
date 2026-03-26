from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.models.deployment import DeploymentLog
from app.routes.logs import router as logs_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ADFA Backend API",
    description="Automated Deployment Feedback Assistant",
    version="0.1.0"
)

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


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


app.include_router(logs_router)
