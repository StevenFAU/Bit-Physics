"""Canonical types per Phase 0 plan § 3.3.5."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class FailureMode(Enum):
    HARD_FAIL = "HARD_FAIL"
    SOFT_WARN = "SOFT_WARN"
    AUDIT_LOG = "AUDIT_LOG"


@dataclass(frozen=True)
class Finding:
    """One finding emitted by a Cat-N check.

    Fields per Phase 0 plan § 3.3.5.
    """

    check: str
    severity: FailureMode
    path: Path
    line: int | None
    message: str
