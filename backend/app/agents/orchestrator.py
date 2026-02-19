"""AGNO-powered Orchestrator — coordinates all agents in a retry loop."""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import git

from app.agents.bug_classifier import BugClassifierAgent
from app.agents.ci_monitor import CIMonitorAgent
from app.agents.commit_agent import CommitAgent
from app.agents.fix_generator import FixGeneratorAgent
from app.agents.repo_analyzer import RepoAnalyzerAgent
from app.agents.test_runner import TestRunnerAgent
from app.models import (
    CIStatus,
    FixProposal,
    RunResult,
    RunStatus,
    ScoreBreakdown,
    TeamInfo,
)
from app.utils import (
    build_branch_name,
    checkout_new_branch,
    cleanup_repo,
    clone_repo,
    get_repo_dir,
    push_changes,
)

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, str], None]


class AgentOrchestrator:
    """
    AGNO-pattern multi-agent orchestrator.
    Coordinates: Analyzer → TestRunner → Classifier → FixGenerator → CommitAgent → CIMonitor
    in a retry loop.
    """

    def __init__(self) -> None:
        self.repo_analyzer = RepoAnalyzerAgent()
        self.test_runner = TestRunnerAgent()
        self.bug_classifier = BugClassifierAgent()
        self.fix_generator = FixGeneratorAgent()
        self.commit_agent = CommitAgent()
        self.ci_monitor = CIMonitorAgent()

    def run(
        self,
        job_id: str,
        repo_url: str,
        team_name: str,
        team_leader: str,
        github_token: Optional[str],
        retry_limit: int = 5,
        on_progress: Optional[ProgressCallback] = None,
    ) -> RunResult:
        start_time = time.time()
        branch_name = build_branch_name(team_name, team_leader)
        repo_dir = get_repo_dir(job_id)

        result = RunResult(
            repository=repo_url,
            team=TeamInfo(name=team_name, leader=team_leader),
            branch_created=branch_name,
            status=RunStatus.RUNNING,
            progress=0,
            current_step="Initializing...",
        )

        def _progress(pct: int, step: str) -> None:
            result.progress = pct
            result.current_step = step
            if on_progress:
                on_progress(pct, step)
            logger.info(f"[Orchestrator] {pct}% — {step}")

        try:
            # ── Step 1: Clone ──────────────────────────────────────────────
            _progress(5, "Cloning repository...")
            repo: git.Repo = clone_repo(repo_url, repo_dir, github_token)

            # ── Step 2: Checkout branch ────────────────────────────────────
            _progress(10, f"Creating branch {branch_name}...")
            checkout_new_branch(repo, branch_name)

            # ── Step 3: Analyze repo ───────────────────────────────────────
            _progress(15, "Analyzing repository structure...")
            analysis = self.repo_analyzer.run(repo_dir)

            total_failures_initial = 0
            total_fixes_applied = 0
            all_proposals: List[FixProposal] = []
            ci_status_final = CIStatus.FAILED
            self.ci_monitor.reset()

            # ── Step 4: Fix loop ───────────────────────────────────────────
            for iteration in range(1, retry_limit + 1):
                pct_base = 15 + int((iteration - 1) * (70 / retry_limit))
                _progress(pct_base, f"Iteration {iteration}/{retry_limit}: Running tests...")

                # Run tests (pre-fix)
                test_result = self.test_runner.run(repo_dir, analysis)
                if iteration == 1:
                    total_failures_initial = len(test_result.get("failures", []))

                # Early exit if tests pass
                if self.ci_monitor.should_stop(test_result):
                    timepoint = self.ci_monitor.record(iteration, test_result)
                    ci_status_final = CIStatus.PASSED
                    _progress(pct_base + 5, f"All tests passed at iteration {iteration}!")
                    break

                # Classify bugs
                _progress(pct_base + 2, f"Iteration {iteration}: Classifying failures...")
                classified = self.bug_classifier.run(test_result)

                if not classified:
                    self.ci_monitor.record(iteration, test_result)
                    logger.warning("[Orchestrator] No classifiable failures — stopping.")
                    break

                # Generate fixes
                _progress(pct_base + 4, f"Iteration {iteration}: Generating fixes with AI...")
                proposals = self.fix_generator.run(classified, repo_dir)
                all_proposals.extend(proposals)
                fixed = [p for p in proposals if p.status == "Fixed"]

                if not fixed:
                    self.ci_monitor.record(iteration, test_result)
                    logger.warning("[Orchestrator] No fixes generated — stopping.")
                    break

                # Commit fixes
                _progress(pct_base + 6, f"Iteration {iteration}: Committing {len(fixed)} fix(es)...")
                commit_shas = self.commit_agent.run(
                    repo, fixed, github_token=github_token, branch_name=branch_name
                )
                total_fixes_applied += len(commit_shas)

                # Post-fix test run
                _progress(pct_base + 8, f"Iteration {iteration}: Verifying fixes...")
                post_result = self.test_runner.run(repo_dir, analysis)
                self.ci_monitor.record(iteration, test_result, post_result)

                if post_result.get("passed"):
                    ci_status_final = CIStatus.PASSED
                    _progress(pct_base + 10, f"✅ Tests passing after {iteration} iteration(s)!")
                    break
            else:
                # Retry limit reached — record final state
                final_test = self.test_runner.run(repo_dir, analysis)
                if final_test.get("passed"):
                    ci_status_final = CIStatus.PASSED
                else:
                    self.ci_monitor.record(retry_limit, final_test)

            # ── Step 5: Final push ─────────────────────────────────────────
            _progress(90, "Pushing branch to remote...")
            if github_token:
                push_changes(repo, branch_name, github_token)

            # ── Step 6: Compute score ──────────────────────────────────────
            elapsed = time.time() - start_time
            speed_bonus = 10 if elapsed < 300 else 0
            excess_commits = max(0, total_fixes_applied - 20)
            efficiency_penalty = excess_commits * 2
            remaining_failures = total_failures_initial - total_fixes_applied
            base = 100 - (remaining_failures * 10)
            raw_score = max(0, base + speed_bonus - efficiency_penalty)
            ci_penalty = 0
            if ci_status_final != CIStatus.PASSED and raw_score > 50:
                ci_penalty = raw_score - 50
            final_score = raw_score - ci_penalty

            result.score = ScoreBreakdown(
                base_score=base,
                speed_bonus=speed_bonus,
                efficiency_penalty=efficiency_penalty,
                ci_penalty=ci_penalty,
                final_score=final_score,
            )
            result.summary = {
                "total_failures": total_failures_initial,
                "total_fixes": total_fixes_applied,
                "ci_status": ci_status_final.value,
                "time_taken_seconds": round(elapsed),
                "iterations_used": len(self.ci_monitor.timeline),
            }
            result.fixes = all_proposals
            result.ci_timeline = self.ci_monitor.get_timeline()
            result.status = RunStatus.COMPLETED
            result.progress = 100
            result.current_step = "Completed"

            _progress(100, "Done!")
            logger.info(f"[Orchestrator] Finished job {job_id}. CI={ci_status_final}")

        except Exception as e:
            logger.exception(f"[Orchestrator] Fatal error: {e}")
            result.status = RunStatus.FAILED
            result.error = str(e)
            result.progress = 100
            result.current_step = f"Failed: {e}"

        return result
