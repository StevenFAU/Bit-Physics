"""Taichi-DSL D3Q19 BGK reference for the Stack-D port.

Spec-ref-stack-d.md section 5. Ported from the Phase-1 NumPy reference
``packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/{equilibrium,bgk}.py``:
the equilibrium polynomial (Qian-d'Humieres-Lallemand 1992 eq. 3a), the BGK
collision with Guo-2002 body forcing, integer-offset streaming, and half-way
bounce-back y-walls. NumPy arrays flow in and out; the hot kernels (equilibrium,
moment reductions, collision, streaming) run as ``@ti.kernel`` over
``ti.types.ndarray`` views (the RD-2D / sph-water Stack-D pattern).

Module-level discipline (Taichi-integration IC-12):

- NO ``from __future__ import annotations`` -- Taichi's ``@ti.kernel`` AST
  transformer resolves argument-type annotations at decoration time; PEP 563
  stringification breaks it (IC-12 section 4.2, R-T2; Stage-0 surfaced a live
  empirical witness).
- NO ``-> None`` return annotation on any ``@ti.kernel`` (IC-12 section 4.6,
  R-T4).

f64 PRECISION (Stage-0 banked, LOAD-BEARING): ``set_taichi_deterministic`` pins
arch + threads + seed + offline_cache but NOT ``default_fp=ti.f64``; bare ``0.0``
kernel locals infer f32 and leaked 3.4e-6 in the 19-term moment reduction at the
Stage-0 derisk. Every in-kernel reduction accumulator is therefore seeded
explicitly as ``ti.f64(0.0)`` (the per-direction loop operands are read from
f64 ``ti.types.ndarray`` views, so the running sum stays f64). LBM is the first
cross-stack port with genuine in-kernel f64 reductions (D9: the collision-step
FP-accumulation is the cross-stack-non-trivial surface).

Determinism: every per-direction loop iterates in fixed ``ti.static(range(19))``
lex order over ``C``; ``ti.ndrange`` is row-major; ``cpu_max_num_threads=1`` (from
``set_taichi_deterministic``) serialises the cell loops. Integer-offset streaming
is a pure index gather (no FP), bit-exact vs the ``np.roll`` oracle (Stage-0
verified ``max_abs=0.0``). Bounce-back is value reflection + a linear moving-wall
momentum injection (no reduction), ported from the Phase-1 NumPy reference
verbatim for cross-stack-equivalence parity.
"""

from typing import Final

import numpy as np
import taichi as ti
from common_py.determinism import Config, set_taichi_deterministic
from numpy.typing import NDArray

from .constants import CS2, C, W

_C64: Final[NDArray[np.float64]] = C.astype(np.float64)
_W64: Final[NDArray[np.float64]] = W.astype(np.float64)

# Opposite-direction map per the canonical D3Q19 ordering (c_i = -c_opp[i]);
# ported verbatim from the Phase-1 reference bgk.py for bounce-back.
_OPP: Final[NDArray[np.int64]] = np.array(
    [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15, 18, 17],
    dtype=np.int64,
)

_TAICHI_INITIALIZED = False


def _ensure_taichi() -> None:
    """Initialise Taichi (idempotent) per IC-11 arch='cpu' + determinism.

    Lazy first-use ``ti.init`` via ``set_taichi_deterministic``
    (cpu_max_num_threads=1, offline_cache=True). The seed is irrelevant here:
    the LBM kernels consume NO ``ti.random`` surface and the ICs are analytic
    (Poiseuille/Couette rest-state; D7 + S6 -- seed is cosmetic), so ``seed=0``
    is fine and the runtime is initialised exactly once per process.
    """
    global _TAICHI_INITIALIZED
    if _TAICHI_INITIALIZED:
        return
    set_taichi_deterministic(Config(deterministic=True, seed=0), arch="cpu")
    _TAICHI_INITIALIZED = True


# --------------------------------------------------------------------------
# Taichi kernels (ti.types.ndarray; f64-seeded reductions).
# --------------------------------------------------------------------------
@ti.kernel
def _k_feq_point(
    f_eq: ti.types.ndarray(dtype=ti.f64, ndim=1),
    c: ti.types.ndarray(dtype=ti.f64, ndim=2),
    w: ti.types.ndarray(dtype=ti.f64, ndim=1),
    rho: ti.f64,
    ux: ti.f64,
    uy: ti.f64,
    uz: ti.f64,
    cs2: ti.f64,
):
    u_sq = ux * ux + uy * uy + uz * uz
    for i in ti.static(range(19)):
        cu = c[i, 0] * ux + c[i, 1] * uy + c[i, 2] * uz
        f_eq[i] = w[i] * rho * (1.0 + cu / cs2 + (cu * cu) / (2.0 * cs2 * cs2) - u_sq / (2.0 * cs2))


@ti.kernel
def _k_density_moment_point(
    f: ti.types.ndarray(dtype=ti.f64, ndim=1),
    out: ti.types.ndarray(dtype=ti.f64, ndim=1),
):
    acc = ti.f64(0.0)  # f64 accumulator seed (Stage-0 banked).
    for i in ti.static(range(19)):
        acc += f[i]
    out[0] = acc


@ti.kernel
def _k_momentum_moment_point(
    f: ti.types.ndarray(dtype=ti.f64, ndim=1),
    c: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=1),
):
    mx = ti.f64(0.0)
    my = ti.f64(0.0)
    mz = ti.f64(0.0)
    for i in ti.static(range(19)):
        fi = f[i]
        mx += c[i, 0] * fi
        my += c[i, 1] * fi
        mz += c[i, 2] * fi
    out[0] = mx
    out[1] = my
    out[2] = mz


@ti.kernel
def _k_feq_field(
    f_eq: ti.types.ndarray(dtype=ti.f64, ndim=4),
    rho: ti.types.ndarray(dtype=ti.f64, ndim=3),
    u: ti.types.ndarray(dtype=ti.f64, ndim=4),
    c: ti.types.ndarray(dtype=ti.f64, ndim=2),
    w: ti.types.ndarray(dtype=ti.f64, ndim=1),
    cs2: ti.f64,
):
    for x, y, z in ti.ndrange(rho.shape[0], rho.shape[1], rho.shape[2]):
        ux = u[0, x, y, z]
        uy = u[1, x, y, z]
        uz = u[2, x, y, z]
        u_sq = ux * ux + uy * uy + uz * uz
        r = rho[x, y, z]
        for i in ti.static(range(19)):
            cu = c[i, 0] * ux + c[i, 1] * uy + c[i, 2] * uz
            f_eq[i, x, y, z] = (
                w[i] * r * (1.0 + cu / cs2 + (cu * cu) / (2.0 * cs2 * cs2) - u_sq / (2.0 * cs2))
            )


@ti.kernel
def _k_density_field(
    f: ti.types.ndarray(dtype=ti.f64, ndim=4),
    rho: ti.types.ndarray(dtype=ti.f64, ndim=3),
):
    for x, y, z in ti.ndrange(rho.shape[0], rho.shape[1], rho.shape[2]):
        acc = ti.f64(0.0)  # f64 accumulator seed (Stage-0 banked).
        for i in ti.static(range(19)):
            acc += f[i, x, y, z]
        rho[x, y, z] = acc


@ti.kernel
def _k_momentum_field(
    f: ti.types.ndarray(dtype=ti.f64, ndim=4),
    c: ti.types.ndarray(dtype=ti.f64, ndim=2),
    mom: ti.types.ndarray(dtype=ti.f64, ndim=4),
):
    for x, y, z in ti.ndrange(f.shape[1], f.shape[2], f.shape[3]):
        mx = ti.f64(0.0)
        my = ti.f64(0.0)
        mz = ti.f64(0.0)
        for i in ti.static(range(19)):
            fi = f[i, x, y, z]
            mx += c[i, 0] * fi
            my += c[i, 1] * fi
            mz += c[i, 2] * fi
        mom[0, x, y, z] = mx
        mom[1, x, y, z] = my
        mom[2, x, y, z] = mz


@ti.kernel
def _k_collide_guo(
    f: ti.types.ndarray(dtype=ti.f64, ndim=4),
    f_post: ti.types.ndarray(dtype=ti.f64, ndim=4),
    c: ti.types.ndarray(dtype=ti.f64, ndim=2),
    w: ti.types.ndarray(dtype=ti.f64, ndim=1),
    force: ti.types.ndarray(dtype=ti.f64, ndim=4),
    tau: ti.f64,
    cs2: ti.f64,
):
    for x, y, z in ti.ndrange(f.shape[1], f.shape[2], f.shape[3]):
        r = ti.f64(0.0)
        mx = ti.f64(0.0)
        my = ti.f64(0.0)
        mz = ti.f64(0.0)
        for i in ti.static(range(19)):
            fi = f[i, x, y, z]
            r += fi
            mx += c[i, 0] * fi
            my += c[i, 1] * fi
            mz += c[i, 2] * fi
        rs = ti.max(r, 1e-30)
        fx = force[0, x, y, z]
        fy = force[1, x, y, z]
        fz = force[2, x, y, z]
        ux = mx / rs + 0.5 * fx / rs
        uy = my / rs + 0.5 * fy / rs
        uz = mz / rs + 0.5 * fz / rs
        u_sq = ux * ux + uy * uy + uz * uz
        pref = 1.0 - 0.5 / tau
        for i in ti.static(range(19)):
            cu = c[i, 0] * ux + c[i, 1] * uy + c[i, 2] * uz
            feq = w[i] * r * (1.0 + cu / cs2 + (cu * cu) / (2.0 * cs2 * cs2) - u_sq / (2.0 * cs2))
            tx = (c[i, 0] - ux) / cs2 + cu * c[i, 0] / (cs2 * cs2)
            ty = (c[i, 1] - uy) / cs2 + cu * c[i, 1] / (cs2 * cs2)
            tz = (c[i, 2] - uz) / cs2 + cu * c[i, 2] / (cs2 * cs2)
            force_i = pref * w[i] * (tx * fx + ty * fy + tz * fz)
            f_post[i, x, y, z] = f[i, x, y, z] - (f[i, x, y, z] - feq) / tau + force_i


@ti.kernel
def _k_stream(
    f: ti.types.ndarray(dtype=ti.f64, ndim=4),
    f_out: ti.types.ndarray(dtype=ti.f64, ndim=4),
    c: ti.types.ndarray(dtype=ti.f64, ndim=2),
    nx: ti.i32,
    ny: ti.i32,
    nz: ti.i32,
):
    for i, x, y, z in ti.ndrange(19, nx, ny, nz):
        sx = (x - ti.cast(c[i, 0], ti.i32)) % nx
        sy = (y - ti.cast(c[i, 1], ti.i32)) % ny
        sz = (z - ti.cast(c[i, 2], ti.i32)) % nz
        f_out[i, x, y, z] = f[i, sx, sy, sz]


# --------------------------------------------------------------------------
# Public API (NumPy in/out; signatures mirror the Phase-1 reference).
# --------------------------------------------------------------------------
def feq(rho, u):
    """Return the 19 f_i^eq values at (rho, u) as a list[float] (gate-4a)."""
    _ensure_taichi()
    out = np.zeros(19, dtype=np.float64)
    _k_feq_point(out, _C64, _W64, float(rho), float(u[0]), float(u[1]), float(u[2]), CS2)
    return out.tolist()


def density_moment(f):
    """Sum-of-distributions; recovers rho (f64-seeded 19-term reduction)."""
    _ensure_taichi()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    out = np.zeros(1, dtype=np.float64)
    _k_density_moment_point(arr, out)
    return float(out[0])


def momentum_moment(f):
    """Direction-weighted sum; recovers rho*u as a 3-list (f64-seeded)."""
    _ensure_taichi()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    out = np.zeros(3, dtype=np.float64)
    _k_momentum_moment_point(arr, _C64, out)
    return out.tolist()


def feq_field(rho: NDArray[np.float64], u: NDArray[np.float64]) -> NDArray[np.float64]:
    """Vectorized equilibrium on a (Nx,Ny,Nz) grid; returns (19,Nx,Ny,Nz)."""
    _ensure_taichi()
    rho_c = np.ascontiguousarray(rho, dtype=np.float64)
    u_c = np.ascontiguousarray(u, dtype=np.float64)
    f_eq = np.empty((19, *rho_c.shape), dtype=np.float64)
    _k_feq_field(f_eq, rho_c, u_c, _C64, _W64, CS2)
    return f_eq


def density_field(f: NDArray[np.float64]) -> NDArray[np.float64]:
    """Sum-over-directions; returns (Nx,Ny,Nz) density field."""
    _ensure_taichi()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    rho = np.empty(arr.shape[1:], dtype=np.float64)
    _k_density_field(arr, rho)
    return rho


def momentum_field(f: NDArray[np.float64]) -> NDArray[np.float64]:
    """Direction-weighted sum; returns (3,Nx,Ny,Nz) momentum field."""
    _ensure_taichi()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    mom = np.empty((3, *arr.shape[1:]), dtype=np.float64)
    _k_momentum_field(arr, _C64, mom)
    return mom


def stream(f_post: NDArray[np.float64]) -> NDArray[np.float64]:
    """Streaming: propagate each direction by its c_i (periodic gather)."""
    _ensure_taichi()
    arr = np.ascontiguousarray(f_post, dtype=np.float64)
    _, nx, ny, nz = arr.shape
    out = np.empty_like(arr)
    _k_stream(arr, out, _C64, nx, ny, nz)
    return out


def bgk_step(
    f: NDArray[np.float64],
    tau: float,
    force_lattice: NDArray[np.float64] | None = None,
) -> NDArray[np.float64]:
    """One BGK collision (+ optional Guo forcing) + streaming step.

    Mirrors the Phase-1 ``bgk.bgk_step`` signature + semantics: moments are
    recovered (f64-seeded), the Guo half-step velocity shift + body-force term
    are applied (zero force gives the force-free path identically), then the
    post-collision distribution is streamed. Returns a new (19,Nx,Ny,Nz) array.
    """
    _ensure_taichi()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    nx, ny, nz = arr.shape[1:]
    if force_lattice is None:
        force = np.zeros((3, nx, ny, nz), dtype=np.float64)
    else:
        force = np.ascontiguousarray(force_lattice, dtype=np.float64)
    f_post = np.empty_like(arr)
    f_str = np.empty_like(arr)
    _k_collide_guo(arr, f_post, _C64, _W64, force, float(tau), CS2)
    _k_stream(f_post, f_str, _C64, nx, ny, nz)
    return f_str


def macroscopic_velocity(
    f: NDArray[np.float64], force_lattice: NDArray[np.float64] | None = None
) -> NDArray[np.float64]:
    """Recover macroscopic velocity u = (rho*u + 0.5*F) / rho (Guo 2002 eq 16)."""
    rho = density_field(f)
    rho_safe = np.maximum(rho, 1e-30)
    mom = momentum_field(f)
    if force_lattice is not None:
        mom = mom + 0.5 * np.ascontiguousarray(force_lattice, dtype=np.float64)
    return mom / rho_safe


def apply_bounce_back_y_walls(
    f: NDArray[np.float64],
    wall_velocity_top: tuple[float, float, float] = (0.0, 0.0, 0.0),
    wall_velocity_bottom: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> NDArray[np.float64]:
    """Half-way bounce-back at y=0 (bottom) and y=Ny-1 (top) walls.

    Ported verbatim from the Phase-1 NumPy reference: distributions pointing
    into a wall are swapped to their opposite-direction index; a moving wall
    adds -2 w_i rho (c_i . u_wall) / c_s^2 (Kruger 2017 Ch. 5 section 5.3.4).
    Pure value-reflection + linear momentum injection (no reduction), so it is
    identical math to the NumPy reference -- cross-stack-equivalence parity.
    """
    out = f.copy()
    for i in range(19):
        if C[i, 1] > 0:  # positive-y direction: bottom wall y=0
            f_opp_at_wall = f[_OPP[i], :, 0, :]
            uw = wall_velocity_bottom
            ci_dot_uw = float(C[i, 0]) * uw[0] + float(C[i, 1]) * uw[1] + float(C[i, 2]) * uw[2]
            rho_wall = f[:, :, 0, :].sum(axis=0)
            momentum_inj = -2.0 * W[i] * rho_wall * ci_dot_uw / CS2
            out[i, :, 0, :] = f_opp_at_wall + momentum_inj
        if C[i, 1] < 0:  # negative-y direction: top wall y=Ny-1
            f_opp_at_wall = f[_OPP[i], :, -1, :]
            uw = wall_velocity_top
            ci_dot_uw = float(C[i, 0]) * uw[0] + float(C[i, 1]) * uw[1] + float(C[i, 2]) * uw[2]
            rho_wall = f[:, :, -1, :].sum(axis=0)
            momentum_inj = -2.0 * W[i] * rho_wall * ci_dot_uw / CS2
            out[i, :, -1, :] = f_opp_at_wall + momentum_inj
    return out


__all__ = [
    "apply_bounce_back_y_walls",
    "bgk_step",
    "density_field",
    "density_moment",
    "feq",
    "feq_field",
    "macroscopic_velocity",
    "momentum_field",
    "momentum_moment",
    "stream",
]
