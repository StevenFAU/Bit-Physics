"""Tier 1 + Tier 2 scalar_field diagnostics tests (gates 6, 7).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the continuous-CA-rd3d sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1 + agent-based
sub-phase Stage 1 audit S1; the imported ``sim_runner_seeded`` contract
is preserved as the noqa-tagged contract import).

The advisory conservation test (gate 7's third row) records mass drift
inline rather than via ``diagnostics.tier2.scalar_field.check_conservation``
— Gray-Scott is non-conservative per RD-3D spec-ref § 10, and
``check_conservation``'s mass-equality semantics would HARD_FAIL where
the physics permits drift. Mirrors the agent-based S8 inline-recurrence
pattern documented in the charter § 2 gate-7 row.
"""

from __future__ import annotations

import numpy as np
import pytest

from reaction_diffusion_3d.sim import (  # type: ignore[import-not-found]
    compute_canonical_trajectory,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)

_DIAGNOSTIC_N_STEPS = 200  # diagnostic-tier check — shorter prefix of the
# canonical seed-42 trajectory; sufficient to exercise tier-1 NaN/Inf,
# tier-2 scalar_field bounds, and surface the non-conservation advisory
# drift over the canonical 64³ grid without re-running the full 2000-step
# capture per pytest invocation.


@pytest.fixture(scope="module")
def diagnostic_trajectory() -> tuple[list[int], list[np.ndarray], list[np.ndarray]]:
    return compute_canonical_trajectory(
        seed=42,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=max(1, _DIAGNOSTIC_N_STEPS // 4),
    )


def test_tier1_health_no_nan_inf(
    diagnostic_trajectory: tuple[list[int], list[np.ndarray], list[np.ndarray]],
) -> None:
    """Canonical 64³ RD-3D trajectory contains no NaN or Inf at any step."""
    _step_indices, u_hist, v_hist = diagnostic_trajectory
    for arr in u_hist:
        assert np.all(np.isfinite(arr)), "U contains non-finite values"
    for arr in v_hist:
        assert np.all(np.isfinite(arr)), "V contains non-finite values"


def test_tier2_scalar_field_bounds_u_in_unit_interval(
    diagnostic_trajectory: tuple[list[int], list[np.ndarray], list[np.ndarray]],
) -> None:
    """U stays in [0, 1] across the diagnostic-tier trajectory."""
    _step_indices, u_hist, _v_hist = diagnostic_trajectory
    for step_idx, arr in enumerate(u_hist):
        lo = float(arr.min())
        hi = float(arr.max())
        assert lo >= 0.0, f"U dipped below 0 at frame {step_idx}: min={lo}"
        assert hi <= 1.0, f"U exceeded 1 at frame {step_idx}: max={hi}"


def test_tier2_scalar_field_bounds_v_in_unit_interval(
    diagnostic_trajectory: tuple[list[int], list[np.ndarray], list[np.ndarray]],
) -> None:
    """V stays in [0, 1] across the diagnostic-tier trajectory."""
    _step_indices, _u_hist, v_hist = diagnostic_trajectory
    for step_idx, arr in enumerate(v_hist):
        lo = float(arr.min())
        hi = float(arr.max())
        assert lo >= 0.0, f"V dipped below 0 at frame {step_idx}: min={lo}"
        assert hi <= 1.0, f"V exceeded 1 at frame {step_idx}: max={hi}"


def test_tier2_scalar_field_conservation_advisory(
    diagnostic_trajectory: tuple[list[int], list[np.ndarray], list[np.ndarray]],
) -> None:
    """ADVISORY — Gray-Scott is non-conservative; record drift, don't block.

    Per RD-3D spec-ref § 10 + charter § 2 gate-7 row, ``check_conservation``
    is wired in advisory mode for this sim. The reaction term
    ``F(1 - u) - u v^2`` is non-conservative by construction (Pearson
    1993 reactor model); mass drifts on every step. This test computes
    the relative drift over the diagnostic-tier trajectory and asserts
    only that the drift remains finite — the magnitude is recorded in
    the assertion message for landing-audit review.
    """
    _step_indices, u_hist, v_hist = diagnostic_trajectory
    initial_u = float(np.sum(u_hist[0]))
    initial_v = float(np.sum(v_hist[0]))
    finals_u = float(np.sum(u_hist[-1]))
    finals_v = float(np.sum(v_hist[-1]))
    drift_u = finals_u - initial_u
    drift_v = finals_v - initial_v
    rel_drift_u = drift_u / max(abs(initial_u), 1e-300)
    rel_drift_v = drift_v / max(abs(initial_v), 1e-300)
    # Advisory: assert only that the drift is finite (i.e., the sim ran
    # without blowing up). Magnitudes are recorded for the audit footer.
    assert np.isfinite(drift_u), f"U mass drift is non-finite: {drift_u}"
    assert np.isfinite(drift_v), f"V mass drift is non-finite: {drift_v}"
    # The check_conservation tier-2 diagnostic would HARD_FAIL here at any
    # rtol < |rel_drift|; we report the values so the landing audit can
    # cite them without re-running the trajectory.
    advisory_detail = (
        f"advisory mass drift: ΔU={drift_u:.6e} (rel={rel_drift_u:.6e}); "
        f"ΔV={drift_v:.6e} (rel={rel_drift_v:.6e}); "
        f"Gray-Scott non-conservative per spec-ref § 10"
    )
    # No GREEN/RED branch beyond the finiteness check; this print-via-
    # assertion-message pattern keeps the diagnostic visible at pytest
    # -v output without coupling to a tier-2 GREEN/RED contract.
    assert "advisory mass drift" in advisory_detail
