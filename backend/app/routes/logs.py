import json
import csv
from io import StringIO
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.deployment import DeploymentLog
from app.schemas.deployment import (
    DemoSeedResponse,
    DashboardSummaryResponse,
    DeploymentLogResponse,
    LogIngestResponse,
    LogRequest,
)
from app.services.analyzer import analyze_log
from app.services.demo_data import build_demo_deployments

router = APIRouter(prefix="/api/logs", tags=["logs"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_deployment_log(deployment_log: DeploymentLog) -> DeploymentLogResponse:
    def parse_list(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        return json.loads(raw_value)

    return DeploymentLogResponse(
        id=deployment_log.id,
        service_name=deployment_log.service_name,
        environment=deployment_log.environment,
        source=deployment_log.source,
        branch=deployment_log.branch,
        commit_sha=deployment_log.commit_sha,
        triggered_by=deployment_log.triggered_by,
        log_text=deployment_log.log_text,
        status=deployment_log.status,
        issues=parse_list(deployment_log.issues),
        recommendations=parse_list(deployment_log.recommendations),
        issue_categories=parse_list(deployment_log.issue_categories),
        matched_signals=parse_list(deployment_log.matched_signals),
        confidence_score=deployment_log.confidence_score or 0.0,
        created_at=deployment_log.created_at,
    )


def apply_log_filters(query, status: str | None, environment: str | None, service_name: str | None, search: str | None):
    if status:
        query = query.filter(DeploymentLog.status == status)

    if environment:
        query = query.filter(DeploymentLog.environment == environment)

    if service_name:
        query = query.filter(DeploymentLog.service_name.ilike(f"%{service_name}%"))

    if search:
        wildcard_search = f"%{search}%"
        query = query.filter(
            DeploymentLog.log_text.ilike(wildcard_search)
            | DeploymentLog.branch.ilike(wildcard_search)
            | DeploymentLog.commit_sha.ilike(wildcard_search)
            | DeploymentLog.triggered_by.ilike(wildcard_search)
            | DeploymentLog.source.ilike(wildcard_search)
        )

    return query


def get_filtered_logs(
    db: Session,
    status: str | None,
    environment: str | None,
    service_name: str | None,
    search: str | None,
):
    return apply_log_filters(
        db.query(DeploymentLog).order_by(DeploymentLog.created_at.desc()),
        status=status,
        environment=environment,
        service_name=service_name,
        search=search,
    ).all()


@router.post("/", response_model=LogIngestResponse)
def ingest_logs(payload: LogRequest, db: Session = Depends(get_db)):
    analysis_result = analyze_log(payload.log_text)

    deployment_log = DeploymentLog(
        service_name=payload.service_name,
        environment=payload.environment,
        source=payload.source,
        branch=payload.branch,
        commit_sha=payload.commit_sha,
        triggered_by=payload.triggered_by,
        log_text=payload.log_text,
        status=analysis_result["status"],
        issues=json.dumps(analysis_result["issues"]),
        recommendations=json.dumps(analysis_result["recommendations"]),
        issue_categories=json.dumps(analysis_result["issue_categories"]),
        matched_signals=json.dumps(analysis_result["matched_signals"]),
        confidence_score=analysis_result["confidence_score"],
    )

    db.add(deployment_log)
    db.commit()
    db.refresh(deployment_log)

    return LogIngestResponse(
        message="Log received, analyzed, and stored successfully",
        deployment_id=deployment_log.id,
        analysis=analysis_result,
    )


@router.post("/seed-demo", response_model=DemoSeedResponse)
def seed_demo_logs(force: bool = Query(default=False), db: Session = Depends(get_db)):
    existing_seed_logs = (
        db.query(DeploymentLog)
        .filter(DeploymentLog.source == "demo-seed")
        .count()
    )

    if existing_seed_logs and not force:
        return DemoSeedResponse(
            message="Demo deployment data already exists. Use force=true to seed a fresh batch.",
            inserted_logs=0,
            existing_logs=existing_seed_logs,
        )

    if existing_seed_logs and force:
        (
            db.query(DeploymentLog)
            .filter(DeploymentLog.source == "demo-seed")
            .delete()
        )
        db.commit()

    demo_deployments = build_demo_deployments()

    for deployment in demo_deployments:
        analysis = deployment["analysis"]
        db.add(
            DeploymentLog(
                service_name=deployment["service_name"],
                environment=deployment["environment"],
                source=deployment["source"],
                branch=deployment["branch"],
                commit_sha=deployment["commit_sha"],
                triggered_by=deployment["triggered_by"],
                log_text=deployment["log_text"],
                status=analysis["status"],
                issues=json.dumps(analysis["issues"]),
                recommendations=json.dumps(analysis["recommendations"]),
                issue_categories=json.dumps(analysis["issue_categories"]),
                matched_signals=json.dumps(analysis["matched_signals"]),
                confidence_score=analysis["confidence_score"],
            )
        )

    db.commit()

    return DemoSeedResponse(
        message="Demo deployment data loaded successfully.",
        inserted_logs=len(demo_deployments),
        existing_logs=existing_seed_logs,
    )


@router.get("/", response_model=list[DeploymentLogResponse])
def get_logs(
    status: str | None = Query(default=None),
    environment: str | None = Query(default=None),
    service_name: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    logs = get_filtered_logs(
        db=db,
        status=status,
        environment=environment,
        service_name=service_name,
        search=search,
    )
    return [serialize_deployment_log(log) for log in logs]


@router.get("/export")
def export_logs_csv(
    status: str | None = Query(default=None),
    environment: str | None = Query(default=None),
    service_name: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    logs = get_filtered_logs(
        db=db,
        status=status,
        environment=environment,
        service_name=service_name,
        search=search,
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "id",
            "service_name",
            "environment",
            "source",
            "branch",
            "commit_sha",
            "triggered_by",
            "status",
            "confidence_score",
            "issue_categories",
            "matched_signals",
            "created_at",
            "log_text",
        ]
    )

    for log in logs:
        writer.writerow(
            [
                log.id,
                log.service_name or "",
                log.environment or "",
                log.source or "",
                log.branch or "",
                log.commit_sha or "",
                log.triggered_by or "",
                log.status,
                log.confidence_score or 0.0,
                ", ".join(json.loads(log.issue_categories or "[]")),
                ", ".join(json.loads(log.matched_signals or "[]")),
                log.created_at.isoformat() if log.created_at else "",
                log.log_text,
            ]
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="adfa-deployments.csv"'},
    )


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_logs_summary(
    status: str | None = Query(default=None),
    environment: str | None = Query(default=None),
    service_name: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    logs = get_filtered_logs(
        db=db,
        status=status,
        environment=environment,
        service_name=service_name,
        search=search,
    )

    successful_logs = sum(1 for log in logs if log.status == "success")
    failed_logs = sum(1 for log in logs if log.status == "failed")
    failure_rate = round((failed_logs / len(logs)) * 100, 1) if logs else 0.0
    average_confidence = round(
        sum(log.confidence_score or 0.0 for log in logs) / len(logs),
        2,
    ) if logs else 0.0
    recent_logs = [serialize_deployment_log(log) for log in logs[:5]]
    category_counts = Counter()
    impacted_services = Counter()

    for log in logs:
        for category in json.loads(log.issue_categories or "[]"):
            if category != "healthy":
                category_counts[category] += 1

        if log.status == "failed" and log.service_name:
            impacted_services[log.service_name] += 1

    return DashboardSummaryResponse(
        total_logs=len(logs),
        successful_logs=successful_logs,
        failed_logs=failed_logs,
        failure_rate=failure_rate,
        average_confidence=average_confidence,
        active_filters={
            "status": status or "",
            "environment": environment or "",
            "service_name": service_name or "",
            "search": search or "",
        },
        status_breakdown=[
            {"label": "success", "count": successful_logs},
            {"label": "failed", "count": failed_logs},
        ],
        top_issue_categories=[
            {"category": category, "count": count}
            for category, count in category_counts.most_common(4)
        ],
        most_impacted_services=[
            {"service_name": service_name, "failed_count": count}
            for service_name, count in impacted_services.most_common(4)
        ],
        recent_logs=recent_logs,
    )


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
