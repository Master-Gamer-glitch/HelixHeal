"""Bug Classifier Agent — enriches raw test failures with specific bug type classification."""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

from app.models import BugType, TestFailure

logger = logging.getLogger(__name__)


_PATTERNS: List[tuple] = [
    (BugType.INDENTATION, re.compile(r"IndentationError|TabError|unexpected indent|unindent")),
    (BugType.SYNTAX, re.compile(r"SyntaxError|invalid syntax|EOF while parsing")),
    (BugType.IMPORT, re.compile(r"ImportError|ModuleNotFoundError|cannot import name")),
    (BugType.TYPE_ERROR, re.compile(r"TypeError|takes \d+ positional argument")),
    (BugType.LOGIC, re.compile(r"AssertionError|NameError|AttributeError|ValueError|KeyError|IndexError")),
    (BugType.LINTING, re.compile(r"flake8|ruff|E\d{3}|W\d{3}|F\d{3}|undefined name|unused import")),
]


def _classify(text: str) -> BugType:
    for bug_type, pattern in _PATTERNS:
        if pattern.search(text):
            return bug_type
    return BugType.UNKNOWN


class BugClassifierAgent:
    """
    Takes raw test failures and returns enriched, classified `TestFailure` objects.
    """

    def run(self, test_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        raw_failures = test_result.get("failures", [])
        classified: List[Dict[str, Any]] = []

        for f in raw_failures:
            msg = f.get("error_message", "") + " " + (f.get("raw_output") or "")
            bug_type = _classify(msg)
            enriched = dict(f)
            enriched["bug_type"] = bug_type.value
            classified.append(enriched)

        # Also run a basic linting pass over the output
        output = test_result.get("output", "")
        if re.search(r"E\d{3}|W\d{3}|F\d{3}", output):
            # Parse flake8/ruff style output: file.py:line:col: E123 message
            for line in output.splitlines():
                m = re.match(r"^(.+\.py):(\d+):\d+: ([EWF]\d+) (.+)$", line)
                if m:
                    classified.append({
                        "file": m.group(1),
                        "line": int(m.group(2)),
                        "error_message": f"{m.group(3)}: {m.group(4)}",
                        "bug_type": BugType.LINTING.value,
                        "raw_output": line,
                    })

        logger.info(f"[BugClassifierAgent] Classified {len(classified)} failures")
        return classified
