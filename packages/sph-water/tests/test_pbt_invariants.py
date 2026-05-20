"""PBT invariants — ≥ 2 declared in spec § 6.6 (gate 12).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the particle-fluids sph-water sub-phase Stage 1 fills in the bodies
(SHIFTED — parallels closed-form / agent-based S1 inheritance; the
imported invariants are Hypothesis-decorated callables defined in
``sph_water.invariants``).
"""

from __future__ import annotations

from sph_water.invariants import (  # type: ignore[import-not-found]  # noqa: F401
    density_nonneg,
    kernel_normalization_unit_volume,
)


def test_density_nonneg() -> None:
    """SPH density stays non-negative under random configurations."""
    density_nonneg()


def test_kernel_normalization_unit_volume() -> None:
    """Self-contribution alone matches σ_3 / h^3 at the kernel peak."""
    kernel_normalization_unit_volume()
