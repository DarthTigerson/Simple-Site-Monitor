import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import Base
from sqlalchemy import Column, String, DateTime, UUID, Integer, Float, Boolean
from datetime import datetime, timezone
import uuid


class RunnerSiteLog(Base):
    __tablename__ = 'runner_run_log'

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False)   # healthy, slow, down, token_alert, unknown
    response_time = Column(Float, nullable=False)
    attempt_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False)
    last_scan_time = Column(DateTime, nullable=False)
    ssl_days_remaining = Column(Integer, nullable=True, default=0)