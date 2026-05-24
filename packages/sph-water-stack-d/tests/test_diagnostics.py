"""Tier 1 + Tier 2 particle (IC-5) diagnostics tests (gates 5, 6).

Mirrors the Stack-B test at ``packages/sph-water/tests/test_diagnostics.py``
(same algorithm -> same particle-substack diagnostics). The Stack-D Taichi port
exposes a diagnostic-tier trajectory (64 particles x 8 steps, capture every 2
steps) rather than the full canonical 100K-particle / 1000-step descriptor —
diagnostic-tier fixtures keep pytest invocation bounded while exercising the
full kernel + neighbor-list + continuity surface end-to-end (R-T5 mitigation).

``check_momentum_conservation`` is ADVISORY (DFSPH + gravity is not strictly
momentum-conserving; spec-ref § 10) — the test asserts only that the diagnostic
surface evaluates to a finite value, not that it passes.

The Stack-D modules ``sph_water_stack_d.reference.dfsph_taichi`` and
``sph_water_stack_d.sim`` do NOT exist at the failing-tests commit — collection
fails with ``ModuleNotFoundError`` cleanly until Stage 1b implements them.
"""

from __future__ import annotations

import numpy as np
import pytest
from diagnostics.tier2.particle import (
    check_count_invariance,
    check_momentum_conservation,
    check_neighbor_list_integrity,
    check_no_overlap,
)
from sph_water_stack_d.reference.dfsph_taichi import (  # type: ignore[import-not-found]
    canonical_params,
)
from sph_water_stack_d.sim import (  # type: ignore[import-not-found]
    compute_diagnostic_trajectory,
    neighbor_lists_at,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)

_DIAGNOSTIC_N_PARTICLES = 64
_DIAGNOSTIC_N_STEPS = 8


@pytest.fixture(scope="module")
def diagnostic_trajectory() -> tuple[np.ndarray, np.ndarray, list[int]]:
    return compute_diagnostic_trajectory(
        seed=42,
        n_particles=_DIAGNOSTIC_N_PARTICLES,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=2,
    )


def test_tier1_health_no_nan_inf(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Stack-D diagnostic trajectory contains no NaN or Inf at any step."""
    p_hist, v_hist, _ = diagnostic_trajectory
    assert p_hist.ndim == 3 and p_hist.shape[2] == 3
    assert v_hist.shape == p_hist.shape
    assert np.all(np.isfinite(p_hist)), "positions contain non-finite values"
    assert np.all(np.isfinite(v_hist)), "velocities contain non-finite values"


def test_tier2_particle_count_invariance(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Particle count is the same at the first and last captured frame."""
    p_hist, _, step_indices = diagnostic_trajectory
    result = check_count_invariance(
        count_t0=int(p_hist[0].shape[0]),
        count_t1=int(p_hist[-1].shape[0]),
    )
    assert result.passed, result.details
    assert step_indices[-1] >= step_indices[0]


def test_tier2_particle_no_overlap_at_half_spacing(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Initial seeded-42 dam-break IC has no zero-distance pair (epsilon=0)."""
    p_hist, _, _ = diagnostic_trajectory
    result = check_no_overlap(p_hist[0], epsilon=0.0)
    assert result.passed, result.details


def test_tier2_particle_neighbor_list_integrity(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Stack-D neighbor-list builder satisfies IC-5's three invariants."""
    p_hist, _, _ = diagnostic_trajectory
    h = float(canonical_params()["h"])
    nbrs = neighbor_lists_at(p_hist[0], h=h)
    result = check_neighbor_list_integrity(
        positions=p_hist[0],
        neighbor_lists=nbrs,
        cutoff_radius=2.0 * h,  # cubic-spline compact support r < 2h
    )
    assert result.passed, result.details


def test_tier2_particle_momentum_conservation_advisory(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Momentum-conservation ADVISORY (gravity is non-conservative)."""
    p_hist, v_hist, _ = diagnostic_trajectory
    n = int(p_hist[0].shape[0])
    masses = np.ones((n,), dtype=np.float64) * 1.0e-3
    result = check_momentum_conservation(
        velocities_t0=v_hist[0],
        velocities_t1=v_hist[-1],
        masses=masses,
        tolerance_rel=1.0,  # loose: gravity is non-conservative
    )
    assert np.isfinite(result.value), result.details
