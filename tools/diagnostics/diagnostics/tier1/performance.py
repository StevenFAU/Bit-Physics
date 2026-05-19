"""Tier 1 — performance aggregation.

Reads wall-clock + dispatch-count + memory-HWM stats from the capture
manifest's `run` and `metadata` blocks. The stack supplies whichever of
these fields it has access to (Stack B / Stack D / etc.); diagnostics
just aggregates and surfaces them.
"""

from __future__ import annotations

from dataclasses import dataclass

from capture import Capture

from .capture_io import enforce_schema_version


@dataclass(frozen=True)
class PerformanceReport:
    wall_clock_seconds: float
    step_count: int
    seconds_per_step: float
    capture_interval: int
    gpu_dispatch_count: int | None
    memory_high_water_bytes: int | None


def _coerce_int(value: object) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def check_performance(capture: Capture) -> PerformanceReport:
    enforce_schema_version(capture)
    run = capture.manifest.run
    metadata = capture.metadata or {}
    wall = float(run.get("wall_clock_seconds", 0.0))
    step_count = int(run.get("step_count", 0))
    seconds_per_step = (wall / step_count) if step_count > 0 else 0.0
    return PerformanceReport(
        wall_clock_seconds=wall,
        step_count=step_count,
        seconds_per_step=seconds_per_step,
        capture_interval=int(run.get("capture_interval", 0)),
        gpu_dispatch_count=_coerce_int(metadata.get("gpu_dispatch_count")),
        memory_high_water_bytes=_coerce_int(metadata.get("memory_high_water_bytes")),
    )
