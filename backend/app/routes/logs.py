from fastapi import APIRouter
from pydantic import BaseModel

from app.services.analyzer import analyze_log

router = APIRouter(prefix="/api/logs", tags=["logs"])


class LogRequest(BaseModel):
    log_text: str


@router.post("/")
def ingest_logs(payload: LogRequest):
    analysis_result = analyze_log(payload.log_text)

    return {
        "message": "Log received and analyzed successfully",
        "analysis": analysis_result,
    }