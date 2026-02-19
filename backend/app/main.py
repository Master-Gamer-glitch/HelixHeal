from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import RepoRequest, AgentRunResult, RunStatus
from app.agents.orchestrator import OrchestratorAgent
import uvicorn
import uuid
import traceback
from typing import Dict, Optional

app = FastAPI(title="AI Agent Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for results (use DB in production)
results_store: Dict[str, AgentRunResult] = {}


def run_orchestrator(request: RepoRequest, job_id: str, github_token: Optional[str] = None):
    try:
        def on_progress(current_result: AgentRunResult):
            results_store[job_id] = current_result

        orchestrator = OrchestratorAgent()
        result = orchestrator.run(request, job_id=job_id, on_progress=on_progress, github_token=github_token)
        results_store[job_id] = result
    except Exception as e:
        print(f"Error running orchestrator: {e}")
        traceback.print_exc()
        error_result = {
            "status": RunStatus.FAILED,
            "job_id": job_id,
            "progress": 0,
            "current_step": f"Backend Error: {str(e)}",
            "repository": request.repo_url,
            "team": {"name": request.team_name, "leader": request.team_leader},
            "branch_created": "",
            "summary": {"total_failures": 0, "total_fixes": 0, "ci_status": "FAILED", "time_taken_seconds": 0},
            "score": {"final_score": 0},
            "fixes": [],
            "ci_timeline": []
        }
        results_store[job_id] = error_result

@app.post("/run-agent")
async def run_agent(request: RepoRequest, background_tasks: BackgroundTasks):
    # Determine job ID
    job_id = str(uuid.uuid4())
    
    # Initialize a pending result
    results_store[job_id] = {"status": RunStatus.PENDING, "job_id": job_id}

    background_tasks.add_task(run_orchestrator, request, job_id, request.github_token)
    
    return {"status": "RUNNING", "job_id": job_id}

@app.get("/results/{job_id}")
async def get_results(job_id: str):
    return results_store.get(job_id, {"status": "NOT_FOUND"})

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
