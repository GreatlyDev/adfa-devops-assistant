from sqlalchemy import Column, DateTime, Float, Integer, Text, String
from sqlalchemy.sql import func

from app.db.database import Base


class DeploymentLog(Base):
    __tablename__ = "deployment_logs"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=True)
    environment = Column(String, nullable=True)
    source = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    commit_sha = Column(String, nullable=True)
    triggered_by = Column(String, nullable=True)
    log_text = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    issues = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)
    issue_categories = Column(Text, nullable=False, default="[]")
    matched_signals = Column(Text, nullable=False, default="[]")
    confidence_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
