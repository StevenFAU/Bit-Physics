"""Bit-Physics canonical capture format (spec § 2.7).

Public surface is pinned in `docs/phases/phase-0-plan.md` § 3.3.1.
"""

from __future__ import annotations

from .diff import CaptureDiff, diff_captures
from .manifest import CaptureManifest, load_reference_manifest
from .reader import Capture, StepState, load_capture
from .writer import write_capture

__all__ = [
    "Capture",
    "CaptureDiff",
    "CaptureManifest",
    "StepState",
    "diff_captures",
    "load_capture",
    "load_reference_manifest",
    "write_capture",
]
