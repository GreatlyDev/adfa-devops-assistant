from sqlalchemy import Column, DateTime, Integer, Text, String
from sqlalchemy.sql import func

from app.db.database import Base


class DeploymentLog(Base):
    __tablename__ = "deployment_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_text = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    issues = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())