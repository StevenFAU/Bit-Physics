"""MMS-based code-verification test for RD-3D (gate 5; first-of-kind).

Runs a 3-grid convergence study against the manufactured solution at
``tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/``
and asserts observed order of accuracy matches the formal order
(``p_formal = 2``) within ±0.5 per spec § 2.2 + RD-3D spec-ref § 6.1.

Phase 1 shipped this as a ``raise NotImplementedError`` stub body; the
continuous-CA-rd3d sub-phase Stage 1 fills in the body (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1 + agent-based
sub-phase Stage 1 audit S1; the imported
``gray_scott_step_with_source`` contract is preserved).

If observed OOA fails to converge within tolerance, consult playbook
P23 in ``docs/phases/sub-phase-continuous-ca-rd3d.md`` § 9.1 before
mutating the test thresholds. The five priority causes are: (1) BC
contamination of the source term at periodic edges, (2) SymPy↔NumPy
translation drift, (3) insufficient grid refinement / pre-asymptotic
regime, (4) Δt-vs-CFL coupling, (5) error-norm choice.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from numpy.typing import NDArray

from reaction_diffusion_3d.reference import (  # type: ignore[import-not-found]
    gray_scott_step_with_source,
)

from code_verification.mms.solutions.reaction_diffusion_3d.solution import (
    GrayScott3DSolution,
)

Array3D = NDArray[np.float64]

# Convergence-ladder constants (charter § 4.2 step 3 default lean — N ∈
# {16, 32, 64} on the unit cube; recorded in the Stage 1 commit footer +
# checkpoint so the ladder choice is auditable).
_LADDER: tuple[int, ...] = (16, 32, 64)
_T_FINAL: float = 0.05  # small horizon so sin(t)/cos(t) shift visibly
# (~5%) but solution stays far from the [0, 1] singular boundaries.
_CFL_SAFETY: float = 0.4  # 7-point-Laplacian stability needs
# dt ≤ dx² / (2 · d · max(D_u, D_v)) with d = 3 → dx² / (6 · 0.16); the
# 0.4 safety factor keeps temporal error one order below the explicit-
# Euler stability ceiling.
_ORDER_TOLERANCE: float = 0.5  # spec § 2.2 / charter § 2 gate 5.
_FORMAL_ORDER: float = 2.0  # 7-point centered Laplacian.


def _build_cell_centered_grid(
    N: int, L_domain: float
) -> tuple[Array3D, Array3D, Array3D, float]:
    """Build a cell-centered N³ mesh on a periodic cube of side ``L_domain``.

    Returns (X, Y, Z, dx) where each coordinate array has shape (N, N, N)
    and dx = L_domain / N. The MMS pipeline uses ``L_domain = 2 * soln.L``
    because the manufactured solution's wavenumber κ = π / soln.L yields a
    true period of 2·soln.L in each axis (a single sin κx / cos κx factor
    flips sign over [0, soln.L]; only the wider 2·soln.L cube actually
    closes the period). Building the discrete grid on [0, 2·soln.L]³ keeps
    the np.roll-based stencil consistent with the manufactured solution's
    BCs — the load-bearing fix for P23 cause #1 (BC contamination of the
    source term).
    """
    dx = L_domain / N
    cell_centers = (np.arange(N, dtype=np.float64) + 0.5) * dx
    X, Y, Z = np.meshgrid(cell_centers, cell_centers, cell_centers, indexing="ij")
    return X, Y, Z, dx


def _l2_norm_3d_periodic(err: Array3D, dx: float) -> float:
    """Discrete L2 norm on a cell-centered periodic 3D mesh.

    ``||e||_{L^2} = sqrt(sum(e^2) · dx^3)`` — the 3D-volume analogue of
    the analyzer's 1D ``sqrt(sum(e^2) · dx)`` (per
    ``tools/testkit/code_verification/mms/analyze.py``).
    """
    return float(np.sqrt(np.sum(err * err) * dx * dx * dx))


def _fit_observed_order(dxs: NDArray[np.float64], errs: NDArray[np.float64]) -> float:
    """Least-squares fit of log(err) = p · log(dx) + c; return slope p."""
    log_dx = np.log(dxs)
    log_err = np.log(errs)
    slope, _intercept = np.polyfit(log_dx, log_err, 1)
    return float(slope)


def _run_mms_at_resolution(
    soln: GrayScott3DSolution, N: int
) -> tuple[float, float, float, float, int, float]:
    """Run the MMS pipeline at one resolution; return convergence-row metrics.

    Returns ``(dx, dt, n_steps, l2_err_u, l2_err_v, l2_err_combined)``.

    The combined error is ``sqrt(err_u² + err_v²)`` summed elementwise;
    forward Euler is applied with the MMS source evaluated at the
    left-endpoint time of each step (the canonical convention).
    """
    Du = soln.D_u
    Dv = soln.D_v
    F = soln.F
    k = soln.k
    # The manufactured solution has κ = π / soln.L so its true period in
    # each axis is 2·soln.L (a single sin/cos factor flips sign over
    # [0, soln.L]). Build the discrete grid on [0, 2·soln.L]³ — see
    # ``_build_cell_centered_grid`` for the load-bearing rationale.
    L_domain = 2.0 * soln.L

    X, Y, Z, dx = _build_cell_centered_grid(N, L_domain)
    dt_ceiling = dx * dx / (6.0 * max(Du, Dv))
    dt_target = _CFL_SAFETY * dt_ceiling
    n_steps = max(1, int(np.ceil(_T_FINAL / dt_target)))
    dt = _T_FINAL / n_steps  # fit exactly into _T_FINAL
    params: dict[str, Any] = {
        "n": N,
        "Du": Du,
        "Dv": Dv,
        "F": F,
        "k": k,
        "dx": dx,
        "dt": dt,
    }

    u, v = soln.evaluate(X, Y, Z, 0.0)
    for n in range(n_steps):
        t_n = n * dt
        s_u, s_v = soln.source_term(X, Y, Z, t_n)
        u, v = gray_scott_step_with_source(u, v, params, source=(s_u, s_v))

    u_exact, v_exact = soln.evaluate(X, Y, Z, _T_FINAL)
    err_u = u - u_exact
    err_v = v - v_exact
    l2_u = _l2_norm_3d_periodic(err_u, dx)
    l2_v = _l2_norm_3d_periodic(err_v, dx)
    # Combined L2: sqrt(||e_u||² + ||e_v||²) — preserves the OOA-fit
    # property because each term shrinks at the same rate under refinement.
    l2_combined = float(np.sqrt(l2_u * l2_u + l2_v * l2_v))
    return dx, dt, n_steps, l2_u, l2_v, l2_combined


def test_mms_observed_ooa_matches_formal_within_half_an_order() -> None:
    """3-grid convergence study against GrayScott3DSolution; OOA ≈ 2 ± 0.5.

    Convergence-rate ladder is recorded inline in the assertion message
    so the Stage 1 commit footer can quote it verbatim (charter § 4.2
    step 3 + step 10).
    """
    soln = GrayScott3DSolution()
    rows: list[tuple[int, float, float, int, float, float, float]] = []
    for N in _LADDER:
        dx, dt, n_steps, l2_u, l2_v, l2_combined = _run_mms_at_resolution(soln, N)
        rows.append((N, dx, dt, n_steps, l2_u, l2_v, l2_combined))

    dxs = np.array([row[1] for row in rows], dtype=np.float64)
    l2_u_arr = np.array([row[4] for row in rows], dtype=np.float64)
    l2_v_arr = np.array([row[5] for row in rows], dtype=np.float64)
    l2_comb = np.array([row[6] for row in rows], dtype=np.float64)
    observed_ooa_u = _fit_observed_order(dxs, l2_u_arr)
    observed_ooa_v = _fit_observed_order(dxs, l2_v_arr)
    observed_ooa_combined = _fit_observed_order(dxs, l2_comb)

    # Pairwise refinement-rate ladder for the audit footer.
    ladder_lines: list[str] = []
    for N, dx, dt, n_steps, l2_u, l2_v, _l2c in rows:
        ladder_lines.append(
            f"  N={N:3d}  dx={dx:.6e}  dt={dt:.6e}  n_steps={n_steps:4d}  "
            f"||e_U||_2={l2_u:.6e}  ||e_V||_2={l2_v:.6e}"
        )
    ladder = "\n".join(ladder_lines)

    diag = (
        f"\nMMS convergence-rate ladder (RD-3D, t_final={_T_FINAL}):\n"
        f"{ladder}\n"
        f"observed OOA: U={observed_ooa_u:.4f}  V={observed_ooa_v:.4f}  "
        f"combined={observed_ooa_combined:.4f}  (formal={_FORMAL_ORDER:.1f}, "
        f"tolerance ±{_ORDER_TOLERANCE:.2f})"
    )
    # Combined L2 is the primary gate; per-field values are diagnostic.
    assert abs(observed_ooa_combined - _FORMAL_ORDER) <= _ORDER_TOLERANCE, diag
