import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.deployment import DeploymentLog
from app.services.analyzer import analyze_log

router = APIRouter(prefix="/api/logs", tags=["logs"])


class LogRequest(BaseModel):
    log_text: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def ingest_logs(payload: LogRequest, db: Session = Depends(get_db)):
    analysis_result = analyze_log(payload.log_text)

    deployment_log = DeploymentLog(
        log_text=payload.log_text,
        status=analysis_result["status"],
        issues=json.dumps(analysis_result["issues"]),
        recommendations=json.dumps(analysis_result["recommendations"]),
    )

    db.add(deployment_log)
    db.commit()
    db.refresh(deployment_log)

    return {
        "message": "Log received, analyzed, and stored successfully",
        "deployment_id": deployment_log.id,
        "analysis": analysis_result,
    }