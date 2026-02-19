"""Repository Analyzer Agent — detects language, framework, test tools, and builds dependency context."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List

from app.utils import find_python_files, read_file_safe, run_in_sandbox

logger = logging.getLogger(__name__)


class RepoAnalyzerAgent:
    """
    Analyzes a cloned repository to understand:
    - Primary language & framework
    - Available test frameworks
    - Project structure
    - Dependency tree
    """

    def run(self, repo_dir: str) -> Dict[str, Any]:
        logger.info(f"[RepoAnalyzerAgent] Analyzing {repo_dir}")
        result: Dict[str, Any] = {
            "language": "python",
            "framework": "unknown",
            "test_frameworks": [],
            "python_files": [],
            "test_files": [],
            "has_requirements": False,
            "has_setup_py": False,
            "has_pyproject": False,
            "structure_summary": "",
            "dependencies": [],
        }

        root = Path(repo_dir)

        # -- Detect dependency files --
        result["has_requirements"] = (root / "requirements.txt").exists()
        result["has_setup_py"] = (root / "setup.py").exists()
        result["has_pyproject"] = (root / "pyproject.toml").exists()

        # -- Find Python files --
        py_files = find_python_files(repo_dir)
        result["python_files"] = py_files

        # -- Identify test files --
        test_files = [f for f in py_files if "test" in Path(f).name.lower()]
        result["test_files"] = test_files

        # -- Detect frameworks --
        frameworks_detected = set()
        for f in py_files:
            content = read_file_safe(f) or ""
            if "import pytest" in content or "from pytest" in content:
                frameworks_detected.add("pytest")
            if "import unittest" in content or "from unittest" in content:
                frameworks_detected.add("unittest")
            if "import django" in content:
                result["framework"] = "django"
            if "import flask" in content:
                result["framework"] = "flask"
            if "import fastapi" in content:
                result["framework"] = "fastapi"

        # Detect pytest config
        if (root / "pytest.ini").exists() or (root / "setup.cfg").exists() or (root / "pyproject.toml").exists():
            frameworks_detected.add("pytest")
        if not frameworks_detected:
            if test_files:
                frameworks_detected.add("pytest")
        result["test_frameworks"] = list(frameworks_detected)

        # -- Build structure summary --
        dirs = set()
        for f in py_files:
            rel = os.path.relpath(f, repo_dir)
            parts = rel.split(os.sep)
            if len(parts) > 1:
                dirs.add(parts[0])
        result["structure_summary"] = f"Top-level packages: {', '.join(sorted(dirs)) or 'root'}"

        # -- Read requirements for dependency list --
        req_path = root / "requirements.txt"
        if req_path.exists():
            lines = (read_file_safe(str(req_path)) or "").strip().splitlines()
            result["dependencies"] = [l.strip() for l in lines if l.strip() and not l.startswith("#")]

        logger.info(f"[RepoAnalyzerAgent] Done. test_frameworks={result['test_frameworks']}, test_files={len(test_files)}")
        return result
