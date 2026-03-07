from fastapi import FastAPI

from app.routes.logs import router as logs_router

app = FastAPI(
    title="ADFA Backend API",
    description="Automated Deployment Feedback Assistant",
    version="0.1.0"
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