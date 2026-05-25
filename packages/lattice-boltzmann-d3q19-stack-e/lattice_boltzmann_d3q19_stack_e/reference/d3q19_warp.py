"""NVIDIA Warp D3Q19 BGK reference for the Stack-E port.

spec-ref-stack-e.md section 5. Content-equivalent Warp ``@wp.kernel`` port of the
Phase-1 NumPy reference
``packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/{equilibrium,bgk}.py``:
the equilibrium polynomial (Qian-d'Humieres-Lallemand 1992 eq. 3a), the BGK
collision with Guo-2002 body forcing, integer-offset streaming, and half-way
bounce-back y-walls. NumPy arrays flow in and out; the hot kernels (equilibrium,
moment reductions, collision, streaming) run as ``@wp.kernel`` over an own
``wp.array(dtype=wp.float64, ndim=4)`` distribution (D7 socket-only + D8/D15 own
f64 arrays -- common-warp's f32-pinned single-component Grids cannot hold a
19-component f64 lattice; warp.md section 6.1 / 6.2 f64-principle, third instance).

BIT-EXACTNESS (D10; shape (a); LOAD-BEARING): the in-kernel equilibrium uses the
Phase-1 ``feq_field`` RECIPROCAL operand order
(``cu*inv_cs2 + cu*cu*inv_two_cs4 - u_sq*inv_two_cs2`` with precomputed f64
c_s^2-constants), NOT the division form -- Stage-0 Task 0.2 MEASURED this Warp f64
collision reproduces the NumPy reference byte-for-byte (max_abs_err=0.0), whereas
the Stack-D Taichi port's division form gave shape (b) ~6e-15. Every reduction
accumulator is seeded ``wp.float64(0.0)``; every pure-literal is ``wp.float64(...)``
(O-W7: Warp infers f32 for bare literals; the f32 downcast would destroy the 1e-5
gate-14 budget). The single fused collide kernel handles BOTH the forced
(Poiseuille) and force-free (Couette) paths: a zero force array gives
``mx/rs + (0.5*0)/rs == mx/rs`` and a zero Guo term, bit-identical to the
force-free reference path.

DETERMINISM (D9): every per-direction loop iterates fixed ``for d in range(19)``
lex order over ``C`` (pure-int index; R-LBME7); Warp's CPU ``wp.launch`` is
single-threaded serial over the launch dimension; no ``wp.atomic_add``
(``atomic_ops=False``); no RNG (analytic Poiseuille/Couette rest ICs). Integer-
offset streaming is a pure positive-modulus index gather (no FP), bit-exact vs the
``np.roll`` oracle. Bounce-back + macroscopic-velocity recovery are pure NumPy
glue (value reflection + a linear moving-wall momentum injection + the
``(rho*u + 0.5*F)/rho`` recovery), ported verbatim from the Phase-1 reference for
cross-stack-equivalence parity (the Stack-D precedent). O-W6: this kernel module
omits ``from __future__ import annotations``.
"""

from typing import Final

import common_warp
import numpy as np
import warp as wp
from numpy.typing import NDArray

from .constants import CS2, VELOCITIES, WEIGHTS, C, W

# f64 c_s^2-derived constants, precomputed host-side with the EXACT Phase-1
# expressions so the kernel constants are bit-identical to the NumPy reference
# (feq_field: inv_cs2 / inv_two_cs4 / inv_two_cs2; Guo: inv_cs2 / inv_cs4).
_INV_CS2: Final[float] = 1.0 / CS2
_INV_CS4: Final[float] = 1.0 / (CS2 * CS2)
_INV_TWO_CS4: Final[float] = 1.0 / (2.0 * CS2 * CS2)
_INV_TWO_CS2: Final[float] = 1.0 / (2.0 * CS2)

_C32: Final[NDArray[np.int32]] = C.astype(np.int32)
_W64: Final[NDArray[np.float64]] = W.astype(np.float64)

# Opposite-direction map per the canonical D3Q19 ordering (c_i = -c_opp[i]);
# ported verbatim from the Phase-1 reference bgk.py for bounce-back.
_OPP: Final[NDArray[np.int64]] = np.array(
    [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15, 18, 17],
    dtype=np.int64,
)

_DEVICE: Final[str] = "cpu"
_WARP_INITIALIZED = False


def _ensure_warp() -> None:
    """Initialise Warp (idempotent) via the common-warp socket, device='cpu'.

    The LBM kernels consume NO ``wp.rand`` surface and the ICs are analytic, so a
    fixed CPU init is sufficient; the sim runners additionally pin
    ``set_warp_deterministic`` + ``deterministic_context`` (sim.py).
    """
    global _WARP_INITIALIZED
    if _WARP_INITIALIZED:
        return
    common_warp.init(_DEVICE)
    _WARP_INITIALIZED = True


# --------------------------------------------------------------------------
# Warp kernels (own wp.array(dtype=wp.float64); wp.float64(0.0) reduction seeds).
# --------------------------------------------------------------------------
@wp.kernel
def _k_feq_field(
    f_eq: wp.array(dtype=wp.float64, ndim=4),
    rho: wp.array(dtype=wp.float64, ndim=3),
    u: wp.array(dtype=wp.float64, ndim=4),
    cvec: wp.array(dtype=wp.int32, ndim=2),
    w: wp.array(dtype=wp.float64, ndim=1),
    inv_cs2: wp.float64,
    inv_two_cs4: wp.float64,
    inv_two_cs2: wp.float64,
):
    x, y, z = wp.tid()
    ux = u[0, x, y, z]
    uy = u[1, x, y, z]
    uz = u[2, x, y, z]
    u_sq = ux * ux + uy * uy + uz * uz
    r = rho[x, y, z]
    for d in range(19):
        cu = wp.float64(cvec[d, 0]) * ux + wp.float64(cvec[d, 1]) * uy + wp.float64(cvec[d, 2]) * uz
        f_eq[d, x, y, z] = (
            w[d] * r * (wp.float64(1.0) + cu * inv_cs2 + cu * cu * inv_two_cs4 - u_sq * inv_two_cs2)
        )


@wp.kernel
def _k_density_field(
    f: wp.array(dtype=wp.float64, ndim=4),
    rho: wp.array(dtype=wp.float64, ndim=3),
):
    x, y, z = wp.tid()
    acc = wp.float64(0.0)  # f64 accumulator seed (Stage-0 R-A1).
    for d in range(19):
        acc = acc + f[d, x, y, z]
    rho[x, y, z] = acc


@wp.kernel
def _k_momentum_field(
    f: wp.array(dtype=wp.float64, ndim=4),
    cvec: wp.array(dtype=wp.int32, ndim=2),
    mom: wp.array(dtype=wp.float64, ndim=4),
):
    x, y, z = wp.tid()
    mx = wp.float64(0.0)
    my = wp.float64(0.0)
    mz = wp.float64(0.0)
    for d in range(19):
        fd = f[d, x, y, z]
        mx = mx + wp.float64(cvec[d, 0]) * fd
        my = my + wp.float64(cvec[d, 1]) * fd
        mz = mz + wp.float64(cvec[d, 2]) * fd
    mom[0, x, y, z] = mx
    mom[1, x, y, z] = my
    mom[2, x, y, z] = mz


@wp.kernel
def _k_collide_guo(
    f: wp.array(dtype=wp.float64, ndim=4),
    f_post: wp.array(dtype=wp.float64, ndim=4),
    cvec: wp.array(dtype=wp.int32, ndim=2),
    w: wp.array(dtype=wp.float64, ndim=1),
    force: wp.array(dtype=wp.float64, ndim=4),
    tau: wp.float64,
    inv_cs2: wp.float64,
    inv_cs4: wp.float64,
    inv_two_cs4: wp.float64,
    inv_two_cs2: wp.float64,
):
    x, y, z = wp.tid()
    # --- 19-term moment reductions (lex; f64 seeds) ---
    r = wp.float64(0.0)
    mx = wp.float64(0.0)
    my = wp.float64(0.0)
    mz = wp.float64(0.0)
    for d in range(19):
        fd = f[d, x, y, z]
        r = r + fd
        mx = mx + wp.float64(cvec[d, 0]) * fd
        my = my + wp.float64(cvec[d, 1]) * fd
        mz = mz + wp.float64(cvec[d, 2]) * fd
    rs = wp.max(r, wp.float64(1e-30))
    fx = force[0, x, y, z]
    fy = force[1, x, y, z]
    fz = force[2, x, y, z]
    half = wp.float64(0.5)
    # Guo half-step velocity shift: u_eq = mom/rho_safe + 0.5*F/rho_safe (matches
    # the Phase-1 u_pre + 0.5*force/rho_safe; force-free path adds 0.0 exactly).
    ux = mx / rs + half * fx / rs
    uy = my / rs + half * fy / rs
    uz = mz / rs + half * fz / rs
    u_sq = ux * ux + uy * uy + uz * uz
    pref = wp.float64(1.0) - half / tau
    for d in range(19):
        cd0 = wp.float64(cvec[d, 0])
        cd1 = wp.float64(cvec[d, 1])
        cd2 = wp.float64(cvec[d, 2])
        cu = cd0 * ux + cd1 * uy + cd2 * uz
        # feq uses the RAW density r (NOT rho_safe), matching Phase-1 feq_field.
        feq = (
            w[d] * r * (wp.float64(1.0) + cu * inv_cs2 + cu * cu * inv_two_cs4 - u_sq * inv_two_cs2)
        )
        fd = f[d, x, y, z]
        relaxed = fd - (fd - feq) / tau
        tx = (cd0 - ux) * inv_cs2 + cu * cd0 * inv_cs4
        ty = (cd1 - uy) * inv_cs2 + cu * cd1 * inv_cs4
        tz = (cd2 - uz) * inv_cs2 + cu * cd2 * inv_cs4
        force_i = pref * w[d] * (tx * fx + ty * fy + tz * fz)
        f_post[d, x, y, z] = relaxed + force_i


@wp.kernel
def _k_stream(
    f: wp.array(dtype=wp.float64, ndim=4),
    f_out: wp.array(dtype=wp.float64, ndim=4),
    cvec: wp.array(dtype=wp.int32, ndim=2),
    nx: wp.int32,
    ny: wp.int32,
    nz: wp.int32,
):
    d, x, y, z = wp.tid()
    # Positive-modulus gather == np.roll(f[d], shift=c_d): result[x] = f[x - c_d].
    sx = ((x - cvec[d, 0]) % nx + nx) % nx
    sy = ((y - cvec[d, 1]) % ny + ny) % ny
    sz = ((z - cvec[d, 2]) % nz + nz) % nz
    f_out[d, x, y, z] = f[d, sx, sy, sz]


# --------------------------------------------------------------------------
# Point-eval surface (pure NumPy; gate-4a golden + gate-11 PBT). Ported VERBATIM
# from the Phase-1 reference equilibrium.py -- the golden / PBT verification
# surface (NOT the sim hot path), kept identical to the frozen reference so the
# abs=1e-15 golden + the FP-residual PBT pass exactly as Phase-1.
# --------------------------------------------------------------------------
def feq(rho, u):
    """Return the 19 f_i^eq values at (rho, u) as a list[float] (Qian 1992 eq 3a)."""
    ux, uy, uz = float(u[0]), float(u[1]), float(u[2])
    u_sq = ux * ux + uy * uy + uz * uz
    out: list[float] = []
    rho_f = float(rho)
    for c, w in zip(VELOCITIES, WEIGHTS, strict=True):
        cu = c[0] * ux + c[1] * uy + c[2] * uz
        out.append(
            w * rho_f * (1.0 + cu / CS2 + (cu * cu) / (2.0 * CS2 * CS2) - u_sq / (2.0 * CS2))
        )
    return out


def density_moment(f):
    """Sum-of-distributions; recovers rho identically (algebraic.md section 4)."""
    return float(sum(f))


def momentum_moment(f):
    """Direction-weighted sum; recovers rho*u as a 3-list (algebraic.md section 4)."""
    mx, my, mz = 0.0, 0.0, 0.0
    for i, fi in enumerate(f):
        mx += VELOCITIES[i][0] * float(fi)
        my += VELOCITIES[i][1] * float(fi)
        mz += VELOCITIES[i][2] * float(fi)
    return [mx, my, mz]


# --------------------------------------------------------------------------
# Field surface (Warp-backed; NumPy in/out; signatures mirror the Phase-1 reference).
# --------------------------------------------------------------------------
def feq_field(rho: NDArray[np.float64], u: NDArray[np.float64]) -> NDArray[np.float64]:
    """Vectorized equilibrium on a (Nx,Ny,Nz) grid; returns (19,Nx,Ny,Nz)."""
    _ensure_warp()
    rho_c = np.ascontiguousarray(rho, dtype=np.float64)
    u_c = np.ascontiguousarray(u, dtype=np.float64)
    nx, ny, nz = rho_c.shape
    rho_d = wp.from_numpy(rho_c, dtype=wp.float64, device=_DEVICE)
    u_d = wp.from_numpy(u_c, dtype=wp.float64, device=_DEVICE)
    c_d = wp.from_numpy(_C32, dtype=wp.int32, device=_DEVICE)
    w_d = wp.from_numpy(_W64, dtype=wp.float64, device=_DEVICE)
    f_eq = wp.zeros(shape=(19, nx, ny, nz), dtype=wp.float64, device=_DEVICE)
    wp.launch(
        _k_feq_field,
        dim=(nx, ny, nz),
        inputs=[
            f_eq,
            rho_d,
            u_d,
            c_d,
            w_d,
            wp.float64(_INV_CS2),
            wp.float64(_INV_TWO_CS4),
            wp.float64(_INV_TWO_CS2),
        ],
        device=_DEVICE,
    )
    wp.synchronize()
    return f_eq.numpy()


def density_field(f: NDArray[np.float64]) -> NDArray[np.float64]:
    """Sum-over-directions; returns (Nx,Ny,Nz) density field."""
    _ensure_warp()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    _, nx, ny, nz = arr.shape
    f_d = wp.from_numpy(arr, dtype=wp.float64, device=_DEVICE)
    rho_d = wp.zeros(shape=(nx, ny, nz), dtype=wp.float64, device=_DEVICE)
    wp.launch(_k_density_field, dim=(nx, ny, nz), inputs=[f_d, rho_d], device=_DEVICE)
    wp.synchronize()
    return rho_d.numpy()


def momentum_field(f: NDArray[np.float64]) -> NDArray[np.float64]:
    """Direction-weighted sum; returns (3,Nx,Ny,Nz) momentum field."""
    _ensure_warp()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    _, nx, ny, nz = arr.shape
    f_d = wp.from_numpy(arr, dtype=wp.float64, device=_DEVICE)
    c_d = wp.from_numpy(_C32, dtype=wp.int32, device=_DEVICE)
    mom_d = wp.zeros(shape=(3, nx, ny, nz), dtype=wp.float64, device=_DEVICE)
    wp.launch(_k_momentum_field, dim=(nx, ny, nz), inputs=[f_d, c_d, mom_d], device=_DEVICE)
    wp.synchronize()
    return mom_d.numpy()


def stream(f_post: NDArray[np.float64]) -> NDArray[np.float64]:
    """Streaming: propagate each direction by its c_i (periodic positive-mod gather)."""
    _ensure_warp()
    arr = np.ascontiguousarray(f_post, dtype=np.float64)
    _, nx, ny, nz = arr.shape
    f_d = wp.from_numpy(arr, dtype=wp.float64, device=_DEVICE)
    c_d = wp.from_numpy(_C32, dtype=wp.int32, device=_DEVICE)
    out_d = wp.zeros(shape=(19, nx, ny, nz), dtype=wp.float64, device=_DEVICE)
    wp.launch(_k_stream, dim=(19, nx, ny, nz), inputs=[f_d, out_d, c_d, nx, ny, nz], device=_DEVICE)
    wp.synchronize()
    return out_d.numpy()


def bgk_step(
    f: NDArray[np.float64],
    tau: float,
    force_lattice: NDArray[np.float64] | None = None,
) -> NDArray[np.float64]:
    """One BGK collision (+ optional Guo forcing) + streaming step.

    Mirrors the Phase-1 ``bgk.bgk_step`` signature + semantics: moments are
    recovered (f64-seeded lex reduction), the Guo half-step velocity shift +
    body-force term are applied (zero force gives the force-free path
    bit-identically), then the post-collision distribution is streamed. Returns a
    new (19,Nx,Ny,Nz) array.
    """
    _ensure_warp()
    arr = np.ascontiguousarray(f, dtype=np.float64)
    _, nx, ny, nz = arr.shape
    if force_lattice is None:
        force = np.zeros((3, nx, ny, nz), dtype=np.float64)
    else:
        force = np.ascontiguousarray(force_lattice, dtype=np.float64)
    f_d = wp.from_numpy(arr, dtype=wp.float64, device=_DEVICE)
    force_d = wp.from_numpy(force, dtype=wp.float64, device=_DEVICE)
    c_d = wp.from_numpy(_C32, dtype=wp.int32, device=_DEVICE)
    w_d = wp.from_numpy(_W64, dtype=wp.float64, device=_DEVICE)
    f_post_d = wp.zeros(shape=(19, nx, ny, nz), dtype=wp.float64, device=_DEVICE)
    f_str_d = wp.zeros(shape=(19, nx, ny, nz), dtype=wp.float64, device=_DEVICE)
    wp.launch(
        _k_collide_guo,
        dim=(nx, ny, nz),
        inputs=[
            f_d,
            f_post_d,
            c_d,
            w_d,
            force_d,
            wp.float64(float(tau)),
            wp.float64(_INV_CS2),
            wp.float64(_INV_CS4),
            wp.float64(_INV_TWO_CS4),
            wp.float64(_INV_TWO_CS2),
        ],
        device=_DEVICE,
    )
    wp.launch(
        _k_stream, dim=(19, nx, ny, nz), inputs=[f_post_d, f_str_d, c_d, nx, ny, nz], device=_DEVICE
    )
    wp.synchronize()
    return f_str_d.numpy()


def macroscopic_velocity(
    f: NDArray[np.float64], force_lattice: NDArray[np.float64] | None = None
) -> NDArray[np.float64]:
    """Recover macroscopic velocity u = (rho*u + 0.5*F) / rho (Guo 2002 eq 16).

    Pure NumPy glue over the Warp-backed moment fields, ported verbatim from the
    Phase-1 reference (cross-stack-equivalence parity)."""
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

    Ported verbatim from the Phase-1 NumPy reference: distributions pointing into
    a wall are swapped to their opposite-direction index; a moving wall adds
    -2 w_i rho (c_i . u_wall) / c_s^2 (Kruger 2017 Ch. 5 section 5.3.4). Pure
    value-reflection + linear momentum injection (no reduction), so it is
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
