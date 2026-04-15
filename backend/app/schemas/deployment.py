from datetime import datetime

from pydantic import BaseModel, Field


class LogRequest(BaseModel):
    service_name: str | None = Field(default=None, max_length=100)
    environment: str | None = Field(default=None, max_length=50)
    source: str | None = Field(default=None, max_length=50)
    branch: str | None = Field(default=None, max_length=100)
    commit_sha: str | None = Field(default=None, max_length=40)
    triggered_by: str | None = Field(default=None, max_length=100)
    log_text: str


class LogAnalysis(BaseModel):
    status: str
    issues: list[str]
    recommendations: list[str]
    issue_categories: list[str]
    matched_signals: list[str]
    confidence_score: float


class DeploymentLogResponse(BaseModel):
    id: int
    service_name: str | None
    environment: str | None
    source: str | None
    branch: str | None
    commit_sha: str | None
    triggered_by: str | None
    log_text: str
    status: str
    issues: list[str]
    recommendations: list[str]
    issue_categories: list[str]
    matched_signals: list[str]
    confidence_score: float
    created_at: datetime


class IssueCategoryStat(BaseModel):
    category: str
    count: int


class ServiceHealthStat(BaseModel):
    service_name: str
    failed_count: int


class LogIngestResponse(BaseModel):
    message: str
    deployment_id: int
    analysis: LogAnalysis


class DashboardSummaryResponse(BaseModel):
    total_logs: int
    successful_logs: int
    failed_logs: int
    failure_rate: float
    average_confidence: float
    active_filters: dict[str, str]
    top_issue_categories: list[IssueCategoryStat]
    most_impacted_services: list[ServiceHealthStat]
    recent_logs: list[DeploymentLogResponse]
