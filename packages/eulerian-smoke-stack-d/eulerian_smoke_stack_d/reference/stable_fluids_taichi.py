"""Stam-Fedkiw stable-fluids Taichi-DSL reference for the Stack-D port (2D + 3D).

Spec-ref-stack-d.md § 5. Ported from the Phase-1 NumPy reference
``packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py``: the
collocated cell-centered periodic-BC Stam-Fedkiw pipeline (semi-Lagrangian
advection -- plain trilinear in 3D, MacCormack-corrected in 2D -- explicit
Laplacian diffusion, fixed-``n_jacobi=20``-sweep Jacobi pressure-projection,
Fedkiw-2001 vorticity confinement [eps=0 dead path at canonical], scalar smoke
density advection). NumPy arrays flow in and out; the per-cell stencil kernels
run as ``@ti.kernel`` over ``ti.types.ndarray`` views (the LBM/sph-water/RD-2D
Stack-D pattern).

Module-level discipline (Taichi-integration IC-12):

- NO ``from __future__ import annotations`` -- Taichi's ``@ti.kernel`` AST
  transformer resolves argument-type annotations at decoration time; PEP 563
  stringification breaks it (IC-12 § 4.2, R-T2).
- NO ``-> None`` return annotation on any ``@ti.kernel`` (IC-12 § 4.6, R-T4).

f64 PRECISION (Stage-0 banked discipline #7; applies NON-vacuously here):
``set_taichi_deterministic`` pins arch + threads + seed + offline_cache but NOT
``default_fp=ti.f64``. The Stam-Fedkiw pipeline carries no in-kernel REDUCTIONS
(the per-cell SL gather is a fixed 4-/8-term convex sum; the stencils are fixed
4-/6-term sums), and every kernel reads/writes f64 ``ti.types.ndarray`` views so
the float locals fed by those views stay f64. BUT the banked f64-seed trap still
bites at one site: the 3D Jacobi normaliser ``1.0/6.0`` is a PURE-LITERAL
division whose operands carry no f64 ndarray, so a bare ``1.0/6.0`` infers f32
(~1e-8 error in the non-power-of-2 reciprocal) and leaked ~1e-9 into the 3D
cross-stack pressure solve at the Stage-1 derisk (vs ~1e-16 with the seed). It is
seeded explicitly as ``ti.f64(1.0) / ti.f64(6.0)`` in ``_k_jacobi_sweep_3d``.
The 2D Jacobi multiplies by ``0.25`` (exact in f32) so needs no seed -- which is
exactly why the 2D path matched at FP-round-off without intervention while the 3D
path did not. Smoke is the FIRST cross-stack port where banked precedent #7
applies to a pure-literal CONSTANT rather than an in-kernel reduction accumulator.

DETERMINISM: ``cpu_max_num_threads=1`` (from ``set_taichi_deterministic``)
serialises the ``ti.ndrange`` cell loops; the interpolation / stencil sums are
written in the SAME lex order as the NumPy reference's ``np.roll`` expressions,
so the floating-point accumulation residual stays bit-identical across runs and
at FP-round-off scale across stacks. NO ``ti.atomic_add`` / subgroup-collective
surfaces (``determinism.atomic_ops = False``); NO RNG (analytic ICs).

Axis convention (matches the Phase-1 reference): ``indexing="ij"`` throughout;
2D fields shape ``(Nx, Ny)`` (axis 0 = x, axis 1 = y); 3D fields shape
``(Nx, Ny, Nz)`` (axis 0 = x, axis 1 = y, axis 2 = z); ``u`` along axis 0,
``v`` along axis 1, ``w`` along axis 2. Periodic wrap via floored modulus
(``xb - floor(xb/N)*N``; the ``np.mod`` analogue, NOT ``np.clip``).
"""

from typing import Any, Final

import numpy as np
import taichi as ti
from common_py.determinism import Config, set_taichi_deterministic
from numpy.typing import NDArray

Array2D = NDArray[np.float64]
Array3D = NDArray[np.float64]

# Canonical capture identifiers (re-derived VERBATIM from the Phase-1 reference
# per Appendix D § D.2.3; no Phase-1 import -- Convention A/D isolation).
CANONICAL_DESCRIPTOR_3D: Final[str] = "taylor-green-128cube-seed42-step500"
CANONICAL_DESCRIPTOR_2D: Final[str] = "lid-driven-cavity-128sq-re100-seed42-step1000"
CANONICAL_SEED: Final[int] = 42
CANONICAL_STEP_COUNT_3D: Final[int] = 500
CANONICAL_STEP_COUNT_2D: Final[int] = 1000

# Fixed Jacobi sweep cap (no convergence-check early-stop; the P24 pattern). The
# sweep COUNT is identical across stacks, so the cross-stack delta is
# FP-accumulation over fixed sweeps, NOT iteration-count divergence (deferred
# IC-15 aspect #5, in its determinism-safe fixed-cap form).
_DEFAULT_N_JACOBI: Final[int] = 20

_TAICHI_INITIALIZED = False


def _ensure_taichi() -> None:
    """Initialise Taichi (idempotent) per IC-11 arch='cpu' + determinism.

    Lazy first-use ``ti.init`` via ``set_taichi_deterministic``
    (``cpu_max_num_threads=1``, ``offline_cache=True``). The seed is pinned to
    the canonical ``42`` for parity but is immaterial -- the canonical ICs are
    analytic (Taylor-Green vortex; lid-driven shear layer) and the kernels
    consume NO ``ti.random`` surface, so the runtime is RNG-free at canonical
    scale and initialised exactly once per process.
    """
    global _TAICHI_INITIALIZED
    if _TAICHI_INITIALIZED:
        return
    set_taichi_deterministic(Config(deterministic=True, seed=CANONICAL_SEED), arch="cpu")
    _TAICHI_INITIALIZED = True


def canonical_params_2d() -> dict[str, Any]:
    """Lid-driven-cavity-128sq-re100 canonical parameters (re-derived verbatim).

    Re=100 fixes nu via Re = U_lid*L/nu with U_lid=1, L=1 -> nu = 0.01. dt=0.001
    keeps the collocated-grid periodic-BC approximation stable over step1000.
    """
    return {
        "n": 128,
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / 128.0,
        "dt": 0.001,
        "n_jacobi": _DEFAULT_N_JACOBI,
    }


def canonical_params_3d() -> dict[str, Any]:
    """Taylor-green-128cube canonical parameters (re-derived verbatim).

    Taylor-Green vortex (Taylor & Green 1937) with analytic decay ~ exp(-2 nu k^2 t);
    nu = 0.01 keeps the trajectory in a non-trivial vortical regime over step500.
    vorticity_eps = 0.0 -> the Fedkiw confinement force is a dead code path at the
    canonical capture (PRESENT-but-NOT-EXERCISED; methodology § 5.1).
    """
    return {
        "n": 128,
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / 128.0,
        "dt": 0.005,
        "n_jacobi": _DEFAULT_N_JACOBI,
        "vorticity_eps": 0.0,
    }


# --------------------------------------------------------------------------
# Taichi kernels (ti.types.ndarray f64; per-cell stencils, lex-order sums).
# --------------------------------------------------------------------------
@ti.kernel
def _k_sl_advect_2d(
    field: ti.types.ndarray(dtype=ti.f64, ndim=2),
    u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    dt: ti.f64,
    dx: ti.f64,
):
    nx = field.shape[0]
    ny = field.shape[1]
    fnx = ti.cast(nx, ti.f64)
    fny = ti.cast(ny, ti.f64)
    for i, j in ti.ndrange(nx, ny):
        xb = ti.cast(i, ti.f64) - u[i, j] * dt / dx
        yb = ti.cast(j, ti.f64) - v[i, j] * dt / dx
        xb = xb - ti.floor(xb / fnx) * fnx
        yb = yb - ti.floor(yb / fny) * fny
        i0 = ti.cast(xb, ti.i32) % nx
        j0 = ti.cast(yb, ti.i32) % ny
        i1 = (i0 + 1) % nx
        j1 = (j0 + 1) % ny
        fx = xb - ti.cast(i0, ti.f64)
        fy = yb - ti.cast(j0, ti.f64)
        f00 = field[i0, j0]
        f01 = field[i0, j1]
        f10 = field[i1, j0]
        f11 = field[i1, j1]
        out[i, j] = (
            (1.0 - fx) * (1.0 - fy) * f00
            + (1.0 - fx) * fy * f01
            + fx * (1.0 - fy) * f10
            + fx * fy * f11
        )


@ti.kernel
def _k_sl_advect_3d(
    field: ti.types.ndarray(dtype=ti.f64, ndim=3),
    u: ti.types.ndarray(dtype=ti.f64, ndim=3),
    v: ti.types.ndarray(dtype=ti.f64, ndim=3),
    w: ti.types.ndarray(dtype=ti.f64, ndim=3),
    out: ti.types.ndarray(dtype=ti.f64, ndim=3),
    dt: ti.f64,
    dx: ti.f64,
):
    nx = field.shape[0]
    ny = field.shape[1]
    nz = field.shape[2]
    fnx = ti.cast(nx, ti.f64)
    fny = ti.cast(ny, ti.f64)
    fnz = ti.cast(nz, ti.f64)
    for i, j, k in ti.ndrange(nx, ny, nz):
        xb = ti.cast(i, ti.f64) - u[i, j, k] * dt / dx
        yb = ti.cast(j, ti.f64) - v[i, j, k] * dt / dx
        zb = ti.cast(k, ti.f64) - w[i, j, k] * dt / dx
        xb = xb - ti.floor(xb / fnx) * fnx
        yb = yb - ti.floor(yb / fny) * fny
        zb = zb - ti.floor(zb / fnz) * fnz
        i0 = ti.cast(xb, ti.i32) % nx
        j0 = ti.cast(yb, ti.i32) % ny
        k0 = ti.cast(zb, ti.i32) % nz
        i1 = (i0 + 1) % nx
        j1 = (j0 + 1) % ny
        k1 = (k0 + 1) % nz
        fx = xb - ti.cast(i0, ti.f64)
        fy = yb - ti.cast(j0, ti.f64)
        fz = zb - ti.cast(k0, ti.f64)
        c000 = field[i0, j0, k0]
        c001 = field[i0, j0, k1]
        c010 = field[i0, j1, k0]
        c011 = field[i0, j1, k1]
        c100 = field[i1, j0, k0]
        c101 = field[i1, j0, k1]
        c110 = field[i1, j1, k0]
        c111 = field[i1, j1, k1]
        c00 = c000 * (1.0 - fz) + c001 * fz
        c01 = c010 * (1.0 - fz) + c011 * fz
        c10 = c100 * (1.0 - fz) + c101 * fz
        c11 = c110 * (1.0 - fz) + c111 * fz
        c0 = c00 * (1.0 - fy) + c01 * fy
        c1 = c10 * (1.0 - fy) + c11 * fy
        out[i, j, k] = c0 * (1.0 - fx) + c1 * fx


@ti.kernel
def _k_laplacian_5point_2d(
    field: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    inv_dx2: ti.f64,
):
    nx = field.shape[0]
    ny = field.shape[1]
    for i, j in ti.ndrange(nx, ny):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        out[i, j] = (
            field[im1, j] + field[ip1, j] + field[i, jm1] + field[i, jp1] - 4.0 * field[i, j]
        ) * inv_dx2


@ti.kernel
def _k_laplacian_7point_3d(
    field: ti.types.ndarray(dtype=ti.f64, ndim=3),
    out: ti.types.ndarray(dtype=ti.f64, ndim=3),
    inv_dx2: ti.f64,
):
    nx = field.shape[0]
    ny = field.shape[1]
    nz = field.shape[2]
    for i, j, k in ti.ndrange(nx, ny, nz):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        km1 = (k - 1 + nz) % nz
        kp1 = (k + 1) % nz
        out[i, j, k] = (
            field[im1, j, k]
            + field[ip1, j, k]
            + field[i, jm1, k]
            + field[i, jp1, k]
            + field[i, j, km1]
            + field[i, j, kp1]
            - 6.0 * field[i, j, k]
        ) * inv_dx2


@ti.kernel
def _k_divergence_2d(
    u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    inv_2dx: ti.f64,
):
    nx = u.shape[0]
    ny = u.shape[1]
    for i, j in ti.ndrange(nx, ny):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        out[i, j] = (u[ip1, j] - u[im1, j]) * inv_2dx + (v[i, jp1] - v[i, jm1]) * inv_2dx


@ti.kernel
def _k_divergence_3d(
    u: ti.types.ndarray(dtype=ti.f64, ndim=3),
    v: ti.types.ndarray(dtype=ti.f64, ndim=3),
    w: ti.types.ndarray(dtype=ti.f64, ndim=3),
    out: ti.types.ndarray(dtype=ti.f64, ndim=3),
    inv_2dx: ti.f64,
):
    nx = u.shape[0]
    ny = u.shape[1]
    nz = u.shape[2]
    for i, j, k in ti.ndrange(nx, ny, nz):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        km1 = (k - 1 + nz) % nz
        kp1 = (k + 1) % nz
        out[i, j, k] = (
            (u[ip1, j, k] - u[im1, j, k])
            + (v[i, jp1, k] - v[i, jm1, k])
            + (w[i, j, kp1] - w[i, j, km1])
        ) * inv_2dx


@ti.kernel
def _k_jacobi_sweep_2d(
    p: ti.types.ndarray(dtype=ti.f64, ndim=2),
    rhs: ti.types.ndarray(dtype=ti.f64, ndim=2),
    p_new: ti.types.ndarray(dtype=ti.f64, ndim=2),
    dx2: ti.f64,
):
    nx = p.shape[0]
    ny = p.shape[1]
    for i, j in ti.ndrange(nx, ny):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        p_new[i, j] = 0.25 * (p[im1, j] + p[ip1, j] + p[i, jm1] + p[i, jp1] - dx2 * rhs[i, j])


@ti.kernel
def _k_jacobi_sweep_3d(
    p: ti.types.ndarray(dtype=ti.f64, ndim=3),
    rhs: ti.types.ndarray(dtype=ti.f64, ndim=3),
    p_new: ti.types.ndarray(dtype=ti.f64, ndim=3),
    dx2: ti.f64,
):
    nx = p.shape[0]
    ny = p.shape[1]
    nz = p.shape[2]
    # f64 seed (banked precedent #7): set_taichi_deterministic does NOT set
    # default_fp=ti.f64, so the pure-literal `1.0/6.0` would infer f32 (~1e-8
    # error in the non-power-of-2 reciprocal) and leak ~1e-9 into the 3D
    # pressure solve vs the NumPy reference. ti.f64(...) keeps it f64. (The 2D
    # Jacobi multiplies by 0.25, exact in f32 -- no seed needed there.)
    inv6 = ti.f64(1.0) / ti.f64(6.0)
    for i, j, k in ti.ndrange(nx, ny, nz):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        km1 = (k - 1 + nz) % nz
        kp1 = (k + 1) % nz
        p_new[i, j, k] = inv6 * (
            p[im1, j, k]
            + p[ip1, j, k]
            + p[i, jm1, k]
            + p[i, jp1, k]
            + p[i, j, km1]
            + p[i, j, kp1]
            - dx2 * rhs[i, j, k]
        )


@ti.kernel
def _k_subtract_grad_2d(
    u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v: ti.types.ndarray(dtype=ti.f64, ndim=2),
    p: ti.types.ndarray(dtype=ti.f64, ndim=2),
    u_out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v_out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    coef: ti.f64,
    inv_2dx: ti.f64,
):
    nx = p.shape[0]
    ny = p.shape[1]
    for i, j in ti.ndrange(nx, ny):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        dpdx = (p[ip1, j] - p[im1, j]) * inv_2dx
        dpdy = (p[i, jp1] - p[i, jm1]) * inv_2dx
        u_out[i, j] = u[i, j] - coef * dpdx
        v_out[i, j] = v[i, j] - coef * dpdy


@ti.kernel
def _k_subtract_grad_3d(
    u: ti.types.ndarray(dtype=ti.f64, ndim=3),
    v: ti.types.ndarray(dtype=ti.f64, ndim=3),
    w: ti.types.ndarray(dtype=ti.f64, ndim=3),
    p: ti.types.ndarray(dtype=ti.f64, ndim=3),
    u_out: ti.types.ndarray(dtype=ti.f64, ndim=3),
    v_out: ti.types.ndarray(dtype=ti.f64, ndim=3),
    w_out: ti.types.ndarray(dtype=ti.f64, ndim=3),
    coef: ti.f64,
    inv_2dx: ti.f64,
):
    nx = p.shape[0]
    ny = p.shape[1]
    nz = p.shape[2]
    for i, j, k in ti.ndrange(nx, ny, nz):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        km1 = (k - 1 + nz) % nz
        kp1 = (k + 1) % nz
        dpdx = (p[ip1, j, k] - p[im1, j, k]) * inv_2dx
        dpdy = (p[i, jp1, k] - p[i, jm1, k]) * inv_2dx
        dpdz = (p[i, j, kp1] - p[i, j, km1]) * inv_2dx
        u_out[i, j, k] = u[i, j, k] - coef * dpdx
        v_out[i, j, k] = v[i, j, k] - coef * dpdy
        w_out[i, j, k] = w[i, j, k] - coef * dpdz


@ti.kernel
def _k_curl_3d(
    u: ti.types.ndarray(dtype=ti.f64, ndim=3),
    v: ti.types.ndarray(dtype=ti.f64, ndim=3),
    w: ti.types.ndarray(dtype=ti.f64, ndim=3),
    ox: ti.types.ndarray(dtype=ti.f64, ndim=3),
    oy: ti.types.ndarray(dtype=ti.f64, ndim=3),
    oz: ti.types.ndarray(dtype=ti.f64, ndim=3),
    inv_2dx: ti.f64,
):
    nx = u.shape[0]
    ny = u.shape[1]
    nz = u.shape[2]
    for i, j, k in ti.ndrange(nx, ny, nz):
        im1 = (i - 1 + nx) % nx
        ip1 = (i + 1) % nx
        jm1 = (j - 1 + ny) % ny
        jp1 = (j + 1) % ny
        km1 = (k - 1 + nz) % nz
        kp1 = (k + 1) % nz
        dwdy = (w[i, jp1, k] - w[i, jm1, k]) * inv_2dx
        dvdz = (v[i, j, kp1] - v[i, j, km1]) * inv_2dx
        dudz = (u[i, j, kp1] - u[i, j, km1]) * inv_2dx
        dwdx = (w[ip1, j, k] - w[im1, j, k]) * inv_2dx
        dvdx = (v[ip1, j, k] - v[im1, j, k]) * inv_2dx
        dudy = (u[i, jp1, k] - u[i, jm1, k]) * inv_2dx
        ox[i, j, k] = dwdy - dvdz
        oy[i, j, k] = dudz - dwdx
        oz[i, j, k] = dvdx - dudy


# --------------------------------------------------------------------------
# Public API (NumPy in/out; signatures mirror the Phase-1 reference verbatim).
# --------------------------------------------------------------------------
def semi_lagrangian_advect_2d(
    field: Array2D, u: Array2D, v: Array2D, dt: float, dx: float
) -> Array2D:
    """Bilinear semi-Lagrangian backtrace on a periodic 2D grid (lex (i,j))."""
    _ensure_taichi()
    f = np.ascontiguousarray(field, dtype=np.float64)
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    out = np.empty_like(f)
    _k_sl_advect_2d(f, uu, vv, out, float(dt), float(dx))
    return out


def maccormack_advect_2d(field: Array2D, u: Array2D, v: Array2D, dt: float, dx: float) -> Array2D:
    """MacCormack-corrected semi-Lagrangian advection (2D periodic; no limiter).

    Predictor-corrector (spec-ref § 6.1, formal order p=2): ``phi_hat = SL(+dt)``;
    ``phi_check = SL(phi_hat, -dt)``; ``phi^{n+1} = phi_hat + (phi - phi_check)/2``.
    The correction arithmetic is elementwise (matches the NumPy reference exactly).
    """
    f_pred = semi_lagrangian_advect_2d(field, u, v, dt, dx)
    f_corr_back = semi_lagrangian_advect_2d(f_pred, u, v, -dt, dx)
    error = 0.5 * (np.ascontiguousarray(field, dtype=np.float64) - f_corr_back)
    return f_pred + error


def semi_lagrangian_advect_3d(
    field: Array3D, u: Array3D, v: Array3D, w: Array3D, dt: float, dx: float
) -> Array3D:
    """Trilinear semi-Lagrangian backtrace on a periodic 3D grid (lex (i,j,k))."""
    _ensure_taichi()
    f = np.ascontiguousarray(field, dtype=np.float64)
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    ww = np.ascontiguousarray(w, dtype=np.float64)
    out = np.empty_like(f)
    _k_sl_advect_3d(f, uu, vv, ww, out, float(dt), float(dx))
    return out


def _laplacian_5point_periodic(field: Array2D, inv_dx2: float) -> Array2D:
    _ensure_taichi()
    f = np.ascontiguousarray(field, dtype=np.float64)
    out = np.empty_like(f)
    _k_laplacian_5point_2d(f, out, float(inv_dx2))
    return out


def _laplacian_7point_periodic(field: Array3D, inv_dx2: float) -> Array3D:
    _ensure_taichi()
    f = np.ascontiguousarray(field, dtype=np.float64)
    out = np.empty_like(f)
    _k_laplacian_7point_3d(f, out, float(inv_dx2))
    return out


def _divergence_2d_periodic(u: Array2D, v: Array2D, dx: float) -> Array2D:
    _ensure_taichi()
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    out = np.empty_like(uu)
    _k_divergence_2d(uu, vv, out, 0.5 / float(dx))
    return out


def _divergence_3d_periodic(u: Array3D, v: Array3D, w: Array3D, dx: float) -> Array3D:
    _ensure_taichi()
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    ww = np.ascontiguousarray(w, dtype=np.float64)
    out = np.empty_like(uu)
    _k_divergence_3d(uu, vv, ww, out, 0.5 / float(dx))
    return out


def project_pressure(
    u: Array2D, v: Array2D, params: dict[str, Any], n_iter: int | None = None
) -> tuple[Array2D, Array2D, Array2D]:
    """Jacobi pressure-projection on a 2D periodic grid (fixed sweep cap).

    Solves ``lap(p) = (rho/dt) div(u*)`` with ``n_iter`` Jacobi sweeps (no
    early-stop; double-buffered), then subtracts ``(dt/rho) grad(p)``. The
    2nd-order centered div + grad (spec-ref § 6.1) compose to the "wide"
    Laplacian -> an O(dx^2) residual divergence floor at fixed dx (the classical
    Stam-on-collocated tradeoff; the MAC-staggered fix is the Stack-C deliverable).
    ``n_iter == 0`` -> p stays zero -> projection is the identity.

    Returns ``(u_div_free, v_div_free, p)``.
    """
    _ensure_taichi()
    if n_iter is None:
        n_iter = int(params.get("n_jacobi", _DEFAULT_N_JACOBI))
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    dx2 = dx * dx
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    div = _divergence_2d_periodic(uu, vv, dx)
    rhs = np.ascontiguousarray((rho / dt) * div, dtype=np.float64)
    p_a = np.zeros_like(uu)
    p_b = np.zeros_like(uu)
    for _ in range(int(n_iter)):
        _k_jacobi_sweep_2d(p_a, rhs, p_b, dx2)
        p_a, p_b = p_b, p_a
    u_out = np.empty_like(uu)
    v_out = np.empty_like(uu)
    _k_subtract_grad_2d(uu, vv, p_a, u_out, v_out, dt / rho, 0.5 / dx)
    return u_out, v_out, p_a


def project_pressure_3d(
    u: Array3D, v: Array3D, w: Array3D, params: dict[str, Any], n_iter: int | None = None
) -> tuple[Array3D, Array3D, Array3D, Array3D]:
    """Jacobi pressure-projection on a 3D periodic grid (fixed sweep cap).

    Returns ``(u_div_free, v_div_free, w_div_free, p)``.
    """
    _ensure_taichi()
    if n_iter is None:
        n_iter = int(params.get("n_jacobi", _DEFAULT_N_JACOBI))
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    dx2 = dx * dx
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    ww = np.ascontiguousarray(w, dtype=np.float64)
    div = _divergence_3d_periodic(uu, vv, ww, dx)
    rhs = np.ascontiguousarray((rho / dt) * div, dtype=np.float64)
    p_a = np.zeros_like(uu)
    p_b = np.zeros_like(uu)
    for _ in range(int(n_iter)):
        _k_jacobi_sweep_3d(p_a, rhs, p_b, dx2)
        p_a, p_b = p_b, p_a
    u_out = np.empty_like(uu)
    v_out = np.empty_like(uu)
    w_out = np.empty_like(uu)
    _k_subtract_grad_3d(uu, vv, ww, p_a, u_out, v_out, w_out, dt / rho, 0.5 / dx)
    return u_out, v_out, w_out, p_a


def _curl_3d_periodic(
    u: Array3D, v: Array3D, w: Array3D, dx: float
) -> tuple[Array3D, Array3D, Array3D]:
    """Periodic 3D curl via centered differences. Returns ``(omega_x, omega_y, omega_z)``."""
    _ensure_taichi()
    uu = np.ascontiguousarray(u, dtype=np.float64)
    vv = np.ascontiguousarray(v, dtype=np.float64)
    ww = np.ascontiguousarray(w, dtype=np.float64)
    ox = np.empty_like(uu)
    oy = np.empty_like(uu)
    oz = np.empty_like(uu)
    _k_curl_3d(uu, vv, ww, ox, oy, oz, 0.5 / float(dx))
    return ox, oy, oz


def _vorticity_confinement_3d(
    u: Array3D, v: Array3D, w: Array3D, eps: float, dx: float
) -> tuple[Array3D, Array3D, Array3D]:
    """Fedkiw-2001 vorticity confinement force ``eps * (N x omega) * dx``.

    PRESENT-but-NOT-EXERCISED at canonical (``vorticity_eps = 0.0`` ->
    early-return zeros; methodology § 5.1). The eps>0 assembly mirrors the
    NumPy reference; the curl is the Taichi ``_k_curl_3d`` kernel.
    """
    if eps == 0.0:
        return (np.zeros_like(u), np.zeros_like(v), np.zeros_like(w))
    omega_x, omega_y, omega_z = _curl_3d_periodic(u, v, w, dx)
    omega_mag = np.sqrt(omega_x * omega_x + omega_y * omega_y + omega_z * omega_z)
    inv_2dx = 0.5 / dx
    grad_x = (np.roll(omega_mag, -1, axis=0) - np.roll(omega_mag, +1, axis=0)) * inv_2dx
    grad_y = (np.roll(omega_mag, -1, axis=1) - np.roll(omega_mag, +1, axis=1)) * inv_2dx
    grad_z = (np.roll(omega_mag, -1, axis=2) - np.roll(omega_mag, +1, axis=2)) * inv_2dx
    grad_norm = np.sqrt(grad_x * grad_x + grad_y * grad_y + grad_z * grad_z) + 1e-30
    nx_ = grad_x / grad_norm
    ny_ = grad_y / grad_norm
    nz_ = grad_z / grad_norm
    fc_x = eps * dx * (ny_ * omega_z - nz_ * omega_y)
    fc_y = eps * dx * (nz_ * omega_x - nx_ * omega_z)
    fc_z = eps * dx * (nx_ * omega_y - ny_ * omega_x)
    return fc_x, fc_y, fc_z


def stable_fluids_step(
    u: Array2D,
    v: Array2D,
    p: Array2D,
    params: dict[str, Any],
    source: tuple[Array2D, Array2D] | None = None,
) -> tuple[Array2D, Array2D, Array2D]:
    """One 2D Stam stable-fluids step on a periodic grid (MacCormack advect).

    Args mirror the Phase-1 reference: ``p`` is the carried-pass-through previous
    pressure (unused at this step); ``source`` is optional ``(S_u, S_v)``
    manufactured-source forcing (MMS gate-4). Returns ``(u_next, v_next, p_next)``.
    """
    del p  # unused -- convention re-exposed pass-through.
    nu = float(params["nu"])
    dt = float(params["dt"])
    dx = float(params["dx"])
    inv_dx2 = 1.0 / (dx * dx)
    u_adv = maccormack_advect_2d(u, u, v, dt, dx)
    v_adv = maccormack_advect_2d(v, u, v, dt, dx)
    if source is not None:
        s_u, s_v = source
        u_adv = u_adv + dt * s_u
        v_adv = v_adv + dt * s_v
    if nu > 0.0:
        u_adv = u_adv + dt * nu * _laplacian_5point_periodic(u_adv, inv_dx2)
        v_adv = v_adv + dt * nu * _laplacian_5point_periodic(v_adv, inv_dx2)
    u_next, v_next, p_next = project_pressure(u_adv, v_adv, params)
    return u_next, v_next, p_next


def stable_fluids_step_3d(
    u: Array3D,
    v: Array3D,
    w: Array3D,
    density: Array3D,
    params: dict[str, Any],
) -> tuple[Array3D, Array3D, Array3D, Array3D, Array3D]:
    """One 3D Stam-Fedkiw step (velocity + scalar smoke density; plain trilinear SL).

    Used by the canonical ``taylor-green-128cube-seed42-step500`` capture.
    Returns ``(u_next, v_next, w_next, density_next, p_next)``.
    """
    nu = float(params["nu"])
    dt = float(params["dt"])
    dx = float(params["dx"])
    eps_vc = float(params.get("vorticity_eps", 0.0))
    inv_dx2 = 1.0 / (dx * dx)
    u_adv = semi_lagrangian_advect_3d(u, u, v, w, dt, dx)
    v_adv = semi_lagrangian_advect_3d(v, u, v, w, dt, dx)
    w_adv = semi_lagrangian_advect_3d(w, u, v, w, dt, dx)
    fc_x, fc_y, fc_z = _vorticity_confinement_3d(u_adv, v_adv, w_adv, eps_vc, dx)
    u_adv = u_adv + dt * fc_x
    v_adv = v_adv + dt * fc_y
    w_adv = w_adv + dt * fc_z
    if nu > 0.0:
        u_adv = u_adv + dt * nu * _laplacian_7point_periodic(u_adv, inv_dx2)
        v_adv = v_adv + dt * nu * _laplacian_7point_periodic(v_adv, inv_dx2)
        w_adv = w_adv + dt * nu * _laplacian_7point_periodic(w_adv, inv_dx2)
    u_next, v_next, w_next, p_next = project_pressure_3d(u_adv, v_adv, w_adv, params)
    density_next = semi_lagrangian_advect_3d(density, u_next, v_next, w_next, dt, dx)
    return u_next, v_next, w_next, density_next, p_next


__all__ = [
    "CANONICAL_DESCRIPTOR_2D",
    "CANONICAL_DESCRIPTOR_3D",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT_2D",
    "CANONICAL_STEP_COUNT_3D",
    "Array2D",
    "Array3D",
    "canonical_params_2d",
    "canonical_params_3d",
    "maccormack_advect_2d",
    "project_pressure",
    "project_pressure_3d",
    "semi_lagrangian_advect_2d",
    "semi_lagrangian_advect_3d",
    "stable_fluids_step",
    "stable_fluids_step_3d",
]
