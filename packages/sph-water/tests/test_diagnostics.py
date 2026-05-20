"""Tier 1 + Tier 2 particle (IC-5) diagnostics tests (gates 6, 7).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the particle-fluids sph-water sub-phase Stage 1 fills in the bodies
(SHIFTED — parallels closed-form / agent-based S1 inheritance; the
imported ``sim_runner_seeded`` contract is preserved as the
noqa-tagged contract import).

Implementation uses :func:`sph_water.sim.compute_diagnostic_trajectory`
(64 particles × 8 steps, capture every 2 steps) rather than the full
canonical 1M-particle / 1000-step descriptor — diagnostic-tier
fixtures keep pytest invocation bounded while still exercising the
full kernel + neighbor-list + continuity surface end-to-end. Parallels
the agent-based ``_DIAGNOSTIC_N_STEPS = 50`` pattern at
``packages/boids-3d/tests/test_diagnostics.py``.
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

from sph_water.reference.dfsph import canonical_params
from sph_water.sim import (
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
    """Canonical diagnostic trajectory contains no NaN or Inf at any step."""
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
    count_t0 = int(p_hist[0].shape[0])
    count_tn = int(p_hist[-1].shape[0])
    result = check_count_invariance(count_t0=count_t0, count_t1=count_tn)
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
    """Reference neighbor-list builder satisfies IC-5's three invariants."""
    p_hist, _, _ = diagnostic_trajectory
    h = float(canonical_params()["h"])
    nbrs = neighbor_lists_at(p_hist[0], h=h)
    # The cubic-spline kernel's compact support is r < 2h.
    result = check_neighbor_list_integrity(
        positions=p_hist[0],
        neighbor_lists=nbrs,
        cutoff_radius=2.0 * h,
    )
    assert result.passed, result.details


def test_tier2_particle_momentum_conservation_advisory(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Momentum-conservation as ADVISORY (gravity is non-conservative).

    Per sub-phase plan § 2 gate 7: ``momentum advisory absent boundary
    forces``. The diagnostic-tier integrator applies gravity along z;
    the resulting z-momentum drift is the expected deviation. The
    check is exercised with a loose tolerance + the result is treated
    as advisory — the test does NOT assert ``passed``, only that the
    check evaluates without error and reports a finite ``value`` (i.e.,
    the diagnostic surface is exercised end-to-end). Mirrors the
    agent-based / RD-3D advisory-gate pattern.
    """
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
