"""PBT invariant tests (gate 12; spec § 6.6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the eulerian-smoke sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form / agent-based / RD-3D / sph-water Stage 1 S1
test-stub-replacement precedent inherited via
``docs/conventions/sub-phase-conventions.md`` § A.2). The imported
invariants are Hypothesis-decorated callables defined in
:mod:`eulerian_smoke.invariants`.
"""

from __future__ import annotations

from eulerian_smoke.invariants import (  # type: ignore[import-not-found]
    divergence_free_post_projection,
    smoke_density_nonneg,
)


def test_divergence_free_post_projection() -> None:
    """After one ``project_pressure``, max divergence stays below tolerance."""
    divergence_free_post_projection()


def test_smoke_density_nonneg() -> None:
    """Smoke density stays ≥ 0 under semi-Lagrangian advection of any IC."""
    smoke_density_nonneg()
