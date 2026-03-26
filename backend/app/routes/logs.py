import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.deployment import DeploymentLog
from app.schemas.deployment import (
    DeploymentLogResponse,
    LogIngestResponse,
    LogRequest,
)
from app.services.analyzer import analyze_log

router = APIRouter(prefix="/api/logs", tags=["logs"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_deployment_log(deployment_log: DeploymentLog) -> DeploymentLogResponse:
    return DeploymentLogResponse(
        id=deployment_log.id,
        log_text=deployment_log.log_text,
        status=deployment_log.status,
        issues=json.loads(deployment_log.issues),
        recommendations=json.loads(deployment_log.recommendations),
        created_at=deployment_log.created_at,
    )


@router.post("/", response_model=LogIngestResponse)
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

    return LogIngestResponse(
        message="Log received, analyzed, and stored successfully",
        deployment_id=deployment_log.id,
        analysis=analysis_result,
    )


@router.get("/", response_model=list[DeploymentLogResponse])
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(DeploymentLog).all()
    return [serialize_deployment_log(log) for log in logs]


@router.get("/{deployment_id}", response_model=DeploymentLogResponse)
def get_log_by_id(deployment_id: int, db: Session = Depends(get_db)):
    deployment_log = (
        db.query(DeploymentLog)
        .filter(DeploymentLog.id == deployment_id)
        .first()
    )

    if deployment_log is None:
        raise HTTPException(status_code=404, detail="Deployment log not found")

    return serialize_deployment_log(deployment_log)
