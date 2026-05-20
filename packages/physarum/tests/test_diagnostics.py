"""Tier 1 + Tier 2 particle (IC-5) + scalar_field diagnostics (gates 5, 6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the agent-based sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1; the imported
``sim_runner_seeded`` contract is preserved as the noqa-tagged
contract import).
"""

from __future__ import annotations

import numpy as np
import pytest
from diagnostics.tier2.particle import check_count_invariance
from diagnostics.tier2.scalar_field import check_bounds
from capture import load_capture

from physarum.reference import canonical_params
from physarum.sim import (
    compute_short_trajectory,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


@pytest.fixture(scope="module")
def short_trajectory() -> dict[str, np.ndarray]:
    return compute_short_trajectory(seed=42, n_steps=50, capture_interval=10)


@pytest.fixture(scope="module")
def short_capture(tmp_path_factory: pytest.TempPathFactory) -> object:
    out = tmp_path_factory.mktemp("phys-diag")
    # A shorter (n_steps=20) seeded capture is enough to exercise the
    # scalar_field check_bounds traversal over a captured manifest.
    from physarum.sim import (
        _build_manifest,
        _evolve_to_step_states,
        _seeded_initial_state,
    )
    from capture import write_capture

    grid_shape = (32, 32)
    positions, headings = _seeded_initial_state(42, n_agents=20, grid_shape=grid_shape)
    params = canonical_params()
    rows = _evolve_to_step_states(
        positions,
        headings,
        grid_shape=grid_shape,
        step_count=20,
        capture_interval=10,
        params=params,
    )
    manifest = _build_manifest(
        descriptor="phys-diag-fixture",
        grid_shape=grid_shape,
        n_agents=20,
        seed=42,
        step_count=20,
        capture_interval=10,
        wall_clock_seconds=0.0,
    )
    manifest_path = write_capture(rows, manifest, out)
    return load_capture(manifest_path)


def test_tier1_health_no_nan_inf(short_trajectory: dict[str, np.ndarray]) -> None:
    """Short canonical-parameter trajectory has no NaN or Inf at any step."""
    T_hist = short_trajectory["T_history"]
    p_hist = short_trajectory["positions_history"]
    assert np.all(np.isfinite(T_hist)), "trail map contains non-finite values"
    assert np.all(np.isfinite(p_hist)), "positions contain non-finite values"


def test_tier2_particle_count_invariance(
    short_trajectory: dict[str, np.ndarray],
) -> None:
    """Agent count is preserved between first and last captured frame."""
    p_hist = short_trajectory["positions_history"]
    count_t0 = int(p_hist[0].shape[0])
    count_tn = int(p_hist[-1].shape[0])
    result = check_count_invariance(count_t0=count_t0, count_t1=count_tn)
    assert result.passed, result.details


def test_tier2_scalar_field_bounds_on_trail_map(short_capture: object) -> None:
    """Trail map stays >= 0 (no negative deposits) across captured frames."""
    # Upper bound is generous — physarum mass grows over many steps,
    # but at n_steps=20 with 20 agents the upper bound is well below 100.
    report = check_bounds(short_capture, "trail_map", lo=0.0, hi=1e3)
    assert report.ok, report.violations[:3]


def test_tier2_scalar_field_conservation_advisory(
    short_trajectory: dict[str, np.ndarray],
) -> None:
    """Mass-balance: each step satisfies m' = m*(1-α) + N*deposit*(1-α).

    Advisory in the docs sense (physarum decays trail mass by design),
    but the algebraic invariant per :func:`physarum.invariants.trail_mass_conserves_modulo_decay`
    holds bit-exactly for the NumPy reference; assert it here as a
    spot-check across the short canonical-parameter trajectory.
    """
    T_hist = short_trajectory["T_history"]
    params = canonical_params()
    alpha = float(params["decay_alpha"])
    deposit = float(params["deposit"])
    n_agents = int(short_trajectory["positions_history"].shape[1])
    masses = T_hist.reshape(T_hist.shape[0], -1).sum(axis=1)
    for k in range(1, len(masses)):
        # The captured frames are spaced ``capture_interval`` steps
        # apart; iterate the recurrence that many times to predict
        # ``masses[k]`` from ``masses[k - 1]``.
        n_steps_between = int(
            short_trajectory["step_indices"][k]
            - short_trajectory["step_indices"][k - 1]
        )
        m = float(masses[k - 1])
        for _ in range(n_steps_between):
            m = m * (1.0 - alpha) + n_agents * deposit * (1.0 - alpha)
        assert abs(float(masses[k]) - m) < 1e-8 * max(1.0, abs(m)), (
            f"mass-balance recurrence drift at frame {k}: "
            f"observed={float(masses[k]):.6f} predicted={m:.6f}"
        )
