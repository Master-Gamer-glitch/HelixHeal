"""Commit Agent — creates [AI-AGENT] prefix commits for each fix proposal."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Optional

import git

from app.models import FixProposal
from app.utils import push_changes

logger = logging.getLogger(__name__)


class CommitAgent:
    """
    Creates one commit per accepted fix proposal with [AI-AGENT] prefix.
    """

    def run(
        self,
        repo: git.Repo,
        proposals: List[FixProposal],
        github_token: Optional[str] = None,
        branch_name: Optional[str] = None,
    ) -> List[str]:
        """Apply each fix as a separate commit. Returns list of commit SHAs."""
        shas: List[str] = []

        # Ensure git identity is configured (required in CI/container envs)
        try:
            with repo.config_writer() as cw:
                if not cw.has_option("user", "email"):
                    cw.set_value("user", "email", "ai-agent@rift.dev")
                if not cw.has_option("user", "name"):
                    cw.set_value("user", "name", "AI Fix Agent")
        except Exception as e:
            logger.warning(f"[CommitAgent] Could not set git identity: {e}")

        for proposal in proposals:
            if proposal.status != "Fixed":
                continue

            commit_msg = proposal.commit_message
            if not commit_msg.startswith("[AI-AGENT]"):
                commit_msg = f"[AI-AGENT] {commit_msg}"

            try:
                sha = self._commit_file(repo, proposal.file, commit_msg)
                if sha:
                    shas.append(sha)
                    logger.info(f"[CommitAgent] Committed {proposal.file} → {sha[:8]}")
                else:
                    logger.info(f"[CommitAgent] Nothing to commit for {proposal.file}")
            except Exception as e:
                logger.error(f"[CommitAgent] Failed to commit {proposal.file}: {e}")

        # Push all commits if token provided
        if shas and github_token and branch_name:
            push_changes(repo, branch_name, github_token)

        return shas

    def _commit_file(self, repo: git.Repo, file_path: str, message: str) -> Optional[str]:
        """Stage a single file (relative or absolute) and commit it."""
        try:
            repo_root = repo.working_dir

            # Resolve to relative path for git operations
            if os.path.isabs(file_path):
                try:
                    rel_path = os.path.relpath(file_path, repo_root)
                except ValueError:
                    rel_path = file_path
            else:
                rel_path = file_path

            # Stage the specific file
            abs_path = os.path.join(repo_root, rel_path)
            if not os.path.exists(abs_path):
                # Try staging all modified files instead
                repo.git.add("-A")
            else:
                repo.git.add(rel_path)

            # Check if there's anything staged
            if not repo.index.diff("HEAD") and not repo.untracked_files:
                logger.info(f"[CommitAgent] No changes to commit for {rel_path}")
                return None

            commit = repo.index.commit(message)
            return str(commit.hexsha)
        except git.GitCommandError as e:
            # Stage all if targeted add fails
            try:
                repo.git.add("-A")
                if repo.index.diff("HEAD") or repo.untracked_files:
                    commit = repo.index.commit(message)
                    return str(commit.hexsha)
            except Exception:
                pass
            logger.error(f"[CommitAgent] Git error: {e}")
            return None
        except Exception as e:
            logger.error(f"[CommitAgent] Commit failed: {e}")
            return None
