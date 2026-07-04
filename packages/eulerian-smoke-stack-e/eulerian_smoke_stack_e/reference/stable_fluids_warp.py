"""Stam-Fedkiw stable-fluids NVIDIA Warp reference (2D + 3D), Stack-E.

Content-equivalent Warp `@wp.kernel` port of the Phase-1 NumPy reference
`packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py`
(`stack.name="numpy-reference"`). The NumPy-marshalling wrappers present the
Phase-1 public API VERBATIM (same signatures, same return shapes); the inner
per-cell `@wp.kernel`s replicate the reference's `np.roll`/`np.mod` operation
ORDER so the cross-stack step-1 delta is FP-round-off (~1e-16), not an
algorithmic divergence (D10 step-1 port-faithfulness). BOTH canonical
trajectories are chaotic (positive-Lyapunov), so the full-horizon cross-stack
verdict is `within_tolerance=False` (R-P2 escape-hatch; gate-14, Stage 1c).

Algorithm reference: Stam, J. (1999), "Stable Fluids", SIGGRAPH '99, 121-128
(DOI 10.1145/311535.311548); vorticity confinement per Fedkiw, Stam, Jensen
(2001), "Visual Simulation of Smoke", SIGGRAPH '01, 15-22
(DOI 10.1145/383259.383260); Taylor-Green vortex per Taylor & Green (1937,
DOI 10.1098/rspa.1937.0036).

DETERMINISM (D9; sim.py docstring is load-bearing): every kernel is a per-cell
gather (SL backtrace; 5/7-point Laplacian; centered-difference div/grad/curl;
fixed-`n_jacobi=20` Jacobi sweep). NO `wp.atomic_add`, no RNG. Warp's CPU
`wp.launch` is single-threaded serial over the launch dimension, so the kernels
are order-deterministic and bit-identical run-to-run (bit-exact-same-hw) -- even
though the canonical trajectory diverges across stacks. O-W6: this kernel module
omits `from __future__ import annotations`. O-W7: the pure-literal 3D Jacobi
normaliser is seeded `wp.float64(1.0) / wp.float64(6.0)`; float backtrace
positions derive int base nodes via `wp.int32(...)` on a non-reused float.
"""

from typing import Any, Final

import numpy as np
import warp as wp
from numpy.typing import NDArray

Array2D = NDArray[np.float64]
Array3D = NDArray[np.float64]

CANONICAL_DESCRIPTOR_3D: Final[str] = "taylor-green-128cube-seed42-step500"
CANONICAL_DESCRIPTOR_2D: Final[str] = "lid-driven-cavity-128sq-re100-seed42-step1000"
CANONICAL_SEED: Final[int] = 42
CANONICAL_STEP_COUNT_3D: Final[int] = 500
CANONICAL_STEP_COUNT_2D: Final[int] = 1000
_DEFAULT_N_JACOBI: Final[int] = 20

_DEVICE: Final[str] = "cpu"


def canonical_params_2d() -> dict[str, Any]:
    """Lid-driven-cavity-128sq-re100 canonical parameters (re-derived verbatim)."""
    return {
        "n": 128,
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / 128.0,
        "dt": 0.001,
        "n_jacobi": _DEFAULT_N_JACOBI,
    }


def canonical_params_3d() -> dict[str, Any]:
    """Taylor-green-128cube canonical parameters (re-derived verbatim)."""
    return {
        "n": 128,
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / 128.0,
        "dt": 0.005,
        "n_jacobi": _DEFAULT_N_JACOBI,
        "vorticity_eps": 0.0,
    }


# -- Warp kernels (per-cell gathers; np.roll/np.mod operation order matched) ---


@wp.func
def _pmod(x: wp.float64, n: wp.float64) -> wp.float64:
    # NumPy-positive modulus (np.mod): result carries the divisor's sign.
    m = x - n * wp.floor(x / n)
    # Fraction-complete FP-edge guard (P6-FPEDGE fix, mirrors the NumPy
    # reference): the floored modulus rounds to exactly n for tiny negative x;
    # the derived interpolation fraction would then be n — a xn extrapolation.
    # Wrap the coordinate to 0.0, the limit the intended semantics compute.
    if m >= n:
        m = wp.float64(0.0)
    return m


@wp.kernel
def _sl_advect_2d_k(
    field: wp.array(dtype=wp.float64, ndim=2),
    u: wp.array(dtype=wp.float64, ndim=2),
    v: wp.array(dtype=wp.float64, ndim=2),
    dt: wp.float64,
    dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=2),
):
    i, j = wp.tid()
    one = wp.float64(1.0)
    # Backtrace (grid units); reference order: is_ - u*dt/dx, then np.mod.
    xb = _pmod(wp.float64(i) - u[i, j] * dt / dx, wp.float64(nx))
    yb = _pmod(wp.float64(j) - v[i, j] * dt / dx, wp.float64(ny))
    i0 = wp.int32(xb) % nx
    j0 = wp.int32(yb) % ny
    i1 = (i0 + 1) % nx
    j1 = (j0 + 1) % ny
    fx = xb - wp.float64(i0)
    fy = yb - wp.float64(j0)
    f00 = field[i0, j0]
    f01 = field[i0, j1]
    f10 = field[i1, j0]
    f11 = field[i1, j1]
    out[i, j] = (
        (one - fx) * (one - fy) * f00
        + (one - fx) * fy * f01
        + fx * (one - fy) * f10
        + fx * fy * f11
    )


@wp.kernel
def _sl_advect_3d_k(
    field: wp.array(dtype=wp.float64, ndim=3),
    u: wp.array(dtype=wp.float64, ndim=3),
    v: wp.array(dtype=wp.float64, ndim=3),
    w: wp.array(dtype=wp.float64, ndim=3),
    dt: wp.float64,
    dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=3),
):
    i, j, k = wp.tid()
    one = wp.float64(1.0)
    xb = _pmod(wp.float64(i) - u[i, j, k] * dt / dx, wp.float64(nx))
    yb = _pmod(wp.float64(j) - v[i, j, k] * dt / dx, wp.float64(ny))
    zb = _pmod(wp.float64(k) - w[i, j, k] * dt / dx, wp.float64(nz))
    i0 = wp.int32(xb) % nx
    j0 = wp.int32(yb) % ny
    k0 = wp.int32(zb) % nz
    i1 = (i0 + 1) % nx
    j1 = (j0 + 1) % ny
    k1 = (k0 + 1) % nz
    fx = xb - wp.float64(i0)
    fy = yb - wp.float64(j0)
    fz = zb - wp.float64(k0)
    c000 = field[i0, j0, k0]
    c001 = field[i0, j0, k1]
    c010 = field[i0, j1, k0]
    c011 = field[i0, j1, k1]
    c100 = field[i1, j0, k0]
    c101 = field[i1, j0, k1]
    c110 = field[i1, j1, k0]
    c111 = field[i1, j1, k1]
    c00 = c000 * (one - fz) + c001 * fz
    c01 = c010 * (one - fz) + c011 * fz
    c10 = c100 * (one - fz) + c101 * fz
    c11 = c110 * (one - fz) + c111 * fz
    c0 = c00 * (one - fy) + c01 * fy
    c1 = c10 * (one - fy) + c11 * fy
    out[i, j, k] = c0 * (one - fx) + c1 * fx


@wp.kernel
def _lap5_k(
    field: wp.array(dtype=wp.float64, ndim=2),
    inv_dx2: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=2),
):
    i, j = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    out[i, j] = (
        field[im, j] + field[ip, j] + field[i, jm] + field[i, jp] - wp.float64(4.0) * field[i, j]
    ) * inv_dx2


@wp.kernel
def _lap7_k(
    field: wp.array(dtype=wp.float64, ndim=3),
    inv_dx2: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=3),
):
    i, j, k = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    km = (k - 1 + nz) % nz
    kp = (k + 1) % nz
    out[i, j, k] = (
        field[im, j, k]
        + field[ip, j, k]
        + field[i, jm, k]
        + field[i, jp, k]
        + field[i, j, km]
        + field[i, j, kp]
        - wp.float64(6.0) * field[i, j, k]
    ) * inv_dx2


@wp.kernel
def _div2d_k(
    u: wp.array(dtype=wp.float64, ndim=2),
    v: wp.array(dtype=wp.float64, ndim=2),
    inv_2dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=2),
):
    i, j = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    out[i, j] = (u[ip, j] - u[im, j]) * inv_2dx + (v[i, jp] - v[i, jm]) * inv_2dx


@wp.kernel
def _div3d_k(
    u: wp.array(dtype=wp.float64, ndim=3),
    v: wp.array(dtype=wp.float64, ndim=3),
    w: wp.array(dtype=wp.float64, ndim=3),
    inv_2dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=3),
):
    i, j, k = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    km = (k - 1 + nz) % nz
    kp = (k + 1) % nz
    out[i, j, k] = (
        (u[ip, j, k] - u[im, j, k]) + (v[i, jp, k] - v[i, jm, k]) + (w[i, j, kp] - w[i, j, km])
    ) * inv_2dx


@wp.kernel
def _jacobi2d_k(
    p_in: wp.array(dtype=wp.float64, ndim=2),
    rhs: wp.array(dtype=wp.float64, ndim=2),
    dx2: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    p_out: wp.array(dtype=wp.float64, ndim=2),
):
    i, j = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    p_out[i, j] = wp.float64(0.25) * (
        p_in[im, j] + p_in[ip, j] + p_in[i, jm] + p_in[i, jp] - dx2 * rhs[i, j]
    )


@wp.kernel
def _jacobi3d_k(
    p_in: wp.array(dtype=wp.float64, ndim=3),
    rhs: wp.array(dtype=wp.float64, ndim=3),
    dx2: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
    p_out: wp.array(dtype=wp.float64, ndim=3),
):
    i, j, k = wp.tid()
    inv6 = wp.float64(1.0) / wp.float64(6.0)  # O-W7: pure-literal f64 normaliser.
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    km = (k - 1 + nz) % nz
    kp = (k + 1) % nz
    p_out[i, j, k] = inv6 * (
        p_in[im, j, k]
        + p_in[ip, j, k]
        + p_in[i, jm, k]
        + p_in[i, jp, k]
        + p_in[i, j, km]
        + p_in[i, j, kp]
        - dx2 * rhs[i, j, k]
    )


@wp.kernel
def _grad_sub_2d_k(
    u: wp.array(dtype=wp.float64, ndim=2),
    v: wp.array(dtype=wp.float64, ndim=2),
    p: wp.array(dtype=wp.float64, ndim=2),
    dt_over_rho: wp.float64,
    inv_2dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    u_out: wp.array(dtype=wp.float64, ndim=2),
    v_out: wp.array(dtype=wp.float64, ndim=2),
):
    i, j = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    dpdx = (p[ip, j] - p[im, j]) * inv_2dx
    dpdy = (p[i, jp] - p[i, jm]) * inv_2dx
    u_out[i, j] = u[i, j] - dt_over_rho * dpdx
    v_out[i, j] = v[i, j] - dt_over_rho * dpdy


@wp.kernel
def _grad_sub_3d_k(
    u: wp.array(dtype=wp.float64, ndim=3),
    v: wp.array(dtype=wp.float64, ndim=3),
    w: wp.array(dtype=wp.float64, ndim=3),
    p: wp.array(dtype=wp.float64, ndim=3),
    dt_over_rho: wp.float64,
    inv_2dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
    u_out: wp.array(dtype=wp.float64, ndim=3),
    v_out: wp.array(dtype=wp.float64, ndim=3),
    w_out: wp.array(dtype=wp.float64, ndim=3),
):
    i, j, k = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    km = (k - 1 + nz) % nz
    kp = (k + 1) % nz
    dpdx = (p[ip, j, k] - p[im, j, k]) * inv_2dx
    dpdy = (p[i, jp, k] - p[i, jm, k]) * inv_2dx
    dpdz = (p[i, j, kp] - p[i, j, km]) * inv_2dx
    u_out[i, j, k] = u[i, j, k] - dt_over_rho * dpdx
    v_out[i, j, k] = v[i, j, k] - dt_over_rho * dpdy
    w_out[i, j, k] = w[i, j, k] - dt_over_rho * dpdz


@wp.kernel
def _curl3d_k(
    u: wp.array(dtype=wp.float64, ndim=3),
    v: wp.array(dtype=wp.float64, ndim=3),
    w: wp.array(dtype=wp.float64, ndim=3),
    inv_2dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
    wx: wp.array(dtype=wp.float64, ndim=3),
    wy: wp.array(dtype=wp.float64, ndim=3),
    wz: wp.array(dtype=wp.float64, ndim=3),
):
    i, j, k = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    km = (k - 1 + nz) % nz
    kp = (k + 1) % nz
    dwdy = (w[i, jp, k] - w[i, jm, k]) * inv_2dx
    dvdz = (v[i, j, kp] - v[i, j, km]) * inv_2dx
    dudz = (u[i, j, kp] - u[i, j, km]) * inv_2dx
    dwdx = (w[ip, j, k] - w[im, j, k]) * inv_2dx
    dvdx = (v[ip, j, k] - v[im, j, k]) * inv_2dx
    dudy = (u[i, jp, k] - u[i, jm, k]) * inv_2dx
    wx[i, j, k] = dwdy - dvdz
    wy[i, j, k] = dudz - dwdx
    wz[i, j, k] = dvdx - dudy


# -- NumPy-marshalling wrappers (Phase-1 public API verbatim) ------------------


def _f64(arr: np.ndarray) -> wp.array:
    return wp.from_numpy(np.ascontiguousarray(arr, dtype=np.float64), dtype=wp.float64)


def semi_lagrangian_advect_2d(
    field: Array2D, u: Array2D, v: Array2D, dt: float, dx: float
) -> Array2D:
    """Bilinear semi-Lagrangian backtrace on a periodic 2D grid (Warp)."""
    nx, ny = field.shape
    with wp.ScopedDevice(_DEVICE):
        out = wp.zeros((nx, ny), dtype=wp.float64)
        wp.launch(
            _sl_advect_2d_k,
            dim=(nx, ny),
            inputs=[
                _f64(field),
                _f64(u),
                _f64(v),
                wp.float64(dt),
                wp.float64(dx),
                wp.int32(nx),
                wp.int32(ny),
                out,
            ],
        )
        wp.synchronize()
        return out.numpy()


def semi_lagrangian_advect_3d(
    field: Array3D, u: Array3D, v: Array3D, w: Array3D, dt: float, dx: float
) -> Array3D:
    """Trilinear semi-Lagrangian backtrace on a periodic 3D grid (Warp)."""
    nx, ny, nz = field.shape
    with wp.ScopedDevice(_DEVICE):
        out = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wp.launch(
            _sl_advect_3d_k,
            dim=(nx, ny, nz),
            inputs=[
                _f64(field),
                _f64(u),
                _f64(v),
                _f64(w),
                wp.float64(dt),
                wp.float64(dx),
                wp.int32(nx),
                wp.int32(ny),
                wp.int32(nz),
                out,
            ],
        )
        wp.synchronize()
        return out.numpy()


def maccormack_advect_2d(field: Array2D, u: Array2D, v: Array2D, dt: float, dx: float) -> Array2D:
    """MacCormack-corrected semi-Lagrangian advection (2D periodic).

    Predictor-corrector: ``f_pred = SL(+dt)``; ``f_back = SL(f_pred, -dt)``;
    ``f^{n+1} = f_pred + 0.5*(field - f_back)``. The combine is host NumPy on the
    kernel outputs (matches the Phase-1 reference's NumPy combine verbatim).
    """
    f_pred = semi_lagrangian_advect_2d(field, u, v, dt, dx)
    f_corr_back = semi_lagrangian_advect_2d(f_pred, u, v, -dt, dx)
    error = 0.5 * (field - f_corr_back)
    return f_pred + error


def _laplacian_5point_periodic(field: Array2D, inv_dx2: float) -> Array2D:
    """5-point centered Laplacian on a 2D periodic grid (Warp)."""
    nx, ny = field.shape
    with wp.ScopedDevice(_DEVICE):
        out = wp.zeros((nx, ny), dtype=wp.float64)
        wp.launch(
            _lap5_k,
            dim=(nx, ny),
            inputs=[_f64(field), wp.float64(inv_dx2), wp.int32(nx), wp.int32(ny), out],
        )
        wp.synchronize()
        return out.numpy()


def _laplacian_7point_periodic(field: Array3D, inv_dx2: float) -> Array3D:
    """7-point centered Laplacian on a 3D periodic grid (Warp)."""
    nx, ny, nz = field.shape
    with wp.ScopedDevice(_DEVICE):
        out = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wp.launch(
            _lap7_k,
            dim=(nx, ny, nz),
            inputs=[
                _f64(field),
                wp.float64(inv_dx2),
                wp.int32(nx),
                wp.int32(ny),
                wp.int32(nz),
                out,
            ],
        )
        wp.synchronize()
        return out.numpy()


def _divergence_2d_periodic(u: Array2D, v: Array2D, dx: float) -> Array2D:
    """Periodic 2D divergence -- 2nd-order centered differences (Warp)."""
    nx, ny = u.shape
    with wp.ScopedDevice(_DEVICE):
        out = wp.zeros((nx, ny), dtype=wp.float64)
        wp.launch(
            _div2d_k,
            dim=(nx, ny),
            inputs=[_f64(u), _f64(v), wp.float64(0.5 / dx), wp.int32(nx), wp.int32(ny), out],
        )
        wp.synchronize()
        return out.numpy()


def _divergence_3d_periodic(u: Array3D, v: Array3D, w: Array3D, dx: float) -> Array3D:
    """Periodic 3D divergence -- 2nd-order centered differences (Warp)."""
    nx, ny, nz = u.shape
    with wp.ScopedDevice(_DEVICE):
        out = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wp.launch(
            _div3d_k,
            dim=(nx, ny, nz),
            inputs=[
                _f64(u),
                _f64(v),
                _f64(w),
                wp.float64(0.5 / dx),
                wp.int32(nx),
                wp.int32(ny),
                wp.int32(nz),
                out,
            ],
        )
        wp.synchronize()
        return out.numpy()


def project_pressure(
    u: Array2D, v: Array2D, params: dict[str, Any], n_iter: int | None = None
) -> tuple[Array2D, Array2D, Array2D]:
    """Jacobi pressure-projection on a 2D periodic grid (Warp). Returns (u, v, p)."""
    if n_iter is None:
        n_iter = int(params.get("n_jacobi", _DEFAULT_N_JACOBI))
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    dx2 = dx * dx
    nx, ny = u.shape
    div = _divergence_2d_periodic(u, v, dx)
    rhs = (rho / dt) * div
    with wp.ScopedDevice(_DEVICE):
        rhs_w = _f64(rhs)
        p_a = wp.zeros((nx, ny), dtype=wp.float64)
        p_b = wp.zeros((nx, ny), dtype=wp.float64)
        uw = _f64(u)
        vw = _f64(v)
        p_src, p_dst = p_a, p_b
        for _ in range(n_iter):
            wp.launch(
                _jacobi2d_k,
                dim=(nx, ny),
                inputs=[p_src, rhs_w, wp.float64(dx2), wp.int32(nx), wp.int32(ny), p_dst],
            )
            p_src, p_dst = p_dst, p_src
        u_out = wp.zeros((nx, ny), dtype=wp.float64)
        v_out = wp.zeros((nx, ny), dtype=wp.float64)
        wp.launch(
            _grad_sub_2d_k,
            dim=(nx, ny),
            inputs=[
                uw,
                vw,
                p_src,
                wp.float64(dt / rho),
                wp.float64(0.5 / dx),
                wp.int32(nx),
                wp.int32(ny),
                u_out,
                v_out,
            ],
        )
        wp.synchronize()
        return u_out.numpy(), v_out.numpy(), p_src.numpy()


def project_pressure_3d(
    u: Array3D, v: Array3D, w: Array3D, params: dict[str, Any], n_iter: int | None = None
) -> tuple[Array3D, Array3D, Array3D, Array3D]:
    """Jacobi pressure-projection on a 3D periodic grid (Warp). Returns (u, v, w, p)."""
    if n_iter is None:
        n_iter = int(params.get("n_jacobi", _DEFAULT_N_JACOBI))
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    dx2 = dx * dx
    nx, ny, nz = u.shape
    div = _divergence_3d_periodic(u, v, w, dx)
    rhs = (rho / dt) * div
    with wp.ScopedDevice(_DEVICE):
        rhs_w = _f64(rhs)
        p_a = wp.zeros((nx, ny, nz), dtype=wp.float64)
        p_b = wp.zeros((nx, ny, nz), dtype=wp.float64)
        uw = _f64(u)
        vw = _f64(v)
        ww = _f64(w)
        p_src, p_dst = p_a, p_b
        for _ in range(n_iter):
            wp.launch(
                _jacobi3d_k,
                dim=(nx, ny, nz),
                inputs=[
                    p_src,
                    rhs_w,
                    wp.float64(dx2),
                    wp.int32(nx),
                    wp.int32(ny),
                    wp.int32(nz),
                    p_dst,
                ],
            )
            p_src, p_dst = p_dst, p_src
        u_out = wp.zeros((nx, ny, nz), dtype=wp.float64)
        v_out = wp.zeros((nx, ny, nz), dtype=wp.float64)
        w_out = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wp.launch(
            _grad_sub_3d_k,
            dim=(nx, ny, nz),
            inputs=[
                uw,
                vw,
                ww,
                p_src,
                wp.float64(dt / rho),
                wp.float64(0.5 / dx),
                wp.int32(nx),
                wp.int32(ny),
                wp.int32(nz),
                u_out,
                v_out,
                w_out,
            ],
        )
        wp.synchronize()
        return u_out.numpy(), v_out.numpy(), w_out.numpy(), p_src.numpy()


def _curl_3d_periodic(
    u: Array3D, v: Array3D, w: Array3D, dx: float
) -> tuple[Array3D, Array3D, Array3D]:
    """Periodic 3D curl via centered differences (Warp). Returns (w_x, w_y, w_z)."""
    nx, ny, nz = u.shape
    with wp.ScopedDevice(_DEVICE):
        wx = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wy = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wz = wp.zeros((nx, ny, nz), dtype=wp.float64)
        wp.launch(
            _curl3d_k,
            dim=(nx, ny, nz),
            inputs=[
                _f64(u),
                _f64(v),
                _f64(w),
                wp.float64(0.5 / dx),
                wp.int32(nx),
                wp.int32(ny),
                wp.int32(nz),
                wx,
                wy,
                wz,
            ],
        )
        wp.synchronize()
        return wx.numpy(), wy.numpy(), wz.numpy()


def _vorticity_confinement_3d(
    u: Array3D, v: Array3D, w: Array3D, eps: float, dx: float
) -> tuple[Array3D, Array3D, Array3D]:
    """Fedkiw-2001 vorticity confinement force. eps==0 -> zeros (canonical)."""
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
    """One 2D Stam stable-fluids step on a periodic grid (Warp). Returns (u, v, p)."""
    del p  # unused -- pass-through per the Phase-1 contract.
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
    return project_pressure(u_adv, v_adv, params)


def stable_fluids_step_3d(
    u: Array3D,
    v: Array3D,
    w: Array3D,
    density: Array3D,
    params: dict[str, Any],
) -> tuple[Array3D, Array3D, Array3D, Array3D, Array3D]:
    """One 3D Stam-Fedkiw step (velocity + scalar smoke density), Warp.

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
    "_DEFAULT_N_JACOBI",
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
