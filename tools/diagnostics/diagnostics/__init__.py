"""Bit-Physics diagnostic toolchain (spec § 3.3).

Public surface per `docs/phases/phase-0-plan.md` § 3.3.6.
"""

from __future__ import annotations

from .tier1.determinism import check_determinism
from .tier1.health import HealthReport, check_health
from .tier1.performance import PerformanceReport, check_performance
from .tier1.reports import DiagnosticReport
from .tier2.scalar_field.conservation import ConservationReport, check_conservation
from .tier2.scalar_field.monotone_bounds import BoundsReport, check_bounds
from .tier2.scalar_field.spectral_content import SpectralReport, check_spectral_content

__all__ = [
    "BoundsReport",
    "ConservationReport",
    "DiagnosticReport",
    "HealthReport",
    "PerformanceReport",
    "SpectralReport",
    "check_bounds",
    "check_conservation",
    "check_determinism",
    "check_health",
    "check_performance",
    "check_spectral_content",
]
