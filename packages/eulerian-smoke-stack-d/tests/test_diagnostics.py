"""Tier 1 + Tier 2 vector_field (IC-6) diagnostics tests (gates 5 + 6), Stack-D.

Mirrors the Phase-1 ``test_diagnostics`` but drives the Stack-D Taichi-DSL sim's
``compute_canonical_trajectory_3d`` (small N, in-memory; exercises every kernel:
trilinear SL advection, vorticity-confinement skeleton [eps=0 dead path],
viscous diffusion, fixed-20-sweep Jacobi projection, scalar density advection):

  - Tier 1: NaN/Inf scan over the diagnostic trajectory (gate 5).
  - Tier 2 vector_field (IC-6, gate 6): ``check_divergence_free`` (load-bearing
    post-projection invariant at the canonical Jacobi cap) + ``check_circulation``
    / ``check_helicity`` / ``check_energy_spectrum`` (advisory per spec-ref § 10).

The Stack-D sim module ``eulerian_smoke_stack_d.sim`` does NOT exist at the
failing-tests commit -- collection fails with ModuleNotFoundError cleanly until
the implementation lands.
"""

from __future__ import annotations

import numpy as np
import pytest
from diagnostics.tier2.vector_field import (
    check_circulation,
    check_divergence_free,
    check_energy_spectrum,
    check_helicity,
)
from eulerian_smoke_stack_d.sim import (  # type: ignore[import-not-found]
    compute_canonical_trajectory_3d,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)

_DIAGNOSTIC_N: int = 32
_DIAGNOSTIC_N_STEPS: int = 20
_DIAGNOSTIC_CAPTURE_INTERVAL: int = 5  # 5 frames over 20 steps.

_Trajectory = tuple[
    list[int], list[np.ndarray], list[np.ndarray], list[np.ndarray], list[np.ndarray]
]


@pytest.fixture(scope="module")
def diagnostic_trajectory() -> _Trajectory:
    """In-memory diagnostic-tier Taichi trajectory (small N, no I/O)."""
    return compute_canonical_trajectory_3d(
        seed=42,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=_DIAGNOSTIC_CAPTURE_INTERVAL,
        n=_DIAGNOSTIC_N,
    )


def _velocity_field_at_step(diagnostic_trajectory: _Trajectory, step_index: int) -> np.ndarray:
    """Assemble the ``(Nx, Ny, Nz, 3)`` velocity field at the given history index."""
    _step_indices, u_hist, v_hist, w_hist, _d_hist = diagnostic_trajectory
    return np.stack([u_hist[step_index], v_hist[step_index], w_hist[step_index]], axis=-1)


def test_tier1_health_no_nan_inf(diagnostic_trajectory: _Trajectory) -> None:
    """Diagnostic-tier Stack-D trajectory contains no NaN or Inf at any step."""
    _step_indices, u_hist, v_hist, w_hist, d_hist = diagnostic_trajectory
    for arr in u_hist:
        assert np.all(np.isfinite(arr)), "u contains non-finite values"
    for arr in v_hist:
        assert np.all(np.isfinite(arr)), "v contains non-finite values"
    for arr in w_hist:
        assert np.all(np.isfinite(arr)), "w contains non-finite values"
    for arr in d_hist:
        assert np.all(np.isfinite(arr)), "density contains non-finite values"


def test_tier2_vector_field_divergence_free_post_projection(
    diagnostic_trajectory: _Trajectory,
) -> None:
    """Discrete divergence is bounded post-projection at the canonical Jacobi cap.

    With ``n_jacobi = 20`` (canonical, fixed-iter), the Jacobi solver is a
    smoother (not a converged solver), so the residual divergence does NOT vanish
    to machine precision; the diagnostic-tier check uses the sub-phase-empirical
    advisory threshold ``5e-1`` for the short-window 32³ trajectory (Phase-1
    parity)."""
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    result = check_divergence_free(velocity, grid_spacing=dx, tolerance_abs=5e-1)
    assert result.passed, (
        f"diagnostic-tier divergence-free advisory failed: "
        f"value={result.value}, tolerance={result.tolerance}, details={result.details}"
    )


def test_tier2_vector_field_circulation_advisory(diagnostic_trajectory: _Trajectory) -> None:
    """Circulation around a closed loop -- advisory (no expected value)."""
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    n = _DIAGNOSTIC_N
    half = n // 2
    quarter = n // 4
    three_quarter = 3 * n // 4
    loop = [
        (quarter, quarter, half),
        (three_quarter, quarter, half),
        (three_quarter, three_quarter, half),
        (quarter, three_quarter, half),
        (quarter, quarter, half),
    ]
    result = check_circulation(
        velocity, grid_spacing=dx, loop_specification=loop, expected_value=None
    )
    assert result.value is not None and np.isfinite(result.value), (
        f"circulation produced non-finite value: {result}"
    )


def test_tier2_vector_field_helicity_advisory(diagnostic_trajectory: _Trajectory) -> None:
    """Volume-integrated helicity -- advisory."""
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    result = check_helicity(velocity, grid_spacing=dx, expected_value=None)
    assert result.value is not None and np.isfinite(result.value), (
        f"helicity produced non-finite value: {result}"
    )


def test_tier2_vector_field_energy_spectrum_advisory(diagnostic_trajectory: _Trajectory) -> None:
    """Radial energy spectrum -- advisory."""
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    result = check_energy_spectrum(velocity, grid_spacing=dx, expected_slope=None, fit_range=None)
    e_k = result.details.get("E_k", [])
    assert len(e_k) > 0 and all(np.isfinite(e_k)), (
        f"energy_spectrum produced non-finite spectrum: {result}"
    )
