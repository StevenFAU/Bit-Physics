"""PBT invariant tests (gate 11; spec § 6.6), Stack-D.

Two invariants port from the Phase-1 reference (spec-ref § 6.6), driving the
Stack-D Taichi-DSL ``project_pressure`` + ``semi_lagrangian_advect_2d``:

  - ``divergence_free_post_projection`` -- post-projection L-inf divergence is
    below the sub-phase-empirical collocated-grid residual floor.
  - ``smoke_density_nonneg`` -- the scalar density φ stays ≥ 0 under
    semi-Lagrangian advection of a divergence-free velocity.

Both are Hypothesis-decorated callables (≥ 50 examples each per gate-11) defined
in ``eulerian_smoke_stack_d.invariants``, which does NOT exist at the
failing-tests commit -- collection fails with ModuleNotFoundError cleanly until
the implementation lands.
"""

from __future__ import annotations

from eulerian_smoke_stack_d.invariants import (  # type: ignore[import-not-found]
    divergence_free_post_projection,
    smoke_density_nonneg,
)


def test_divergence_free_post_projection_pbt() -> None:
    """Post-projection divergence stays below the collocated-grid floor for any IC."""
    divergence_free_post_projection()


def test_smoke_density_nonneg_pbt() -> None:
    """Smoke density φ stays ≥ 0 under semi-Lagrangian advection (max-principle)."""
    smoke_density_nonneg()
