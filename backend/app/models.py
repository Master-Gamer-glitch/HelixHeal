from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class RunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class BugType(str, Enum):
    LINTING = "LINTING"
    SYNTAX = "SYNTAX"
    LOGIC = "LOGIC"
    TYPE_ERROR = "TYPE_ERROR"
    IMPORT = "IMPORT"
    INDENTATION = "INDENTATION"
    UNKNOWN = "UNKNOWN"

class RepoRequest(BaseModel):
    repo_url: str
    team_name: str
    team_leader: str
    github_token: Optional[str] = None

class FixApplied(BaseModel):
    file: str
    bug_type: BugType
    line: Optional[int] = None
    commit_message: str
    status: str = "Fixed"

class CITimepoint(BaseModel):
    iteration: int
    status: str  # "PASSED" or "FAILED"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AgentRunResult(BaseModel):
    repository: str
    team: Dict[str, str]  # name, leader
    branch_created: str
    summary: Dict[str, Any] # total_failures, total_fixes, ci_status, time_taken_seconds
    score: Dict[str, Any] # speed_bonus, efficiency_penalty, final_score
    fixes: List[FixApplied]
    ci_timeline: List[CITimepoint]
    job_id: str
    status: RunStatus
    progress: int = 0
    current_step: str = "Initializing"

# Internal Agent Communication Models

class AnalysisResult(BaseModel):
    language: str
    framework: str
    test_framework: str
    dependencies: List[str]
    root_dir: str

class TestFailure(BaseModel):
    file: str
    message: str
    line: Optional[int] = None
    context: Optional[str] = None

class TestResult(BaseModel):
    passed: bool
    failures: List[TestFailure]
    raw_output: str

class BugAnalysis(BaseModel):
    bug_type: BugType
    description: str
    location: str # file:line
    context_code: str

class FixProposal(BaseModel):
    file: str
    original_code: str
    replacement_code: str
    explanation: str

class CommitDetails(BaseModel):
    commit_hash: str
    branch_name: str
    message: str
