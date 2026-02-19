"""Fix Generator Agent — uses AGNO + Gemini to produce minimal diffs for each classified failure."""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# AGNO import with fallback
# ---------------------------------------------------------------------------
try:
    from agno.agent import Agent
    from agno.models.google import Gemini
    _AGNO_AVAILABLE = True
except ImportError:
    _AGNO_AVAILABLE = False
    logger.warning("agno not available, using heuristic fixes only.")

from app.models import BugType, FixProposal
from app.utils import read_file_safe, write_file_safe

_FIX_PROMPT_TEMPLATE = """\
You are a senior Python engineer. Your job is to produce the MINIMAL fix for a specific bug.

## Repository Context
File: {file}
Bug Type: {bug_type}
Error Message:
{error_message}

## Current File Content (first 200 lines)
```python
{file_content}
```

## Instructions
1. Identify the EXACT line(s) causing the error.
2. Return ONLY the corrected file content — no explanation, no markdown, no extra text.
3. Make the smallest possible change. Do NOT refactor.
4. If the bug is an unused import, delete that import line ONLY.
5. If it's a missing module, add the correct import at the top.
6. If it's an indentation error, fix only those lines.
7. Output must be valid Python.

Return ONLY the complete corrected file content.
"""

# ---------------------------------------------------------------------------
# Heuristic fallback fixes
# ---------------------------------------------------------------------------

def _heuristic_fix(file_path: str, bug_type: str, error_message: str) -> Optional[str]:
    content = read_file_safe(file_path)
    if content is None:
        return None

    lines = content.splitlines(keepends=True)

    if bug_type == BugType.IMPORT.value or "ModuleNotFoundError" in error_message or "ImportError" in error_message:
        # Try commenting out the bad import
        m = re.search(r"No module named '([^']+)'", error_message)
        if m:
            module = m.group(1).split(".")[0]
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if (f"import {module}" in stripped or f"from {module}" in stripped) and not stripped.startswith("#"):
                    new_lines.append(f"# FIXED: {line.rstrip()}  # module not available\n")
                else:
                    new_lines.append(line)
            return "".join(new_lines)

    if bug_type == BugType.INDENTATION.value:
        # Convert tabs to 4 spaces
        new_content = content.replace("\t", "    ")
        return new_content

    if bug_type == BugType.SYNTAX.value:
        # Find line number from error and comment it out
        m = re.search(r"line (\d+)", error_message)
        if m:
            lineno = int(m.group(1)) - 1
            if 0 <= lineno < len(lines):
                lines[lineno] = f"# SYNTAX FIX: {lines[lineno].rstrip()}  # original line had syntax error\n"
                return "".join(lines)

    if bug_type == BugType.LINTING.value:
        # Remove unused imports: F401
        m = re.search(r"line (\d+)", error_message)
        if m and "unused" in error_message.lower():
            lineno = int(m.group(1)) - 1
            if 0 <= lineno < len(lines):
                lines[lineno] = f"# REMOVED: {lines[lineno].rstrip()}  # unused import\n"
                return "".join(lines)

    return None


# ---------------------------------------------------------------------------
# Main agent class
# ---------------------------------------------------------------------------

class FixGeneratorAgent:
    """
    Generates minimal code fixes for classified failures.
    Uses AGNO + Gemini as primary, heuristic logic as fallback.
    """

    def __init__(self):
        self._agent: Optional[Any] = None
        if _AGNO_AVAILABLE:
            api_key = os.getenv("GOOGLE_API_KEY", "")
            if api_key:
                try:
                    self._agent = Agent(
                        model=Gemini(id="gemini-2.0-flash", api_key=api_key),
                        description="You fix Python code bugs with minimal diffs.",
                        markdown=False,
                    )
                    logger.info("[FixGeneratorAgent] AGNO+Gemini agent initialized.")
                except Exception as e:
                    logger.warning(f"[FixGeneratorAgent] AGNO init failed: {e}")

    def _fix_with_llm(self, file_path: str, bug_type: str, error_message: str, repo_dir: str) -> Optional[str]:
        if not self._agent:
            return None
        content = read_file_safe(file_path) or ""
        # Truncate for prompt
        truncated = "\n".join(content.splitlines()[:200])
        rel_path = str(Path(os.path.realpath(file_path)).relative_to(os.path.realpath(repo_dir))) if repo_dir in file_path or os.path.realpath(repo_dir) in os.path.realpath(file_path) else file_path
        prompt = _FIX_PROMPT_TEMPLATE.format(
            file=rel_path,
            bug_type=bug_type,
            error_message=error_message[:500],
            file_content=truncated,
        )
        try:
            response = self._agent.run(prompt)
            fixed = response.content if hasattr(response, "content") else str(response)
            # Strip markdown fences if present
            fixed = re.sub(r"^```python\n?", "", fixed, flags=re.MULTILINE)
            fixed = re.sub(r"^```\n?", "", fixed, flags=re.MULTILINE)
            return fixed.strip() + "\n"
        except Exception as e:
            logger.error(f"[FixGeneratorAgent] LLM call failed: {e}")
            return None

    def run(self, classified_failures: List[Dict[str, Any]], repo_dir: str) -> List[FixProposal]:
        proposals: List[FixProposal] = []
        seen_files: set = set()

        for failure in classified_failures:
            raw_file = failure.get("file", "")
            # Resolve to absolute path (normalize for macOS /tmp → /private/tmp)
            real_repo = os.path.realpath(repo_dir)
            if os.path.isabs(raw_file):
                abs_file = raw_file
            else:
                abs_file = os.path.join(real_repo, raw_file)

            # Skip if file doesn't exist or we already fixed it
            if not os.path.exists(abs_file):
                # Try with un-realpath'd repo_dir as fallback
                alt = os.path.join(repo_dir, raw_file) if not os.path.isabs(raw_file) else raw_file
                if os.path.exists(alt):
                    abs_file = alt
                else:
                    logger.warning(f"[FixGeneratorAgent] File not found: {abs_file}")
                    continue
            if abs_file in seen_files:
                continue

            bug_type = failure.get("bug_type", BugType.UNKNOWN.value)
            error_message = failure.get("error_message", "")
            line = failure.get("line")

            # Try LLM first, then heuristic
            fixed_content = self._fix_with_llm(abs_file, bug_type, error_message, real_repo)
            if not fixed_content:
                fixed_content = _heuristic_fix(abs_file, bug_type, error_message)

            if fixed_content:
                original = read_file_safe(abs_file) or ""

                # Skip if the "fix" is identical to the original (no actual change)
                if original.strip() == fixed_content.strip():
                    rel_file = os.path.relpath(abs_file, real_repo)
                    proposal = FixProposal(
                        file=rel_file,
                        line=line,
                        bug_type=BugType(bug_type) if bug_type in BugType._value2member_map_ else BugType.UNKNOWN,
                        description=f"No change needed for {bug_type} in {rel_file}",
                        commit_message=f"[AI-AGENT] No fix for {bug_type} in {rel_file}",
                        status="Skipped",
                    )
                    proposals.append(proposal)
                    logger.info(f"[FixGeneratorAgent] Skipped {rel_file} — fix identical to original")
                    continue

                write_file_safe(abs_file, fixed_content)
                seen_files.add(abs_file)

                rel_file = os.path.relpath(abs_file, real_repo)
                proposal = FixProposal(
                    file=rel_file,
                    line=line,
                    bug_type=BugType(bug_type) if bug_type in BugType._value2member_map_ else BugType.UNKNOWN,
                    original_code=original[:500] if original else None,
                    fixed_code=fixed_content[:500],
                    description=f"Fixed {bug_type} in {rel_file}",
                    commit_message=f"[AI-AGENT] Fix {bug_type} in {rel_file}",
                    status="Fixed",
                )
                proposals.append(proposal)
                logger.info(f"[FixGeneratorAgent] Fixed {rel_file} ({bug_type})")
            else:
                rel_file = os.path.relpath(abs_file, real_repo) if os.path.isabs(abs_file) else raw_file
                proposal = FixProposal(
                    file=rel_file,
                    line=line,
                    bug_type=BugType(bug_type) if bug_type in BugType._value2member_map_ else BugType.UNKNOWN,
                    description=f"Could not fix {bug_type} in {rel_file}",
                    commit_message=f"[AI-AGENT] Attempted fix for {bug_type} in {rel_file}",
                    status="Failed",
                )
                proposals.append(proposal)
                logger.warning(f"[FixGeneratorAgent] Could not fix {rel_file}")

        return proposals
