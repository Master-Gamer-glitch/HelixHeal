import uuid
import os
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models import (
    RepoRequest, AgentRunResult, RunStatus, FixApplied, BugType,
    CITimepoint, AnalysisResult
)
from app.agents.repository_analyzer import RepositoryAnalyzerAgent
from app.agents.test_runner import TestRunnerAgent
from app.agents.bug_classifier import BugClassifierAgent
from app.agents.fix_generator import FixGeneratorAgent
from app.agents.commit_agent import CommitAgent
from app.utils import create_branch, get_repo_structure

class OrchestratorAgent:
    def __init__(self):
        self.repo_analyzer = RepositoryAnalyzerAgent()
        self.test_runner = TestRunnerAgent()
        self.bug_classifier = BugClassifierAgent()
        self.fix_generator = FixGeneratorAgent()
        self.commit_agent = CommitAgent()
        # self.ci_monitor = CIMonitorAgent() # Optional

    def run(self, request: RepoRequest, job_id: Optional[str] = None, on_progress=None, github_token: Optional[str] = None) -> AgentRunResult:
        if job_id is None:
            job_id = str(uuid.uuid4())
        workspace_dir = f"/tmp/ai-agent-workspace/{job_id}"
        repo_dir = os.path.join(workspace_dir, "repo")
        
        # Initialize result object
        result = AgentRunResult(
            repository=request.repo_url,
            team={"name": request.team_name, "leader": request.team_leader},
            branch_created="",
            summary={
                "total_failures": 0,
                "total_fixes": 0,
                "ci_status": "PENDING",
                "time_taken_seconds": 0,
                "iterations_used": 0
            },
            score={
                "speed_bonus": 0,
                "efficiency_penalty": 0,
                "final_score": 0
            },
            fixes=[],
            ci_timeline=[],
            job_id=job_id,
            status=RunStatus.RUNNING,
            progress=0,
            current_step="Initializing..."
        )

        def update_progress(step: str, prog: int):
            result.current_step = step
            result.progress = prog
            if on_progress:
                on_progress(result)
        
        start_time = datetime.utcnow()

        try:
            update_progress("Cloning Repository...", 10)
            # 1. Clone & Analyze
            analysis = self.repo_analyzer.analyze(request.repo_url, repo_dir)
            
            update_progress("Creating Branch...", 20)
            # 2. Create Branch
            branch_name = f"{request.team_name}_{request.team_leader}_AI_FIX".replace(" ", "_").upper()
            create_branch(repo_dir, branch_name)
            result.branch_created = branch_name

            # 3. Test & Fix Loop
            max_retries = 5
            iteration = 0
            
            while iteration < max_retries:
                iteration += 1
                base_progress = 20 + (iteration * 15) # Scale progress based on iterations
                
                update_progress(f"Running Tests (Iteration {iteration})...", min(90, base_progress))
                # Run Tests
                test_result = self.test_runner.run_tests(repo_dir, analysis)
                result.ci_timeline.append(CITimepoint(
                    iteration=iteration,
                    status="PASSED" if test_result.passed else "FAILED"
                ))
                
                if test_result.passed:
                    result.summary["ci_status"] = "PASSED"
                    break
                
                result.summary["total_failures"] = len(test_result.failures)
                
                update_progress(f"Classifying Bugs (Iteration {iteration})...", min(95, base_progress + 5))
                # Classify Bugs
                bugs = self.bug_classifier.classify(test_result)
                
                # Fix Bugs (one by one for simplicity, or batch)
                for i, bug in enumerate(bugs):
                    try:
                        update_progress(f"Fixing Bug {i+1}/{len(bugs)}...", min(98, base_progress + 8))
                        fix_proposal = self.fix_generator.generate_fix(bug, repo_dir)
                        commit_details = self.commit_agent.apply_fix(fix_proposal, repo_dir, github_token)
                        result.fixes.append(FixApplied(
                            file=fix_proposal.file,
                            bug_type=bug.bug_type,
                            line=None,
                            commit_message=commit_details.message
                        ))
                        result.summary["total_fixes"] += 1
                    except Exception as fix_err:
                        print(f"[Orchestrator] Could not fix bug {i+1} ({bug.location}): {fix_err}")
                        continue
                
                # Report intermediate state
                if on_progress:
                    on_progress(result)

            result.summary["iterations_used"] = iteration
            if result.summary["ci_status"] != "PASSED":
                result.summary["ci_status"] = "FAILED"

            # Mark as completed only when no exception occurred
            result.status = RunStatus.COMPLETED
            result.current_step = "Completed"

        except Exception as e:
            result.status = RunStatus.FAILED
            result.current_step = f"Error: {str(e)}"
            print(f"Orchestrator failed: {e}")
        
        finally:
            end_time = datetime.utcnow()
            time_taken = int((end_time - start_time).total_seconds())
            result.summary["time_taken_seconds"] = time_taken
            
            # Calculate Score
            speed_bonus = 10 if time_taken < 300 else 0
            total_fixes = result.summary.get("total_fixes", 0)
            efficiency_penalty = max(0, (total_fixes - 20) * 2) if total_fixes > 20 else 0
            base_score = 100 + speed_bonus - efficiency_penalty
            
            result.score["speed_bonus"] = speed_bonus
            result.score["efficiency_penalty"] = efficiency_penalty
            result.score["final_score"] = max(0, base_score)
            
            result.progress = 100
            
            if on_progress:
                on_progress(result)
            
            # Cleanup (optional, maybe keep for debugging)
            # shutil.rmtree(workspace_dir)

        return result
