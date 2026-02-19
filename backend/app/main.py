"""FastAPI application — exposes POST /run-agent and GET /status/{job_id}."""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.agents.orchestrator import AgentOrchestrator
from app.models import JobResponse, RepoRequest, RunResult, RunStatus

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Code-Fixing Agent",
    description="Autonomous bug-fixing AI agent powered by AGNO + Gemini",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (use Redis/DB in production)
_jobs: Dict[str, RunResult] = {}


def _run_orchestrator(
    job_id: str,
    repo_url: str,
    team_name: str,
    team_leader: str,
    github_token: Optional[str],
    retry_limit: int,
) -> None:
    """Background task that runs the full agent orchestration."""
    def on_progress(pct: int, step: str) -> None:
        if job_id in _jobs:
            _jobs[job_id].progress = pct
            _jobs[job_id].current_step = step

    orchestrator = AgentOrchestrator()
    result = orchestrator.run(
        job_id=job_id,
        repo_url=repo_url,
        team_name=team_name,
        team_leader=team_leader,
        github_token=github_token,
        retry_limit=retry_limit,
        on_progress=on_progress,
    )
    _jobs[job_id] = result

    # Persist results.json
    _save_results(job_id, result)


def _save_results(job_id: str, result: RunResult) -> None:
    try:
        out_dir = os.getenv("REPOS_DIR", "/tmp/agno_repos")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"results_{job_id}.json")
        with open(out_path, "w") as f:
            json.dump(result.model_dump(), f, indent=2, default=str)
        logger.info(f"Results saved to {out_path}")
    except Exception as e:
        logger.error(f"Failed to save results: {e}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "AI Code-Fixing Agent"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


@app.post("/run-agent", response_model=JobResponse, tags=["Agent"])
async def run_agent(request: RepoRequest, background_tasks: BackgroundTasks):
    """
    Start the AI code-fixing agent for the given repository.
    Returns a job_id you can poll at GET /status/{job_id}.
    """
    import uuid
    job_id = str(uuid.uuid4())

    # Initialize job state immediately so polling works from the start
    from app.models import TeamInfo
    _jobs[job_id] = RunResult(
        repository=request.repo_url,
        team=TeamInfo(name=request.team_name, leader=request.team_leader),
        branch_created="",
        status=RunStatus.RUNNING,
        progress=0,
        current_step="Queued...",
    )

    background_tasks.add_task(
        _run_orchestrator,
        job_id,
        request.repo_url,
        request.team_name,
        request.team_leader,
        request.github_token,
        request.retry_limit,
    )

    response = JobResponse(status=RunStatus.RUNNING, job_id=job_id)
    return response


@app.get("/status/{job_id}", response_model=RunResult, tags=["Agent"])
async def get_status(job_id: str):
    """Poll the status and results of a running or completed job."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[job_id]


@app.get("/jobs", tags=["Agent"])
async def list_jobs():
    """List all job IDs and their statuses."""
    return {
        job_id: {
            "status": result.status,
            "progress": result.progress,
            "current_step": result.current_step,
        }
        for job_id, result in _jobs.items()
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
