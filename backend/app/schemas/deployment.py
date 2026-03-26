from datetime import datetime

from pydantic import BaseModel


class LogRequest(BaseModel):
    log_text: str


class LogAnalysis(BaseModel):
    status: str
    issues: list[str]
    recommendations: list[str]


class DeploymentLogResponse(BaseModel):
    id: int
    log_text: str
    status: str
    issues: list[str]
    recommendations: list[str]
    created_at: datetime


class LogIngestResponse(BaseModel):
    message: str
    deployment_id: int
    analysis: LogAnalysis
