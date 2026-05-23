"""Gate 4 — code verification via MMS for the Stack-D Gray-Scott port.

Consumes the bundled 2D MMS solution at
``tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/``
(Phase-1 RD-3D Stage 2 R8 deliverable; co-bundled 2D + 3D solutions).
The Stack-D Taichi sim's ``step_diffuse_react_with_source`` kernel
variant injects manufactured source terms and the observed L2 order of
accuracy matches the formal spatial order ``p_formal = 2`` (5-point
Laplacian) within ±0.5 per spec § 2.13 + phase-2-plan § 1.5.1 Gate 4.

Structural template: ``packages/reaction-diffusion-3d/tests/test_mms_convergence.py``
(adapted from 3D 7-point to 2D 5-point Laplacian). The two load-bearing
mitigations carried across:

- **L_domain = 2 · mms.L** (RD-3D P23 cause #1 mitigation). The
  manufactured solution's wavenumber κ = π / mms.L has true period
  2 · mms.L; the periodic 5-point stencil only stays consistent with
  the source-term contract when the discrete domain matches that
  period. ``sim_runner_with_source_term`` discretises accordingly.
- **dt = cfl_safety · dx² / (4 · max(D_u, D_v))** (P23 cause #4
  mitigation). Explicit-Euler 2D stability ceiling; ``cfl_safety = 0.4``
  keeps temporal error one order below the explicit-Euler stability
  ceiling so the spatial-order fit is not contaminated by Δt-vs-CFL
  coupling.

The Stack-D sim module ``reaction_diffusion_2d_stack_d.sim`` does NOT
exist at the failing-tests commit — collection fails with
``ModuleNotFoundError`` cleanly until Stage 1b implements the module.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from capture import load_capture

# The MMS solution lives outside the package; import via sys.path.insert
# during the failing-tests commit too so collection touches the missing
# Stack-D module before any MMS-specific failure mode.
_MMS_DIR = Path(__file__).resolve().parents[3] / "tools/testkit/code_verification/mms/solutions"
sys.path.insert(0, str(_MMS_DIR))

from reaction_diffusion_2d.solution import (  # type: ignore[import-not-found]  # noqa: E402
    GrayScott2DSolution,
)

from reaction_diffusion_2d_stack_d.sim import (  # type: ignore[import-not-found]  # noqa: E402
    sim_runner_seeded,
    sim_runner_with_source_term,
)

# Convergence-ladder constants (mirror RD-3D test_mms_convergence.py).
_LADDER: tuple[int, ...] = (16, 32, 64, 128)
_T_FINAL: float = 0.05
_CFL_SAFETY: float = 0.4
_ORDER_TOLERANCE: float = 0.5
_FORMAL_ORDER: float = 2.0


def _l2_norm_2d_periodic(err: np.ndarray, dx: float) -> float:
    """Discrete L2 norm on a cell-centered periodic 2D mesh: sqrt(sum(err²) · dx²)."""
    return float(np.sqrt(np.sum(err * err) * dx * dx))


def _fit_observed_order(dxs: np.ndarray, errs: np.ndarray) -> float:
    """Least-squares fit of log(err) = p · log(dx) + c; return slope p."""
    log_dx = np.log(dxs)
    log_err = np.log(errs)
    slope, _intercept = np.polyfit(log_dx, log_err, 1)
    return float(slope)


def test_canonical_descriptor_matches_filename(
    stack_d_manifest_path: Path,
) -> None:
    assert stack_d_manifest_path.name == "gray-scott-lambda-128sq-seed42-step2000.json"


def test_canonical_capture_exists(stack_d_manifest_path: Path) -> None:
    assert stack_d_manifest_path.exists(), (
        f"Stack-D canonical capture missing at {stack_d_manifest_path}"
    )


def test_mms_observed_order_at_canonical_params(tmp_path: Path) -> None:
    """4-grid MMS convergence study; observed L2 order ≥ 1.5 (within ±0.5 of formal 2.0).

    Per-grid (N, dx, dt, n_steps, ||e_U||_2, ||e_V||_2) ladder is recorded
    inline in the assertion message so the Stage 1b commit footer can
    quote it verbatim (charter § 4.2.2 Step 12 footer requirement).
    """
    sol = GrayScott2DSolution()
    rows: list[tuple[int, float, float, int, float, float]] = []
    for n in _LADDER:
        out_dir = tmp_path / f"n-{n}"
        out_dir.mkdir()
        manifest = sim_runner_with_source_term(
            seed=0,
            out_dir=out_dir,
            mms=sol,
            n=n,
            t_final=_T_FINAL,
            cfl_safety=_CFL_SAFETY,
        )
        assert manifest.exists()
        cap = load_capture(manifest)
        final = list(cap.steps())[-1]
        # Re-derive the (X, Y, dx, dt, n_steps) used by the runner so the
        # exact-solution evaluation matches the discrete grid exactly.
        L_domain = 2.0 * float(sol.L)
        dx = L_domain / n
        cell_centers = (np.arange(n, dtype=np.float64) + 0.5) * dx
        X, Y = np.meshgrid(cell_centers, cell_centers, indexing="ij")
        dt_ceiling = dx * dx / (4.0 * max(float(sol.D_u), float(sol.D_v)))
        dt_target = _CFL_SAFETY * dt_ceiling
        n_steps = max(1, int(np.ceil(_T_FINAL / dt_target)))
        dt = _T_FINAL / n_steps
        u_exact, v_exact = sol.evaluate(X, Y, _T_FINAL)
        err_u = np.asarray(final.state["U"]) - u_exact
        err_v = np.asarray(final.state["V"]) - v_exact
        l2_u = _l2_norm_2d_periodic(err_u, dx)
        l2_v = _l2_norm_2d_periodic(err_v, dx)
        rows.append((n, dx, dt, n_steps, l2_u, l2_v))

    dxs = np.array([row[1] for row in rows], dtype=np.float64)
    l2_u_arr = np.array([row[4] for row in rows], dtype=np.float64)
    l2_v_arr = np.array([row[5] for row in rows], dtype=np.float64)
    l2_comb = np.sqrt(l2_u_arr * l2_u_arr + l2_v_arr * l2_v_arr)
    observed_u = _fit_observed_order(dxs, l2_u_arr)
    observed_v = _fit_observed_order(dxs, l2_v_arr)
    observed_combined = _fit_observed_order(dxs, l2_comb)

    ladder_lines = [
        (
            f"  N={N:3d}  dx={dx:.6e}  dt={dt:.6e}  n_steps={ns:5d}  "
            f"||e_U||_2={lu:.6e}  ||e_V||_2={lv:.6e}"
        )
        for (N, dx, dt, ns, lu, lv) in rows
    ]
    diag = (
        f"\nMMS convergence-rate ladder (RD-2D Stack-D, t_final={_T_FINAL}):\n"
        + "\n".join(ladder_lines)
        + (
            f"\nobserved OOA: U={observed_u:.4f}  V={observed_v:.4f}  "
            f"combined={observed_combined:.4f}  (formal={_FORMAL_ORDER:.1f}, "
            f"tolerance ±{_ORDER_TOLERANCE:.2f})"
        )
    )
    assert abs(observed_combined - _FORMAL_ORDER) <= _ORDER_TOLERANCE, diag


def test_canonical_capture_matches_stack_d_reconstruction_within_rtol_1em4(
    tmp_path: Path,
    stack_d_manifest_path: Path,
) -> None:
    """Same-stack code-verification anchor: a fresh Stack-D run at the
    canonical seed reconstructs the canonical capture bit-identically
    (content-equivalent IC-13 contract — Stack-D vs Stack-D).
    """
    fresh_manifest = sim_runner_seeded(seed=42, out_dir=tmp_path)
    fresh = load_capture(fresh_manifest)
    canonical = load_capture(stack_d_manifest_path)
    fresh_steps = list(fresh.steps())
    canonical_steps = list(canonical.steps())
    assert len(fresh_steps) == len(canonical_steps), (
        f"frame count mismatch: fresh={len(fresh_steps)} vs canonical={len(canonical_steps)}"
    )
    for f, c in zip(fresh_steps, canonical_steps, strict=True):
        assert f.step == c.step
        for fld in ("U", "V"):
            assert np.array_equal(f.state[fld], c.state[fld]), (
                f"Stack-D bit-identity mismatch at step {f.step}, field {fld!r}: "
                f"max_abs_diff={float(np.max(np.abs(f.state[fld] - c.state[fld])))}"
            )
