"""MMS-based code-verification test for LBM via macroscopic NS moments (gate 5 (b)).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body;
the lattice-boltzmann-d3q19 sub-phase Stage 1 fills in the body (S1
pattern; conventions doc § M.2 inheritance).

Inline convergence study per Path-Y operator routing (RD-3D Stage 1
S2 precedent + eulerian-smoke Stage 1 step 4 precedent + this LBM
Stage 1: three concrete inline examples now anchor the
MMS-runner-generalization question banked for the next sub-phase per
sub-phase plan § 11.2). ``tools/testkit/code_verification/mms/runner.py``
is heat-1D-specialized and is NOT consumed here.

The MMS surface is the SHARED ``IncompressibleNS2DSolution`` (Taylor-
Green-style forced incompressible NS) at
``tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/``
— byte-identical between eulerian-smoke and this sub-phase
(verified at Stage 0 Task 0.3: solution.py sha256 30e490a7…320d8e +
derivation.md sha256 30dfc294…ac86e76 unmodified since eulerian-smoke
consumption). The discretizations differ: eulerian-smoke used
MacCormack-corrected semi-Lagrangian + Jacobi pressure-projection,
achieving observed OOA 1.99 (advection) / 2.00 (projection) on this
surface (eulerian-smoke landing § 3.2). This sub-phase exercises
**D3Q19 streaming + BGK collision + Guo 2002 body-force injection**
on the same MMS surface — the first cross-discretization OOA
comparison on a shared NS-2D MMS in the project.

Lattice ↔ physical unit conversion (algebraic.md § 3 / sim.py module
docstring clause 3):

  - Domain L_phys = 1.0; ν_phys = 0.01; ρ_phys = 1.0.
  - Velocity amplitude scaled by A = 0.05 to keep Ma ≪ 0.1 across
    the ladder (Ma_max ≈ 0.014 at N=32; ≈ 0.003 at N=128).
  - τ adjusted per N to keep dt = t_final/n_steps EXACTLY (eliminates
    P23 cause-#4 — time-step CFL coupling / t_end mismatch).
  - Source-term mid-step evaluation (midpoint rule) for time integration.

Convergence ladder N ∈ {32, 64, 128}, t_final = 0.05. Observed OOA on
the L^2 norm of the macroscopic velocity error (u, v components
combined) is within ±0.5 of the formal p = 2 per spec § 2.4. The
ladder is non-monotonic at coarse N due to LBM init-transient + Guo
2002 forcing sub-leading O(dt²) terms (P25 R-LBM-1 / R-LBM-2 risk
surfaces banked at this sub-phase) but the log-log slope across the
full ladder passes the spec gate.
"""

from __future__ import annotations

import math

import numpy as np

from lattice_boltzmann_d3q19.reference import (  # type: ignore[import-not-found]
    CS2,
    bgk_step,  # noqa: F401  # contract-import; the test calls it via the field-eval path.
    feq_field,
    macroscopic_velocity,
)
from lattice_boltzmann_d3q19.reference.bgk import bgk_step as bgk_step_field
from code_verification.mms.solutions.incompressible_ns_2d.solution import (
    IncompressibleNS2DSolution,
)


_LADDER_N: tuple[int, ...] = (32, 64, 128)
_TAU_TARGET: float = 0.65
_NU_PHYS: float = 0.01
_T_FINAL: float = 0.05
_A_AMP: float = 0.05  # velocity amplitude scale (keeps Ma < 0.1 across ladder).
_NZ: int = 3  # depth-3 z-periodic slab (Stage 0 Task 0.4 convention).
_FORMAL_P: float = 2.0
_OOA_TOLERANCE: float = 0.5  # spec § 2.4 ±0.5 window.


def _run_forced_tg_lbm(N: int) -> dict[str, float]:
    """Run LBM forced-TG MMS at grid N × N × _NZ; return error metrics."""
    sol = IncompressibleNS2DSolution(nu=_NU_PHYS, L=1.0, rho=1.0)
    nu_lat_target = CS2 * (_TAU_TARGET - 0.5)
    dx_phys = 1.0 / N
    dt_natural = nu_lat_target * dx_phys * dx_phys / _NU_PHYS
    n_steps = max(1, int(round(_T_FINAL / dt_natural)))
    dt_phys = _T_FINAL / n_steps  # EXACT landing at t_final.
    tau = 0.5 + _NU_PHYS * dt_phys / (CS2 * dx_phys * dx_phys)
    # Cell-centered grid on [0, 1]^2.
    idx = (np.arange(N, dtype=np.float64) + 0.5) / N
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    u_phys_0, v_phys_0, _p0 = sol.evaluate(X, Y, 0.0)
    u_phys_0 = _A_AMP * u_phys_0
    v_phys_0 = _A_AMP * v_phys_0
    scale_v = dt_phys / dx_phys  # physical → lattice velocity.
    u_lat = np.zeros((3, N, N, _NZ), dtype=np.float64)
    u_lat[0, :, :, :] = (u_phys_0 * scale_v)[:, :, None]
    u_lat[1, :, :, :] = (v_phys_0 * scale_v)[:, :, None]
    rho = np.ones((N, N, _NZ), dtype=np.float64)
    ma_max = float(np.max(np.sqrt((u_lat * u_lat).sum(axis=0)))) / math.sqrt(CS2)
    if ma_max >= 0.1:
        raise RuntimeError(f"P25 R-LBM-3: Ma_max={ma_max:.4f} exceeds 0.1 at N={N}")
    f = feq_field(rho, u_lat)
    # Force conversion: F_phys (per unit volume; ρ_phys=1) → F_lat = F_phys * dt² / dx.
    scale_f = dt_phys * dt_phys / dx_phys
    for step in range(n_steps):
        t_mid = (step + 0.5) * dt_phys  # midpoint rule for source-time-integration.
        S_u, S_v = sol.source_term(X, Y, t_mid)
        F_lat = np.zeros((3, N, N, _NZ), dtype=np.float64)
        F_lat[0, :, :, :] = (_A_AMP * S_u * scale_f)[:, :, None]
        F_lat[1, :, :, :] = (_A_AMP * S_v * scale_f)[:, :, None]
        f = bgk_step_field(f, tau, force_lattice=F_lat)
    # Recover velocity at t_final; Guo half-step uses the force at t_final.
    S_u_end, S_v_end = sol.source_term(X, Y, _T_FINAL)
    F_end = np.zeros((3, N, N, _NZ), dtype=np.float64)
    F_end[0, :, :, :] = (_A_AMP * S_u_end * scale_f)[:, :, None]
    F_end[1, :, :, :] = (_A_AMP * S_v_end * scale_f)[:, :, None]
    u_lat_end = macroscopic_velocity(f, force_lattice=F_end)
    u_phys_end = (u_lat_end[0] / scale_v)[:, :, 0]
    v_phys_end = (u_lat_end[1] / scale_v)[:, :, 0]
    u_ana, v_ana, _p_ana = sol.evaluate(X, Y, _T_FINAL)
    u_ana = _A_AMP * u_ana
    v_ana = _A_AMP * v_ana
    err_u = float(np.sqrt(np.mean((u_phys_end - u_ana) ** 2)))
    err_v = float(np.sqrt(np.mean((v_phys_end - v_ana) ** 2)))
    err = math.sqrt(err_u * err_u + err_v * err_v)
    return {
        "N": float(N),
        "n_steps": float(n_steps),
        "tau": tau,
        "ma_max": ma_max,
        "dx_phys": dx_phys,
        "err_u": err_u,
        "err_v": err_v,
        "err": err,
    }


def test_mms_observed_ooa_macroscopic_moments_match_formal() -> None:
    """Observed OOA on macroscopic velocity recovery matches p=2 within ±0.5.

    Per spec § 2.4 + sim spec-ref § 6.1. The ladder N ∈ (32, 64, 128)
    + dx ∝ 1/N + dt ∝ dx² (diffusive scaling, BGK time-1st-order
    matches space-2nd-order under this scaling).

    Cross-discretization comparison: eulerian-smoke achieved OOA
    1.99 (advection) / 2.00 (projection) on the same NS-2D MMS surface
    via MacCormack SL + Jacobi pressure-projection. This LBM
    discretization exercises D3Q19 streaming + BGK collision + Guo
    body-force injection — a kinetically-distinct path to the same
    macroscopic NS regime via Chapman-Enskog. OOA within ±0.5 of
    p=2 validates the cross-discretization claim.
    """
    results = [_run_forced_tg_lbm(N) for N in _LADDER_N]
    dx = np.array([r["dx_phys"] for r in results])
    err = np.array([r["err"] for r in results])
    log_dx = np.log(dx)
    log_err = np.log(err)
    slope = float(np.polyfit(log_dx, log_err, 1)[0])
    # Report ladder structure for the audit trail.
    ladder_str = "; ".join(
        f"N={int(r['N'])} n_steps={int(r['n_steps'])} tau={r['tau']:.5f} "
        f"Ma={r['ma_max']:.4f} err={r['err']:.3e}"
        for r in results
    )
    assert abs(slope - _FORMAL_P) <= _OOA_TOLERANCE, (
        f"Observed OOA = {slope:.4f}; formal p={_FORMAL_P}; tolerance ±{_OOA_TOLERANCE}. "
        f"Ladder: {ladder_str}. "
        f"Consult P23 (MMS-OOA debugging) + P25 (LBM lattice-units + kinetic-equation MMS)."
    )
