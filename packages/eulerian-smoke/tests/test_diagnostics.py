"""Tier 1 + Tier 2 vector_field (IC-6) diagnostics tests (gates 6, 7).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the eulerian-smoke sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form / agent-based / RD-3D / sph-water Stage 1 S1
test-stub-replacement precedent inherited via
``docs/conventions/sub-phase-conventions.md`` § A.2). The imported
``sim_runner_seeded`` Protocol contract is preserved as the
noqa-tagged contract import.

The diagnostic-tier trajectory uses ``_DIAGNOSTIC_N = 32`` and
``_DIAGNOSTIC_N_STEPS = 20``, exercising the smooth low-frequency
Taylor-Green vortex IC at a sub-second pytest budget; the canonical
128³ × 500-step trajectory is exercised in
``test_determinism.py::test_run_twice_epsilon_diff`` and the Stage 2
gate-10 capture commit. Tier 2's ``check_circulation``,
``check_helicity``, ``check_energy_spectrum`` record diagnostic values
without expected-value assertions per spec-ref § 10 (Kelvin-circulation
drift under semi-Lagrangian numerical viscosity is advisory, not
gating). ``check_divergence_free`` is the load-bearing post-projection
invariant.
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

from eulerian_smoke.sim import (  # type: ignore[import-not-found]
    compute_canonical_trajectory_3d,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)

_DIAGNOSTIC_N: int = 32  # small cube — diagnostic trajectory at this N
# runs in well under a second; the canonical 128³ trajectory is
# witnessed by the gate-11 determinism harness + Stage 2 gate-10
# capture commit (the diagnostic-tier doesn't re-run that volume per
# pytest invocation).
_DIAGNOSTIC_N_STEPS: int = 20  # short prefix; exercises Tier 1 NaN/Inf
# and the four IC-6 vector_field checks without long evolution drift.
_DIAGNOSTIC_CAPTURE_INTERVAL: int = 5  # 5 frames over 20 steps.


@pytest.fixture(scope="module")
def diagnostic_trajectory() -> tuple[
    list[int], list[np.ndarray], list[np.ndarray], list[np.ndarray], list[np.ndarray]
]:
    """In-memory diagnostic-tier trajectory (small N, no I/O)."""
    return compute_canonical_trajectory_3d(
        seed=42,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=_DIAGNOSTIC_CAPTURE_INTERVAL,
        n=_DIAGNOSTIC_N,
    )


def _velocity_field_at_step(
    diagnostic_trajectory: tuple[
        list[int],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
    ],
    step_index: int,
) -> np.ndarray:
    """Assemble the ``(Nx, Ny, Nz, 3)`` velocity field at the given history index.

    The Tier 2 vector_field checks consume velocity as
    ``(*grid_shape, D)`` — stacked along a trailing component axis —
    per ``tools/diagnostics/diagnostics/tier2/vector_field/__init__.py``
    docstring.
    """
    _step_indices, u_hist, v_hist, w_hist, _d_hist = diagnostic_trajectory
    return np.stack(
        [u_hist[step_index], v_hist[step_index], w_hist[step_index]], axis=-1
    )


def test_tier1_health_no_nan_inf(
    diagnostic_trajectory: tuple[
        list[int],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
    ],
) -> None:
    """Diagnostic-tier eulerian-smoke trajectory contains no NaN or Inf at any step."""
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
    diagnostic_trajectory: tuple[
        list[int],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
    ],
) -> None:
    """Discrete divergence is bounded post-projection at the canonical Jacobi cap.

    With ``n_jacobi = 20`` (canonical, fixed-iter; conventions doc § F
    "fixed iter-cap + ≤ tolerance"), the Jacobi solver is a smoother
    (not a converged solver), so the residual divergence does NOT
    vanish to machine precision. The diagnostic-tier check uses a
    sub-phase-empirical advisory threshold of ``5e-1`` for the
    short-window 32³ trajectory; the Stage 2 commit footer records the
    canonical 128³ × 500-step final-frame divergence and the spec § 6.2
    GCI assessment quantifies fully converged divergence at Phase-2+.
    """
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    result = check_divergence_free(velocity, grid_spacing=dx, tolerance_abs=5e-1)
    assert result.passed, (
        f"diagnostic-tier divergence-free advisory failed: "
        f"value={result.value}, tolerance={result.tolerance}, details={result.details}"
    )


def test_tier2_vector_field_circulation_advisory(
    diagnostic_trajectory: tuple[
        list[int],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
    ],
) -> None:
    """Circulation around a closed loop — advisory (no expected value).

    Spec-ref § 10 row 2: Kelvin's-theorem circulation conservation is
    only approximate under semi-Lagrangian numerical viscosity; the
    value is recorded but no expected-value assertion is gated. Pass
    criterion: the check returns a finite, non-NaN result.
    """
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


def test_tier2_vector_field_helicity_advisory(
    diagnostic_trajectory: tuple[
        list[int],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
    ],
) -> None:
    """Volume-integrated helicity — advisory.

    Helicity ``∫ u · (∇ × u) dV`` drifts under semi-Lagrangian numerical
    viscosity; recorded but not gated. The Taylor-Green vortex IC has
    zero w-component → analytic helicity at t=0 is 0.
    """
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    result = check_helicity(velocity, grid_spacing=dx, expected_value=None)
    assert result.value is not None and np.isfinite(result.value), (
        f"helicity produced non-finite value: {result}"
    )


def test_tier2_vector_field_energy_spectrum_advisory(
    diagnostic_trajectory: tuple[
        list[int],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
        list[np.ndarray],
    ],
) -> None:
    """Radial energy spectrum — advisory.

    The Taylor-Green vortex's spectrum is sharply peaked at the
    forcing wavenumber and not a power-law in any clean inertial range
    at the diagnostic-tier 32³ grid; the check is recorded with
    ``expected_slope=None`` so it returns ``passed=True`` for any
    finite spectrum.
    """
    velocity = _velocity_field_at_step(diagnostic_trajectory, step_index=-1)
    dx = 1.0 / _DIAGNOSTIC_N
    result = check_energy_spectrum(
        velocity, grid_spacing=dx, expected_slope=None, fit_range=None
    )
    # With expected_slope=None the check returns passed=True; verify the
    # E_k spectrum array is populated (no NaN/Inf).
    e_k = result.details.get("E_k", [])
    assert len(e_k) > 0 and all(np.isfinite(e_k)), (
        f"energy_spectrum produced non-finite spectrum: {result}"
    )
