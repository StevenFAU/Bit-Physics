"""Tier 2 — scalar-field diagnostics."""

from __future__ import annotations

from .conservation import ConservationReport, check_conservation
from .monotone_bounds import BoundsReport, check_bounds
from .spectral_content import SpectralReport, check_spectral_content

__all__ = [
    "BoundsReport",
    "ConservationReport",
    "SpectralReport",
    "check_bounds",
    "check_conservation",
    "check_spectral_content",
]
