"""Utility functions: Git operations, Docker sandbox, file helpers."""
from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple

import git

logger = logging.getLogger(__name__)

REPOS_BASE = os.getenv("REPOS_DIR", "/tmp/agno_repos")


# ---------------------------------------------------------------------------
# Branch name helpers
# ---------------------------------------------------------------------------

def build_branch_name(team_name: str, leader_name: str) -> str:
    """Build a canonical AI_FIX branch name: TEAM_LEADER_AI_FIX."""
    def sanitize(s: str) -> str:
        s = s.upper()
        s = re.sub(r"[^A-Z0-9]+", "_", s)
        s = s.strip("_")
        return s

    t = sanitize(team_name)
    l = sanitize(leader_name)
    return f"{t}_{l}_AI_FIX"


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def clone_repo(repo_url: str, dest_dir: str, github_token: Optional[str] = None) -> git.Repo:
    """Clone a GitHub repo; inject token authentication if provided."""
    url = repo_url
    if github_token and "github.com" in repo_url:
        url = repo_url.replace("https://", f"https://{github_token}@")

    logger.info(f"Cloning {repo_url} → {dest_dir}")
    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir)
    os.makedirs(dest_dir, exist_ok=True)
    repo = git.Repo.clone_from(url, dest_dir)
    return repo


def checkout_new_branch(repo: git.Repo, branch_name: str) -> None:
    """Create and checkout a new branch."""
    try:
        repo.git.checkout("-b", branch_name)
    except git.GitCommandError as e:
        if "already exists" in str(e):
            repo.git.checkout(branch_name)
        else:
            raise


def ensure_git_identity(repo: git.Repo) -> None:
    """Ensure git user.name and user.email are set (required in CI containers)."""
    try:
        with repo.config_writer() as cw:
            try:
                cw.get_value("user", "email")
            except Exception:
                cw.set_value("user", "email", "ai-agent@rift.dev")
            try:
                cw.get_value("user", "name")
            except Exception:
                cw.set_value("user", "name", "AI Fix Agent")
    except Exception as e:
        logger.warning(f"Could not configure git identity: {e}")


def commit_changes(repo: git.Repo, message: str, files: Optional[List[str]] = None) -> Optional[str]:
    """Stage files and create a commit. Returns the commit SHA."""
    try:
        ensure_git_identity(repo)

        if files:
            # Handle both absolute and relative paths
            root = repo.working_dir
            rel_files = []
            for f in files:
                if os.path.isabs(f):
                    try:
                        rel_files.append(os.path.relpath(f, root))
                    except ValueError:
                        rel_files.append(f)
                else:
                    rel_files.append(f)
            repo.git.add(*rel_files)
        else:
            # Add all modified + untracked files
            repo.git.add("-A")

        if not repo.index.diff("HEAD") and not repo.untracked_files:
            logger.info("Nothing to commit.")
            return None

        commit = repo.index.commit(message)
        return str(commit.hexsha)
    except Exception as e:
        logger.error(f"Commit failed: {e}")
        return None


def push_changes(repo: git.Repo, branch_name: str, github_token: Optional[str] = None) -> bool:
    """Push branch to remote origin."""
    try:
        if github_token:
            origin_url = repo.remotes.origin.url
            if "github.com" in origin_url and "https" in origin_url:
                # Strip any existing credentials before injecting token
                import re as _re
                clean_url = _re.sub(r'https://[^@]+@', 'https://', origin_url)
                auth_url = clean_url.replace("https://", f"https://{github_token}@")
                repo.remotes.origin.set_url(auth_url)
        repo.remotes.origin.push(refspec=f"{branch_name}:{branch_name}")
        logger.info(f"Pushed branch {branch_name} to origin.")
        return True
    except Exception as e:
        logger.error(f"Push failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Filesystem helpers
# ---------------------------------------------------------------------------

def get_repo_dir(job_id: str) -> str:
    return os.path.join(REPOS_BASE, job_id)


def cleanup_repo(job_id: str) -> None:
    d = get_repo_dir(job_id)
    if os.path.exists(d):
        shutil.rmtree(d, ignore_errors=True)


def read_file_safe(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return None


def write_file_safe(path: str, content: str) -> bool:
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    except Exception as e:
        logger.error(f"Write failed {path}: {e}")
        return False


def find_python_files(root: str) -> List[str]:
    result = []
    for p in Path(root).rglob("*.py"):
        if ".git" not in str(p) and "__pycache__" not in str(p):
            result.append(str(p))
    return result


def detect_test_framework(root: str) -> List[str]:
    """Detect which test frameworks are available in the repo."""
    frameworks = []
    for p in Path(root).rglob("*.py"):
        if ".git" in str(p):
            continue
        content = read_file_safe(str(p)) or ""
        if "import pytest" in content or "from pytest" in content:
            if "pytest" not in frameworks:
                frameworks.append("pytest")
        if "import unittest" in content or "from unittest" in content:
            if "unittest" not in frameworks:
                frameworks.append("unittest")

    # Check for config files
    if (Path(root) / "pytest.ini").exists() or (Path(root) / "setup.cfg").exists():
        if "pytest" not in frameworks:
            frameworks.append("pytest")
    if not frameworks:
        frameworks.append("pytest")  # default
    return frameworks


# ---------------------------------------------------------------------------
# Docker / subprocess sandbox
# ---------------------------------------------------------------------------

def run_in_sandbox(cmd: List[str], cwd: str, timeout: int = 120) -> Tuple[int, str, str]:
    """Run a command in a subprocess sandbox. Returns (exit_code, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 1, "", "Command timed out after {timeout} seconds"
    except Exception as e:
        return 1, "", str(e)


def install_dependencies(repo_dir: str) -> Tuple[int, str, str]:
    """Install Python dependencies if requirements.txt or setup.py exist."""
    req_file = os.path.join(repo_dir, "requirements.txt")
    setup_file = os.path.join(repo_dir, "setup.py")
    pyproject = os.path.join(repo_dir, "pyproject.toml")

    if os.path.exists(req_file):
        return run_in_sandbox(
            ["pip", "install", "-r", "requirements.txt", "--quiet"],
            cwd=repo_dir,
            timeout=180,
        )
    elif os.path.exists(setup_file) or os.path.exists(pyproject):
        return run_in_sandbox(
            ["pip", "install", "-e", ".", "--quiet"],
            cwd=repo_dir,
            timeout=180,
        )
    return 0, "No dependency file found", ""
