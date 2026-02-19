"""Test Runner Agent — runs tests in a subprocess sandbox and parses failures."""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List

from app.models import BugType, TestFailure
from app.utils import install_dependencies, run_in_sandbox

logger = logging.getLogger(__name__)

_INDENT_RE = re.compile(r"IndentationError|TabError")
_SYNTAX_RE = re.compile(r"SyntaxError")
_IMPORT_RE = re.compile(r"ImportError|ModuleNotFoundError")
_TYPE_RE = re.compile(r"TypeError")
_NAME_RE = re.compile(r"NameError")
_ATTR_RE = re.compile(r"AttributeError")
_E_PATTERN = re.compile(r"^E\s+(.+)$", re.MULTILINE)
_FAILED_FILE_RE = re.compile(r"FAILED (.+\.py)")
_ERROR_LINE_RE = re.compile(r'File "(.+)", line (\d+)')
_LINT_LINE_RE = re.compile(r"^(.+\.py):(\d+):\d+: ([EWF]\d+) (.+)$")


def _classify_error(msg: str) -> BugType:
    if _INDENT_RE.search(msg):
        return BugType.INDENTATION
    if _SYNTAX_RE.search(msg):
        return BugType.SYNTAX
    if _IMPORT_RE.search(msg):
        return BugType.IMPORT
    if _TYPE_RE.search(msg):
        return BugType.TYPE_ERROR
    if _NAME_RE.search(msg) or _ATTR_RE.search(msg):
        return BugType.LOGIC
    return BugType.UNKNOWN


def _parse_failures(stdout: str, stderr: str, repo_dir: str) -> List[TestFailure]:
    failures: List[TestFailure] = []
    combined = stdout + "\n" + stderr

    # Parse pytest-style failures: FAILED <file::test>
    failed_sections = re.split(r"_{5,}", combined)
    current_file = None
    current_msg_lines = []

    for line in combined.splitlines():
        # Track FAILED file references
        m = _FAILED_FILE_RE.search(line)
        if m:
            current_file = m.group(1)

        # Parse error context block
        if line.startswith("FAILED ") or "ERROR" in line.upper():
            if current_msg_lines and current_file:
                msg = "\n".join(current_msg_lines)
                bug_type = _classify_error(msg)

                # Try to extract line number
                line_match = _ERROR_LINE_RE.search(msg)
                lineno = int(line_match.group(2)) if line_match else None

                failures.append(
                    TestFailure(
                        file=current_file,
                        line=lineno,
                        error_message=msg[:500],
                        bug_type=bug_type,
                        raw_output=msg,
                    )
                )
                current_msg_lines = []
            current_file = line.split("FAILED ")[-1].split("::")[0].strip() if "FAILED" in line else current_file
        else:
            if line.strip():
                current_msg_lines.append(line)

    # If nothing parsed, try to detect from stderr
    if not failures and stderr:
        bug_type = _classify_error(stderr)
        line_match = _ERROR_LINE_RE.search(stderr)
        f = line_match.group(1).replace(repo_dir + "/", "") if line_match else "unknown"
        lineno = int(line_match.group(2)) if line_match else None
        failures.append(
            TestFailure(
                file=f,
                line=lineno,
                error_message=stderr[:800],
                bug_type=bug_type,
                raw_output=stderr,
            )
        )

    return failures


def _parse_lint_failures(output: str, repo_dir: str) -> List[TestFailure]:
    """Parse flake8/ruff style output: file.py:line:col: E123 message."""
    failures: List[TestFailure] = []
    for line in output.splitlines():
        m = _LINT_LINE_RE.match(line.strip())
        if m:
            file_path = m.group(1)
            lineno = int(m.group(2))
            code = m.group(3)
            message = m.group(4)
            # Resolve relative to repo
            rel_path = file_path.replace(repo_dir + "/", "").replace(repo_dir + "\\", "")
            failures.append(
                TestFailure(
                    file=rel_path,
                    line=lineno,
                    error_message=f"{code}: {message}",
                    bug_type=BugType.LINTING,
                    raw_output=line,
                )
            )
    return failures


class TestRunnerAgent:
    """
    Runs the project's test suite and returns structured failure information.
    Also runs ruff/flake8 linting to catch static analysis issues.
    """

    def run(self, repo_dir: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[TestRunnerAgent] Running tests in {repo_dir}")

        # Install deps first (best effort)
        install_dependencies(repo_dir)

        test_frameworks = analysis.get("test_frameworks", ["pytest"])
        result = {
            "passed": False,
            "exit_code": 1,
            "stdout": "",
            "stderr": "",
            "failures": [],
            "output": "",
        }

        # ── Run tests ─────────────────────────────────────────────────────
        if "pytest" in test_frameworks or not test_frameworks:
            exit_code, stdout, stderr = run_in_sandbox(
                ["python", "-m", "pytest", "--tb=short", "-q", "--no-header"],
                cwd=repo_dir,
                timeout=120,
            )
        elif "unittest" in test_frameworks:
            exit_code, stdout, stderr = run_in_sandbox(
                ["python", "-m", "unittest", "discover", "-v"],
                cwd=repo_dir,
                timeout=120,
            )
        else:
            exit_code, stdout, stderr = run_in_sandbox(
                ["python", "-m", "pytest", "--tb=short", "-q"],
                cwd=repo_dir,
                timeout=120,
            )

        result["exit_code"] = exit_code
        result["stdout"] = stdout
        result["stderr"] = stderr
        result["output"] = stdout + "\n" + stderr
        result["passed"] = exit_code == 0

        all_failures: List[Dict] = []

        if not result["passed"]:
            failures = _parse_failures(stdout, stderr, repo_dir)
            all_failures.extend([f.model_dump() for f in failures])

            # If tests failed but no structured failures were parsed,
            # create a synthetic failure from raw output (e.g. pytest exit code 2 = collection error)
            if not all_failures:
                raw = (stderr or stdout or "Unknown test error").strip()
                bug_type = _classify_error(raw)
                line_match = _ERROR_LINE_RE.search(raw)
                if line_match:
                    # Normalize paths (macOS resolves /tmp → /private/tmp)
                    real_repo = os.path.realpath(repo_dir)
                    real_file = os.path.realpath(line_match.group(1))
                    try:
                        f_path = os.path.relpath(real_file, real_repo)
                    except ValueError:
                        f_path = line_match.group(1)
                    lineno = int(line_match.group(2))
                else:
                    f_path = "unknown"
                    lineno = None
                all_failures.append(
                    TestFailure(
                        file=f_path,
                        line=lineno,
                        error_message=raw[:800],
                        bug_type=bug_type,
                        raw_output=raw,
                    ).model_dump()
                )

        # ── Run linting (ruff preferred, flake8 fallback) ─────────────────
        lint_exit, lint_out, lint_err = run_in_sandbox(
            ["python", "-m", "ruff", "check", "--output-format=text", "."],
            cwd=repo_dir,
            timeout=60,
        )
        if lint_exit != 0 and lint_out.strip():
            lint_failures = _parse_lint_failures(lint_out, repo_dir)
            if lint_failures:
                logger.info(f"[TestRunnerAgent] ruff found {len(lint_failures)} issues")
                all_failures.extend([f.model_dump() for f in lint_failures])
                if result["passed"]:
                    # Linting failures don't break the test exit, but record them
                    result["passed"] = False
                    result["exit_code"] = lint_exit

        # Fallback to flake8 if ruff not installed
        if lint_exit != 0 and not lint_out.strip():
            flake_exit, flake_out, flake_err = run_in_sandbox(
                ["python", "-m", "flake8", "--max-line-length=120", "."],
                cwd=repo_dir,
                timeout=60,
            )
            if flake_exit != 0 and flake_out.strip():
                lint_failures = _parse_lint_failures(flake_out, repo_dir)
                if lint_failures:
                    logger.info(f"[TestRunnerAgent] flake8 found {len(lint_failures)} issues")
                    all_failures.extend([f.model_dump() for f in lint_failures])

        result["failures"] = all_failures
        logger.info(
            f"[TestRunnerAgent] exit_code={exit_code}, failures={len(all_failures)}"
        )
        return result
