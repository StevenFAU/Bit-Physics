"""PBT invariant tests (gate 11; spec § 6.6).

Phase 1 shipped these as failing-imports; the closed-form sub-phase
Stage 1 fills in the bodies (SHIFTED per the Stage 1 checkpoint — the
imported invariants are Hypothesis-decorated callables defined in
``strange_attractors.invariants``).
"""

from __future__ import annotations

from strange_attractors.invariants import (
    rk4_time_reversibility_modulo_dissipation,
    volume_contraction_rate_constant,
)


def test_lorenz_origin_volume_contraction() -> None:
    """Lorenz divergence is the canonical constant at any sampled point."""
    volume_contraction_rate_constant()


def test_rk4_time_reversibility_sprott_a() -> None:
    """Sprott-A RK4 round-trip error is O(dt^4)."""
    rk4_time_reversibility_modulo_dissipation()
