"""Masked free-surface Poisson verification (spec-ref § 6.1 + § 6.3).

The periodic smoke MMS does **not** cover this solver (v0.2 projection-
reuse correction) — it gets its own:

1. Manufactured solution on a fixed irregular fluid mask (disk), exact
   Dirichlet data on air nodes -> N-ladder order of accuracy (p ~= 2
   for the compact 5-point interior; boundary is node-aligned so no
   geometric error).
2. Hydrostatic column BC anchor: p = rho g depth per node **exactly**
   (up to solver residual) and post-projection fluid velocities ~ 0 —
   the adjoint compact operator pair's signature property.
3. Solver-depth honesty (GPU Gems 3 ch. 30): the smoke default of 20
   Jacobi sweeps retains ~100% of g*dt on a deep column ("water sinks
   through the tank") — asserted as a *documented failure*, and the
   pinned canonical cap is asserted converged.
"""

from __future__ import annotations

import math

import numpy as np

from pic_flip.reference.poisson_masked import (
    AIR,
    FLUID,
    SOLID,
    default_solid_mask_2d,
    jacobi_masked_2d,
    project_masked_2d,
)
from pic_flip.sim import CANONICAL_N_JACOBI

_G = 9.81
_DT = 2.0e-3


def _disk_mms_error(n: int) -> float:
    """Max fluid-node error for p_exact = sin(pi x) sin(pi y) on a disk mask."""
    dx = 1.0 / n
    xs = np.arange(n) * dx
    xx, yy = np.meshgrid(xs, xs, indexing="ij")
    p_exact = np.sin(np.pi * xx) * np.sin(np.pi * yy)
    rhs = -2.0 * np.pi**2 * p_exact
    rr = (xx - 0.5) ** 2 + (yy - 0.5) ** 2
    labels = np.full((n, n), AIR, dtype=np.uint8)
    labels[rr <= 0.3**2] = FLUID
    # Air ring keeps the edge-fluid contract trivially satisfied.
    p = jacobi_masked_2d(rhs, labels, dx, n_iter=10 * n * n, air_values=p_exact)
    fluid = labels == FLUID
    return float(np.max(np.abs(p[fluid] - p_exact[fluid])))


def test_mms_disk_order_of_accuracy() -> None:
    """Measured order ~= 2 on the N ladder (declared: slope >= 1.7)."""
    ns = [16, 32, 64]
    errs = [_disk_mms_error(n) for n in ns]
    assert errs[0] > errs[1] > errs[2], errs
    slopes = [
        math.log(errs[i] / errs[i + 1]) / math.log(2.0) for i in range(len(errs) - 1)
    ]
    assert min(slopes) >= 1.7, (errs, slopes)


def _hydro_column(
    n_iter: int, nx: int = 24, ny: int = 24, depth: int = 15
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """Settled column after one gravity kick + projection."""
    dx = 1.0 / nx
    labels = np.full((nx, ny), AIR, dtype=np.uint8)
    labels[2 : nx - 2, 2 : 2 + depth] = FLUID
    labels[default_solid_mask_2d(nx, ny, 2)] = SOLID
    grid_vel = np.zeros((nx, ny, 2), dtype=np.float64)
    grid_vel[labels == FLUID, 1] = -_G * _DT
    out, p, _maxdiv = project_masked_2d(grid_vel, labels, dx, _DT, 1.0, n_iter)
    return out, p, labels, dx


def test_hydrostatic_pressure_and_rest_velocity() -> None:
    """Converged solve: p = rho g depth exactly; fluid velocity ~ 0."""
    out, p, labels, dx = _hydro_column(6000)
    fluid = labels == FLUID
    resid = float(np.max(np.abs(out[fluid])))
    assert resid <= 1e-4 * _G * _DT, resid
    # Discrete-exact hydrostatic profile: dP/dy == -rho g between
    # consecutive fluid nodes of the mid column (measured at 6000
    # sweeps: -9.810 to 4 significant figures).
    col = p[12, 2:17]
    grads = np.diff(col) / dx
    assert np.allclose(grads, -_G, atol=1e-3), grads
    # p extrapolates to 0 one node above the surface (ghost Dirichlet).
    assert abs(col[-1] - _G * dx) <= 1e-3


def test_solver_depth_failure_documented() -> None:
    """The smoke default (20 sweeps) fails at O(1): the column keeps
    ~all of g*dt — the documented sinking failure, not a tolerance
    miss. This test pins the failure so it stays visible."""
    out, _p, labels, _dx = _hydro_column(20)
    fluid = labels == FLUID
    resid = float(np.max(np.abs(out[fluid])))
    assert resid >= 0.9 * _G * _DT, resid


def test_pinned_canonical_n_jacobi_is_converged() -> None:
    """The pinned canonical cap keeps hydrostatic residual < 1% of g*dt
    at canonical depth (measured-then-pinned, spec-ref § 6.3)."""
    out, _p, labels, _dx = _hydro_column(CANONICAL_N_JACOBI)
    fluid = labels == FLUID
    resid = float(np.max(np.abs(out[fluid])))
    assert resid <= 0.01 * _G * _DT, resid


def test_moving_solid_velocity_bc() -> None:
    """Solid nodes carry the obstacle velocity through the projection
    (the moving-obstacle BC; spec-ref § 3 step 3)."""
    nx = ny = 16
    dx = 1.0 / nx
    labels = np.full((nx, ny), AIR, dtype=np.uint8)
    labels[2:14, 2:8] = FLUID
    labels[default_solid_mask_2d(nx, ny, 2)] = SOLID
    grid_vel = np.zeros((nx, ny, 2), dtype=np.float64)
    out, _p, _d = project_masked_2d(
        grid_vel, labels, dx, _DT, 1.0, 200, solid_vel=(0.25, 0.0)
    )
    solid = labels == SOLID
    assert np.all(out[solid, 0] == 0.25)
    assert np.all(out[solid, 1] == 0.0)
    # The moving wall pushes adjacent fluid: divergence source appears
    # -> nonzero pressure response.
    fluid = labels == FLUID
    assert float(np.max(np.abs(out[fluid]))) > 0.0
