"""Tier 3 — Neural-CA sim-specific diagnostics.

Per `docs/phases/phase-3-plan.md` § 3.2.9 + spec-ref
``docs/sim-specs/continuous-ca/neural-ca/spec-ref.md`` § 10. Sits above the
generic Tier-1 (NaN/Inf) and Tier-2 (scalar-field bounds) diagnostics. Documents
the learned-dynamics regime (NOT gated, per the lenia/ising/cloth Tier-3
precedent): the visible RGBA stays in [0, 1] under clamping, the full state stays
finite (the hidden channels are unbounded by design), and the alive-cell coverage
stays bounded (the pool-trained model does NOT overgrow to a filled grid).
"""

from __future__ import annotations

from .field_health import (
    AliveCoverageReport,
    VisibleBoundsReport,
    check_alive_coverage,
    check_visible_bounds,
)

__all__ = [
    "AliveCoverageReport",
    "VisibleBoundsReport",
    "check_alive_coverage",
    "check_visible_bounds",
]
