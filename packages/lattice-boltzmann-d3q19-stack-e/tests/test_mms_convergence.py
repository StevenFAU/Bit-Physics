"""Gate-4b code-verification: MMS observed-order-of-accuracy (Stack-E).

The SECOND arm of the LBM dual-arm gate-4 (D17; 4a equilibrium golden + 4b NS-2D
MMS). Mirrors the Phase-1 / Stack-D ``test_mms_convergence`` but drives the NVIDIA
Warp Stack-E ``bgk_step`` (with Guo 2002 forcing) over the SHARED, byte-identical
``IncompressibleNS2DSolution`` Taylor-Green forced-NS manufactured solution at
``tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`` (shift
#18: lattice-boltzmann-d3q19 + eulerian-smoke share this MMS solution; Stage-0
Task 0.6 confirmed it consumable).

Observed OOA on the L2 norm of the macroscopic velocity error is within +/-0.5 of
the formal p = 2 (spec 2.4). The Stack-E discretization exercises D3Q19 streaming
+ BGK collision + Guo body-force injection -- the dual-arm gate-4 companion to the
gate-4a equilibrium golden. Phase-1 NumPy reference + Stack-D Taichi reproduced
OOA ~2.39.

The Stack-E reference submodule ``lattice_boltzmann_d3q19_stack_e.reference`` does
NOT exist at the failing-tests commit (Stage 1a) -- collection fails with
ModuleNotFoundError cleanly until Stage 1b implements it.

NOTE (Stage 1b precision requirement; § L.6 O-W7 + Stage-0 Task 0.2/0.3): the Warp
per-cell 19-term moment reduction MUST use explicit ``wp.float64(0.0)`` accumulator
seeds + ``wp.float64(1.0)`` feq literal + precomputed f64 c_s^2-constants (Warp
infers f32 for bare literals; the f32 downcast would destroy the 1e-5 gate-14
budget -- D8/R-LBME2). Stage-0 R-A1 exercised the seeded reduction (6/6 bit-
identical; max_abs_err=0.0 vs NumPy on the collision surface).
"""

from __future__ import annotations

import math

import numpy as np
from code_verification.mms.solutions.incompressible_ns_2d.solution import (
    IncompressibleNS2DSolution,
)

from lattice_boltzmann_d3q19_stack_e.reference import (  # type: ignore[import-not-found]
    CS2,
    bgk_step,
    feq_field,
    macroscopic_velocity,
)

_LADDER_N: tuple[int, ...] = (32, 64, 128)
_TAU_TARGET: float = 0.65
_NU_PHYS: float = 0.01
_T_FINAL: float = 0.05
_A_AMP: float = 0.05  # velocity amplitude scale (keeps Ma < 0.1 across ladder).
_NZ: int = 3  # depth-3 z-periodic slab (Stage 0 Task 0.4 convention).
_FORMAL_P: float = 2.0
_OOA_TOLERANCE: float = 0.5  # spec 2.4 +/-0.5 window.


def _run_forced_tg_lbm(n_grid: int) -> dict[str, float]:
    """Run Stack-E LBM forced-TG MMS at grid n_grid x n_grid x _NZ; return error metrics."""
    sol = IncompressibleNS2DSolution(nu=_NU_PHYS, L=1.0, rho=1.0)
    nu_lat_target = CS2 * (_TAU_TARGET - 0.5)
    dx_phys = 1.0 / n_grid
    dt_natural = nu_lat_target * dx_phys * dx_phys / _NU_PHYS
    n_steps = max(1, round(_T_FINAL / dt_natural))
    dt_phys = _T_FINAL / n_steps  # EXACT landing at t_final.
    tau = 0.5 + _NU_PHYS * dt_phys / (CS2 * dx_phys * dx_phys)
    idx = (np.arange(n_grid, dtype=np.float64) + 0.5) / n_grid
    grid_x, grid_y = np.meshgrid(idx, idx, indexing="ij")
    u_phys_0, v_phys_0, _p0 = sol.evaluate(grid_x, grid_y, 0.0)
    u_phys_0 = _A_AMP * u_phys_0
    v_phys_0 = _A_AMP * v_phys_0
    scale_v = dt_phys / dx_phys  # physical -> lattice velocity.
    u_lat = np.zeros((3, n_grid, n_grid, _NZ), dtype=np.float64)
    u_lat[0, :, :, :] = (u_phys_0 * scale_v)[:, :, None]
    u_lat[1, :, :, :] = (v_phys_0 * scale_v)[:, :, None]
    rho = np.ones((n_grid, n_grid, _NZ), dtype=np.float64)
    ma_max = float(np.max(np.sqrt((u_lat * u_lat).sum(axis=0)))) / math.sqrt(CS2)
    if ma_max >= 0.1:
        raise RuntimeError(f"R-LBM-3: Ma_max={ma_max:.4f} exceeds 0.1 at N={n_grid}")
    f = feq_field(rho, u_lat)
    scale_f = dt_phys * dt_phys / dx_phys  # F_phys -> F_lat (rho_phys=1).
    for step in range(n_steps):
        t_mid = (step + 0.5) * dt_phys  # midpoint rule for source-time-integration.
        s_u, s_v = sol.source_term(grid_x, grid_y, t_mid)
        f_lat = np.zeros((3, n_grid, n_grid, _NZ), dtype=np.float64)
        f_lat[0, :, :, :] = (_A_AMP * s_u * scale_f)[:, :, None]
        f_lat[1, :, :, :] = (_A_AMP * s_v * scale_f)[:, :, None]
        f = bgk_step(f, tau, force_lattice=f_lat)
    s_u_end, s_v_end = sol.source_term(grid_x, grid_y, _T_FINAL)
    f_end = np.zeros((3, n_grid, n_grid, _NZ), dtype=np.float64)
    f_end[0, :, :, :] = (_A_AMP * s_u_end * scale_f)[:, :, None]
    f_end[1, :, :, :] = (_A_AMP * s_v_end * scale_f)[:, :, None]
    u_lat_end = macroscopic_velocity(f, force_lattice=f_end)
    u_phys_end = (u_lat_end[0] / scale_v)[:, :, 0]
    v_phys_end = (u_lat_end[1] / scale_v)[:, :, 0]
    u_ana, v_ana, _p_ana = sol.evaluate(grid_x, grid_y, _T_FINAL)
    u_ana = _A_AMP * u_ana
    v_ana = _A_AMP * v_ana
    err_u = float(np.sqrt(np.mean((u_phys_end - u_ana) ** 2)))
    err_v = float(np.sqrt(np.mean((v_phys_end - v_ana) ** 2)))
    err = math.sqrt(err_u * err_u + err_v * err_v)
    return {
        "N": float(n_grid),
        "n_steps": float(n_steps),
        "tau": tau,
        "ma_max": ma_max,
        "dx_phys": dx_phys,
        "err_u": err_u,
        "err_v": err_v,
        "err": err,
    }


def test_mms_observed_ooa_macroscopic_moments_match_formal() -> None:
    """Observed OOA on macroscopic velocity recovery matches p=2 within +/-0.5.

    Per spec 2.4 + sim spec-ref 6.1. Ladder N in (32, 64, 128); dx ~ 1/N;
    dt ~ dx^2 (diffusive scaling, BGK time-1st-order matches space-2nd-order).
    """
    results = [_run_forced_tg_lbm(n) for n in _LADDER_N]
    dx = np.array([r["dx_phys"] for r in results])
    err = np.array([r["err"] for r in results])
    slope = float(np.polyfit(np.log(dx), np.log(err), 1)[0])
    ladder_str = "; ".join(
        f"N={int(r['N'])} n_steps={int(r['n_steps'])} tau={r['tau']:.5f} "
        f"Ma={r['ma_max']:.4f} err={r['err']:.3e}"
        for r in results
    )
    assert abs(slope - _FORMAL_P) <= _OOA_TOLERANCE, (
        f"Observed OOA = {slope:.4f}; formal p={_FORMAL_P}; tolerance +/-{_OOA_TOLERANCE}. "
        f"Ladder: {ladder_str}."
    )
