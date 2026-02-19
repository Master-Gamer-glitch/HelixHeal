"""CI Monitor Agent — tracks test pass/fail status per iteration."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models import CIStatus, CITimepoint

logger = logging.getLogger(__name__)


class CIMonitorAgent:
    """
    Records CI/CD status for each iteration of the fix loop.
    Supports early stopping when tests pass.
    """

    def __init__(self) -> None:
        self.timeline: List[CITimepoint] = []

    def record(
        self,
        iteration: int,
        test_result: Dict[str, Any],
        post_test_result: Optional[Dict[str, Any]] = None,
    ) -> CITimepoint:
        passed = test_result.get("passed", False)
        status = CIStatus.PASSED if passed else CIStatus.FAILED
        failures_raw = test_result.get("failures", [])
        failure_msgs = [f.get("error_message", "")[:200] for f in failures_raw]

        timepoint = CITimepoint(
            iteration=iteration,
            status=status,
            timestamp=datetime.utcnow().isoformat() + "Z",
            failures=failure_msgs,
        )

        if post_test_result is not None:
            post_passed = post_test_result.get("passed", False)
            timepoint.post_status = CIStatus.PASSED if post_passed else CIStatus.FAILED
            post_failures_raw = post_test_result.get("failures", [])
            timepoint.post_failures = [f.get("error_message", "")[:200] for f in post_failures_raw]

        self.timeline.append(timepoint)
        logger.info(f"[CIMonitorAgent] Iteration {iteration}: {status}")
        return timepoint

    def should_stop(self, test_result: Dict[str, Any]) -> bool:
        """Return True if tests are passing (early stop signal)."""
        return test_result.get("passed", False)

    def get_timeline(self) -> List[CITimepoint]:
        return self.timeline

    def reset(self) -> None:
        self.timeline = []
