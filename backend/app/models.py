"""Pydantic models for the AI Code-Fixing Agent platform."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BugType(str, Enum):
    LINTING = "LINTING"
    SYNTAX = "SYNTAX"
    LOGIC = "LOGIC"
    TYPE_ERROR = "TYPE_ERROR"
    IMPORT = "IMPORT"
    INDENTATION = "INDENTATION"
    UNKNOWN = "UNKNOWN"


class CIStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    PENDING = "PENDING"


class RunStatus(str, Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RepoRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL to fix")
    team_name: str = Field(..., description="Team name (used for branch naming)")
    team_leader: str = Field(..., description="Team leader name (used for branch naming)")
    github_token: Optional[str] = Field(None, description="GitHub Personal Access Token for pushing")
    retry_limit: int = Field(5, ge=1, le=10, description="Max fix iterations")


class JobResponse(BaseModel):
    status: RunStatus = RunStatus.RUNNING
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class TestFailure(BaseModel):
    file: str
    line: Optional[int] = None
    error_message: str
    bug_type: BugType = BugType.UNKNOWN
    raw_output: Optional[str] = None


class FixProposal(BaseModel):
    file: str
    line: Optional[int] = None
    bug_type: BugType = BugType.UNKNOWN
    original_code: Optional[str] = None
    fixed_code: Optional[str] = None
    description: str
    commit_message: str
    status: str = "Pending"


class CITimepoint(BaseModel):
    iteration: int
    status: CIStatus
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    failures: List[str] = Field(default_factory=list)
    post_status: Optional[CIStatus] = None
    post_failures: List[str] = Field(default_factory=list)


class ScoreBreakdown(BaseModel):
    base_score: int = 100
    speed_bonus: int = 0
    efficiency_penalty: int = 0
    ci_penalty: int = 0
    final_score: int = 0


class TeamInfo(BaseModel):
    name: str
    leader: str


class RunResult(BaseModel):
    repository: str
    team: TeamInfo
    branch_created: str
    summary: Dict[str, Any] = Field(default_factory=dict)
    score: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    fixes: List[FixProposal] = Field(default_factory=list)
    ci_timeline: List[CITimepoint] = Field(default_factory=list)
    status: RunStatus = RunStatus.RUNNING
    progress: int = 0
    current_step: str = "Initializing..."
    error: Optional[str] = None


class ProgressUpdate(BaseModel):
    job_id: str
    progress: int
    current_step: str
    status: RunStatus
