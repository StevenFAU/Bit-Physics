"""Tier 1 — universal, stack-agnostic, sim-agnostic diagnostic checks."""

from __future__ import annotations

from .capture_io import (
    SUPPORTED_SCHEMA_MAJOR,
    UnsupportedSchemaError,
    enforce_schema_version,
    iter_step_arrays,
)
from .determinism import check_determinism
from .health import HealthReport, check_health
from .performance import PerformanceReport, check_performance
from .reports import DiagnosticReport

__all__ = [
    "SUPPORTED_SCHEMA_MAJOR",
    "DiagnosticReport",
    "HealthReport",
    "PerformanceReport",
    "UnsupportedSchemaError",
    "check_determinism",
    "check_health",
    "check_performance",
    "enforce_schema_version",
    "iter_step_arrays",
]
