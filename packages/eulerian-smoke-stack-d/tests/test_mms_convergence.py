"""Gate-4 code-verification: MMS observed-order-of-accuracy (Stack-D, MMS-ONLY).

Mirrors the Phase-1 ``test_mms_convergence`` but drives the Taichi-DSL Stack-D
2D ``stable_fluids_step`` (MacCormack-corrected semi-Lagrangian advect + Jacobi
pressure-projection) over the SHARED, byte-identical NS-2D Taylor-Green forced
manufactured solution at
``tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/``
(shift #18: lattice-boltzmann-d3q19 + eulerian-smoke share this MMS solution).

Smoke's gate-4 carries the **MMS arm ONLY** (no golden table -- spec-ref § 7;
the OPPOSITE of LBM's dual-arm and MPM's golden-only; matches RD-3D). TWO arms:

- :func:`test_mms_observed_ooa_advection_matches_formal` -- the MacCormack-SL
  advect step (analytic pressure-gradient subtracted from the manufactured
  source so projection is bypassed) converges at the formal order ``p = 2``.
- :func:`test_mms_observed_ooa_projection_matches_formal` -- the Jacobi-driven
  pressure-projection's discrete Helmholtz decomposition converges at ``p = 2``.

Observed OOA on the discrete L2 error is within ±0.5 of formal p=2 (spec § 2.4;
Phase-1 NumPy reference observed advection 1.99 / projection 2.00). The inline
convergence study (LBM Stack-D ``test_mms_convergence.py`` + Phase-1 smoke Path-Y
precedent) does NOT generalize the heat-1D MMS runner (banked, testkit scope).

NOTE (Stage-1 precision, Stage-0 banked precedent #7 -- applies NON-vacuously):
the pipeline carries no in-kernel reductions, but the f64-seed trap still bites
the 3D Jacobi pure-literal normaliser ``1.0/6.0`` (infers f32 absent
``default_fp``; ~1e-9 cross-stack leak), seeded ``ti.f64(1.0)/ti.f64(6.0)``. The
2D MMS arms here multiply by ``0.25`` (exact in f32), so this MMS test is
insensitive to that trap; the 3D capture (gate 14) is where it surfaced.

The Stack-D reference submodule ``eulerian_smoke_stack_d.reference`` does NOT
exist at the failing-tests commit -- collection fails with ModuleNotFoundError
cleanly until the implementation lands.
"""

from __future__ import annotations

import numpy as np
from code_verification.mms.solutions.incompressible_ns_2d.solution import (
    IncompressibleNS2DSolution,
)
from numpy.typing import NDArray

from eulerian_smoke_stack_d.reference import (  # type: ignore[import-not-found]
    project_pressure,
    stable_fluids_step,
)

Array2D = NDArray[np.float64]

_LADDER: tuple[int, ...] = (32, 64, 128)
_T_FINAL_ADVECTION: float = 0.02
_ORDER_TOLERANCE: float = 0.5  # spec § 2.4 + sim spec-ref § 6.1.
_FORMAL_ORDER: float = 2.0  # MacCormack-corrected SL + 2nd-order projection gradient.


def _build_unit_square_grid(N: int) -> tuple[Array2D, Array2D, float]:
    """Cell-centered ``N x N`` mesh on the periodic unit square ``[0, 1]²``."""
    dx = 1.0 / N
    cell_centers = (np.arange(N, dtype=np.float64) + 0.5) * dx
    X, Y = np.meshgrid(cell_centers, cell_centers, indexing="ij")
    return X, Y, dx


def _l2_norm_2d_periodic(err: Array2D, dx: float) -> float:
    """Discrete L^2 norm on a cell-centered periodic 2D mesh."""
    return float(np.sqrt(np.sum(err * err) * dx * dx))


def _fit_observed_order(dxs: NDArray[np.float64], errs: NDArray[np.float64]) -> float:
    """Least-squares fit of ``log(err) = p · log(dx) + c``; return slope ``p``."""
    log_dx = np.log(dxs)
    log_err = np.log(errs)
    slope, _intercept = np.polyfit(log_dx, log_err, 1)
    return float(slope)


def _analytic_pressure_gradient(X: Array2D, Y: Array2D, t: float) -> tuple[Array2D, Array2D]:
    """Closed-form ``∇p`` for the manufactured solution (derivation.md)."""
    cos2_t = float(np.cos(t)) ** 2
    p_x = np.pi * np.sin(4.0 * np.pi * X) * cos2_t
    p_y = np.pi * np.sin(4.0 * np.pi * Y) * cos2_t
    return p_x, p_y


def _run_advection_mms_at_resolution(
    soln: IncompressibleNS2DSolution, N: int
) -> tuple[float, float, int, float, float, float]:
    """Run the projection-disabled MacCormack pipeline at one resolution.

    Time integration uses ``dt = dx²`` so cumulative time error matches spatial
    ``O(dx²)``; the MMS source has the analytic ``∇p`` subtracted because the
    projection is bypassed (``n_jacobi = 0``)."""
    X, Y, dx = _build_unit_square_grid(N)
    dt_target = dx * dx
    n_steps = max(1, int(np.ceil(_T_FINAL_ADVECTION / dt_target)))
    dt = _T_FINAL_ADVECTION / n_steps
    params = {
        "nu": soln.nu,
        "rho": soln.rho,
        "dx": dx,
        "dt": dt,
        "n_jacobi": 0,  # projection bypass.
    }
    u, v, p = soln.evaluate(X, Y, 0.0)
    for n in range(n_steps):
        t_n = n * dt
        s_u, s_v = soln.source_term(X, Y, t_n)
        p_x, p_y = _analytic_pressure_gradient(X, Y, t_n)
        u, v, p = stable_fluids_step(u, v, p, params, source=(s_u - p_x, s_v - p_y))
    u_exact, v_exact, _ = soln.evaluate(X, Y, _T_FINAL_ADVECTION)
    l2_u = _l2_norm_2d_periodic(u - u_exact, dx)
    l2_v = _l2_norm_2d_periodic(v - v_exact, dx)
    l2_combined = float(np.sqrt(l2_u * l2_u + l2_v * l2_v))
    return dx, dt, n_steps, l2_u, l2_v, l2_combined


def _run_projection_mms_at_resolution(N: int) -> tuple[float, int, float]:
    """Discrete Helmholtz decomposition at one resolution.

    Constructs ``u* = u_solenoidal + ∇φ`` from analytic factors and applies
    :func:`project_pressure` with ``n_iter = 100 · N`` so Jacobi convergence
    keeps pace with the ``O(dx²)`` discretization residual at each grid level."""
    X, Y, dx = _build_unit_square_grid(N)
    two_pi = 2.0 * np.pi
    sin_x = np.sin(two_pi * X)
    cos_x = np.cos(two_pi * X)
    sin_y = np.sin(two_pi * Y)
    cos_y = np.cos(two_pi * Y)
    u_div_x = two_pi * cos_x * sin_y
    u_div_y = two_pi * sin_x * cos_y
    u_sol_x = -two_pi * sin_x * sin_y
    u_sol_y = -two_pi * cos_x * cos_y
    u_star = u_div_x + u_sol_x
    v_star = u_div_y + u_sol_y
    n_iter = 100 * N
    params = {"dx": dx, "dt": 1.0, "rho": 1.0}
    u_proj, v_proj, _p = project_pressure(u_star, v_star, params, n_iter=n_iter)
    err_u = u_proj - u_sol_x
    err_v = v_proj - u_sol_y
    l2 = _l2_norm_2d_periodic(np.sqrt(err_u * err_u + err_v * err_v), dx)
    return dx, n_iter, l2


def test_mms_observed_ooa_advection_matches_formal() -> None:
    """3-grid convergence study of the MacCormack-SL pipeline; OOA ≈ 2 ± 0.5."""
    soln = IncompressibleNS2DSolution(nu=0.01, L=1.0, rho=1.0)
    rows: list[tuple[int, float, float, int, float, float, float]] = []
    for N in _LADDER:
        dx, dt, n_steps, l2_u, l2_v, l2_combined = _run_advection_mms_at_resolution(soln, N)
        rows.append((N, dx, dt, n_steps, l2_u, l2_v, l2_combined))

    dxs = np.array([row[1] for row in rows], dtype=np.float64)
    l2_comb = np.array([row[6] for row in rows], dtype=np.float64)
    observed_ooa = _fit_observed_order(dxs, l2_comb)

    ladder_lines = [
        f"  N={N:3d}  dx={dx:.6e}  dt={dt:.6e}  n_steps={n_steps:5d}  "
        f"||e_U||_2={l2_u:.6e}  ||e_V||_2={l2_v:.6e}  ||e||_2={l2c:.6e}"
        for N, dx, dt, n_steps, l2_u, l2_v, l2c in rows
    ]
    diag = (
        f"\nMMS advection convergence-rate ladder "
        f"(eulerian-smoke-stack-d, t_final={_T_FINAL_ADVECTION}):\n"
        + "\n".join(ladder_lines)
        + f"\nobserved OOA = {observed_ooa:.4f}  "
        f"(formal = {_FORMAL_ORDER:.1f}, tolerance ±{_ORDER_TOLERANCE:.2f})"
    )
    assert abs(observed_ooa - _FORMAL_ORDER) <= _ORDER_TOLERANCE, diag


def test_mms_observed_ooa_projection_matches_formal() -> None:
    """3-grid convergence study of the Jacobi projection; OOA ≈ 2 ± 0.5."""
    rows: list[tuple[int, float, int, float]] = []
    for N in _LADDER:
        dx, n_iter, l2 = _run_projection_mms_at_resolution(N)
        rows.append((N, dx, n_iter, l2))

    dxs = np.array([row[1] for row in rows], dtype=np.float64)
    l2s = np.array([row[3] for row in rows], dtype=np.float64)
    observed_ooa = _fit_observed_order(dxs, l2s)

    ladder_lines = [
        f"  N={N:3d}  dx={dx:.6e}  n_iter={n_iter:6d}  ||u_proj - u_sol||_2 = {l2:.6e}"
        for N, dx, n_iter, l2 in rows
    ]
    diag = (
        "\nMMS projection convergence-rate ladder (eulerian-smoke-stack-d):\n"
        + "\n".join(ladder_lines)
        + f"\nobserved OOA = {observed_ooa:.4f}  "
        f"(formal = {_FORMAL_ORDER:.1f}, tolerance ±{_ORDER_TOLERANCE:.2f})"
    )
    assert abs(observed_ooa - _FORMAL_ORDER) <= _ORDER_TOLERANCE, diag
