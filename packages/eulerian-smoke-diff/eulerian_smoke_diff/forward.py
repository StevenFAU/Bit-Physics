"""Differentiable smoke — config + closed-form analytic helpers (Stack E / Warp).

The tape-differentiable ``wp.Tape`` kernels live in :mod:`._kernels` (IC-12 dedicated kernel
module). This module holds the strict-typed pure-NumPy surface: the configuration dataclass, the
canonical initial-field / velocity builders, and the analytic helpers the gradient-golden anchors
verify the autodiff against —

* **A1** the linear-advection-operator gradient ``∂Loss/∂u₀ = 2 Mᵀ(M u₀ - target)`` where ``M``
  is the exact sparse semi-Lagrangian bilinear-interpolation operator (constant velocity → fixed
  backtrace → ``advect`` is *linear* in the field). The NumPy advect mirror replicates the
  reference ``_sl_advect_2d_k`` op-order, so ``M`` is bit-faithful to the Warp engine
  ([[stack-e-warp-f64-bit-faithful-to-numpy]]) → autodiff matches it to ~1e-16.
* **A3** the discrete-diffusion gradient ``∂Loss/∂nu = 2(u' - target)·(dt·∇²u)`` for the explicit
  step ``u' = u + dt·nu·∇²u`` — a *distinct physical term* (diffusion, not advection), *distinct
  parameter* (the coefficient ``nu``, not the field ``u₀``), and *distinct method* (heat-operator
  linearization, not the advection adjoint).

Algorithm reference: Stam, J. (1999), "Stable Fluids", SIGGRAPH '99, 121-128
(DOI 10.1145/311535.311548) — the semi-Lagrangian backtrace advection. The heat-equation
``∂_t u = nu∇²u`` motivates A3; the EXACT golden value is the discrete explicit operator's
derivative (the A3 framing shift, probe § 3).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

__all__ = [
    "SmokeDiffConfig",
    "advect_loss_grad_analytic",
    "advect_operator_matrix",
    "constant_velocity_fields",
    "diffusion_dloss_dnu_analytic",
    "numpy_laplacian_5point",
    "numpy_sl_advect",
    "smooth_initial_field",
]

FloatArray = NDArray[np.float64]


@dataclass(frozen=True)
class SmokeDiffConfig:
    """Canonical differentiable-smoke configuration (constant-velocity advection regime).

    Deliberately small (``grid_n=16``, ``steps=3``) and **constant velocity** so the
    semi-Lagrangian advect map is a globally-linear, well-conditioned operator (the per-step
    fractional cell displacement is bounded away from 0.5 → no cell-boundary kink, full-rank
    ``M`` → the initial field ``u₀`` is identifiable; see :func:`~.sim.solve_recovery`). The
    diffusion coefficient ``nu`` is exercised by the A3 gradient anchor + a PBT, not by the
    canonical (pure-advection) inverse.
    """

    grid_n: int = 16
    steps: int = 3
    vx: float = 0.6
    vy: float = -0.4
    dt: float = 0.03125  # vx·dt/dx = 0.3 cells/step, vy·dt/dx = -0.2 (fractions away from 0.5)
    nu: float = 0.05
    blob_center: tuple[float, float] = (0.5, 0.5)
    blob_sigma: float = 0.18
    blob_amp: float = 1.0
    seed: int = 42

    @property
    def dx(self) -> float:
        return 1.0 / float(self.grid_n)

    @property
    def inv_dx2(self) -> float:
        return 1.0 / (self.dx * self.dx)


def constant_velocity_fields(cfg: SmokeDiffConfig) -> tuple[FloatArray, FloatArray]:
    """Spatially-constant ``(u, v)`` velocity fields (the linear-advect regime)."""
    u = np.full((cfg.grid_n, cfg.grid_n), float(cfg.vx), dtype=np.float64)
    v = np.full((cfg.grid_n, cfg.grid_n), float(cfg.vy), dtype=np.float64)
    return u, v


def smooth_initial_field(cfg: SmokeDiffConfig) -> FloatArray:
    """A smooth Gaussian-bump initial smoke density on the periodic unit square.

    Smooth (low high-frequency content) so the mild low-pass attenuation of the bilinear advect
    operator does not lose recoverable structure — the identifiable-recovery IC."""
    idx = (np.arange(cfg.grid_n, dtype=np.float64) + 0.5) / cfg.grid_n
    x, y = np.meshgrid(idx, idx, indexing="ij")
    cx, cy = cfg.blob_center
    sig2 = cfg.blob_sigma * cfg.blob_sigma
    field = cfg.blob_amp * np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2.0 * sig2))
    return np.ascontiguousarray(field, dtype=np.float64)


def _pmod(x: FloatArray, n: float) -> FloatArray:
    """NumPy positive modulus (mirrors the kernel ``_pmod``)."""
    return x - n * np.floor(x / n)


def numpy_sl_advect(
    field: FloatArray, u: FloatArray, v: FloatArray, dt: float, dx: float
) -> FloatArray:
    """Pure-NumPy bilinear semi-Lagrangian advect (mirrors ``_sl_advect_2d_k`` op-order).

    An independent (NumPy, not Warp) re-implementation used to assemble the analytic advect
    operator ``M`` — the A1 reference. Op-order-faithful to the kernel so ``M`` is bit-faithful
    to the Warp engine on CPU f64."""
    nx, ny = field.shape
    out = np.zeros_like(field)
    for i in range(nx):
        for j in range(ny):
            xb = _pmod(np.array(float(i) - u[i, j] * dt / dx), float(nx))
            yb = _pmod(np.array(float(j) - v[i, j] * dt / dx), float(ny))
            xb_f = float(xb)
            yb_f = float(yb)
            i0 = int(xb_f) % nx
            j0 = int(yb_f) % ny
            i1 = (i0 + 1) % nx
            j1 = (j0 + 1) % ny
            fx = xb_f - float(i0)
            fy = yb_f - float(j0)
            out[i, j] = (
                (1.0 - fx) * (1.0 - fy) * field[i0, j0]
                + (1.0 - fx) * fy * field[i0, j1]
                + fx * (1.0 - fy) * field[i1, j0]
                + fx * fy * field[i1, j1]
            )
    return out


def advect_operator_matrix(cfg: SmokeDiffConfig, u: FloatArray, v: FloatArray) -> FloatArray:
    """Assemble the exact sparse single-step SL-advect linear operator ``M`` (``advect(f)=M f``).

    For a constant velocity the bilinear backtrace weights are field-independent, so ``advect`` is
    the linear map ``M`` whose rows are the 4-cell bilinear stencils. Assembled directly from the
    op-order-faithful weights (the A1 analytic reference)."""
    n = cfg.grid_n
    dx, dt = cfg.dx, cfg.dt
    m = np.zeros((n * n, n * n), dtype=np.float64)
    for i in range(n):
        for j in range(n):
            xb = float(_pmod(np.array(float(i) - u[i, j] * dt / dx), float(n)))
            yb = float(_pmod(np.array(float(j) - v[i, j] * dt / dx), float(n)))
            i0 = int(xb) % n
            j0 = int(yb) % n
            i1 = (i0 + 1) % n
            j1 = (j0 + 1) % n
            fx = xb - float(i0)
            fy = yb - float(j0)
            row = i * n + j
            m[row, i0 * n + j0] += (1.0 - fx) * (1.0 - fy)
            m[row, i0 * n + j1] += (1.0 - fx) * fy
            m[row, i1 * n + j0] += fx * (1.0 - fy)
            m[row, i1 * n + j1] += fx * fy
    return m


def advect_loss_grad_analytic(
    cfg: SmokeDiffConfig, u0: FloatArray, target: FloatArray, u: FloatArray, v: FloatArray
) -> FloatArray:
    """Closed-form ``∂Loss/∂u₀`` for ``steps`` pure-advection steps (A1).

    ``predicted = Mᵏ u₀``; ``Loss = ‖predicted - target‖²`` ⇒ ``∂Loss/∂u₀ = 2 (Mᵏ)ᵀ(Mᵏ u₀ - t)``.
    Returns the gradient as a ``(grid_n, grid_n)`` field."""
    m = advect_operator_matrix(cfg, u, v)
    mk = np.linalg.matrix_power(m, cfg.steps)
    u0v = np.ascontiguousarray(u0, dtype=np.float64).ravel()
    tv = np.ascontiguousarray(target, dtype=np.float64).ravel()
    grad = 2.0 * mk.T @ (mk @ u0v - tv)
    return grad.reshape(cfg.grid_n, cfg.grid_n)


def numpy_laplacian_5point(field: FloatArray, inv_dx2: float) -> FloatArray:
    """5-point centered periodic Laplacian (mirrors the reference ``_lap5_k``)."""
    return (
        np.roll(field, +1, axis=0)
        + np.roll(field, -1, axis=0)
        + np.roll(field, +1, axis=1)
        + np.roll(field, -1, axis=1)
        - 4.0 * field
    ) * inv_dx2


def diffusion_dloss_dnu_analytic(
    cfg: SmokeDiffConfig, u0: FloatArray, target: FloatArray, nu: float
) -> float:
    """Closed-form ``∂Loss/∂nu`` for one explicit-diffusion step (A3).

    ``u' = u₀ + dt·nu·∇²u₀``; ``Loss = ‖u' - target‖²`` is exactly linear in ``nu``, so
    ``∂Loss/∂nu = 2 (u' - target)·(dt·∇²u₀)`` — a distinct physical term / parameter / method from
    A1."""
    lap = numpy_laplacian_5point(np.ascontiguousarray(u0, dtype=np.float64), cfg.inv_dx2)
    out = u0 + cfg.dt * nu * lap
    return float(2.0 * np.sum((out - target) * (cfg.dt * lap)))
