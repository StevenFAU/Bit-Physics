"""Tier 1 + Tier 2 particle (IC-5) diagnostics tests (gates 5, 6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the agent-based sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1; the imported
``sim_runner_seeded`` contract is preserved as the noqa-tagged
contract import).
"""

from __future__ import annotations

import numpy as np
import pytest
from diagnostics.tier2.particle import (
    check_count_invariance,
    check_neighbor_list_integrity,
    check_no_overlap,
)

from boids_3d.reference import canonical_params
from boids_3d.sim import (
    compute_canonical_trajectory,
    neighbor_lists_at,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)

_DIAGNOSTIC_N_STEPS = 50  # diagnostic-tier check — shorter prefix of the
# canonical seed-42 trajectory; sufficient to exercise tier-1 NaN/Inf,
# IC-5 count-invariance, no-overlap, and neighbor-list-integrity over
# the 1000-agent canonical flock without re-running the full 1000-step
# capture multiple times per pytest invocation.


@pytest.fixture(scope="module")
def diagnostic_trajectory() -> tuple[np.ndarray, np.ndarray, list[int]]:
    return compute_canonical_trajectory(
        seed=42,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=max(1, _DIAGNOSTIC_N_STEPS // 5),
    )


def test_tier1_health_no_nan_inf(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Canonical 1000-agent trajectory contains no NaN or Inf at any step."""
    p_hist, v_hist, _ = diagnostic_trajectory
    assert p_hist.ndim == 3 and p_hist.shape[2] == 3
    assert v_hist.shape == p_hist.shape
    assert np.all(np.isfinite(p_hist)), "positions contain non-finite values"
    assert np.all(np.isfinite(v_hist)), "velocities contain non-finite values"


def test_tier2_particle_count_invariance(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Agent count is the same at the first and last captured frame."""
    p_hist, _, step_indices = diagnostic_trajectory
    count_t0 = int(p_hist[0].shape[0])
    count_tn = int(p_hist[-1].shape[0])
    result = check_count_invariance(count_t0=count_t0, count_t1=count_tn)
    assert result.passed, result.details
    assert step_indices[-1] >= step_indices[0]


def test_tier2_particle_no_overlap_optional(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Initial canonical-seed-42 flock has no zero-distance pair (epsilon=0)."""
    p_hist, _, _ = diagnostic_trajectory
    result = check_no_overlap(p_hist[0], epsilon=0.0)
    assert result.passed, result.details


def test_tier2_particle_neighbor_list_integrity(
    diagnostic_trajectory: tuple[np.ndarray, np.ndarray, list[int]],
) -> None:
    """Reference neighbor-list builder satisfies IC-5's three invariants."""
    p_hist, _, _ = diagnostic_trajectory
    radius = float(canonical_params()["perception_radius"])
    neighbor_lists = neighbor_lists_at(p_hist[0], perception_radius=radius)
    result = check_neighbor_list_integrity(
        positions=p_hist[0],
        neighbor_lists=neighbor_lists,
        cutoff_radius=radius,
    )
    assert result.passed, result.details
