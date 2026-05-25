"""MLS-MPM hot kernels — NVIDIA Warp (Stack-E) port.

Warp ``@wp.kernel`` re-derivation of the Phase-1 NumPy+numba reference
(``packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py``); the
algebraic surface is reproduced VERBATIM (same operation order) so the
cross-stack diff vs the frozen reference stays at FP-round-off (gate-14;
Stage 1c). No Phase-1 import — the CANONICAL_* constants are re-derived here
(isolation per the prior five Stack-D ports).

Stack-E discipline (Stage-0 findings + banked precedents):

- **f64 throughout** (D15 / R-MPME-F64): every ``wp.array`` is
  ``dtype=wp.float64``; every in-kernel numerical literal is seeded
  ``wp.float64(...)`` (banked #7 extended to pure-literal @wp.kernel constants,
  conventions § L.4).
- **Warp CPU serial launch is the determinism mechanism** (D5 / banked #8):
  ``wp.launch`` on the CPU device executes serially over the launch dimension in
  a single thread, so the P2G ``wp.atomic_add`` accumulation order is fixed and
  bit-exact run-to-run — the Warp analog of Taichi ``cpu_max_num_threads=1`` /
  numba ``parallel=False``. No serialisation knob is needed (Stage-0 Task 0.6:
  6/6 bit-identical on the P2G atomic-scatter kernel).
- **O-W7 ``wp.float64()`` taint workaround** (Stage-0 S0-ME1): applying
  ``wp.float64(v)`` to a kernel-local variable taints ``v``'s inferred type. The
  integer base node is derived via ``wp.int32(<float_base>)`` (the float base is
  not reused as an int), and the quadratic-B-spline weights + node offsets are
  packed into ``wp.vec3d`` indexed by the pure-int loop variable — never
  ``wp.float64(di)`` on a variable also used as an int index.
- **Base-node convention** ``base = floor(x/dx + 0.5) - 1`` (golden-pinned at
  ``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``); the
  particle interacts with grid nodes ``base, base+1, base+2``; the offset
  ``fp = fx - base ∈ [0.5, 1.5)``.

Anchors:

- Hu et al. 2018, *ACM TOG* 37(4), DOI 10.1145/3197517.3201293 § 3 (MLS-MPM +
  APIC) + § 5 (neo-Hookean).
- 88-line MLS-MPM reference, https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp
  (citation-only; no vendored code).
- Steffen-Kirby-Berzins 2008, *IJNME* 76(6), DOI 10.1002/nme.2360 § 3 Eq. (15).
"""

from typing import Final

import numpy as np
import warp as wp

# --- Canonical constants (re-derived verbatim from Phase-1; no Phase-1 import) ---
CANONICAL_DESCRIPTOR: Final[str] = "drop-impact-128cube-seed42-step500"
CANONICAL_GRID_N: Final[int] = 128
CANONICAL_N_STEPS: Final[int] = 500
CANONICAL_CAPTURE_INTERVAL: Final[int] = 50
CANONICAL_N_PARTICLES: Final[int] = 1_000_000
CANONICAL_SEED: Final[int] = 42
CANONICAL_GRAVITY_Z: Final[float] = -9.81
CANONICAL_DT: Final[float] = 1.0e-4
CANONICAL_YOUNGS_MODULUS: Final[float] = 4.0e3
CANONICAL_POISSON_RATIO: Final[float] = 0.3
_E: Final[float] = CANONICAL_YOUNGS_MODULUS
_NU: Final[float] = CANONICAL_POISSON_RATIO
CANONICAL_MU: Final[float] = _E / (2.0 * (1.0 + _NU))
CANONICAL_LAMBDA: Final[float] = _E * _NU / ((1.0 + _NU) * (1.0 - 2.0 * _NU))
CANONICAL_BLOB_CENTER: Final[tuple[float, float, float]] = (0.5, 0.5, 0.65)
CANONICAL_BLOB_RADIUS: Final[float] = 0.15
CANONICAL_BLOB_VELOCITY_Z: Final[float] = -2.0
CANONICAL_FLOOR_Z_INDEX: Final[int] = 4

_DEVICE: Final[str] = "cpu"


# --------------------------------------------------------------------------- #
# @wp.func helpers (O-W7: vec3d packing so the int loop variable is never cast) #
# --------------------------------------------------------------------------- #
@wp.func
def _bspline_w(fp: wp.float64) -> wp.vec3d:
    """3-node quadratic B-spline weights for offset ``fp ∈ [0.5, 1.5)``."""
    half = wp.float64(0.5)
    return wp.vec3d(
        half * (wp.float64(1.5) - fp) * (wp.float64(1.5) - fp),
        wp.float64(0.75) - (fp - wp.float64(1.0)) * (fp - wp.float64(1.0)),
        half * (fp - half) * (fp - half),
    )


@wp.func
def _node_off(fp: wp.float64, dx: wp.float64) -> wp.vec3d:
    """Node-minus-particle physical offsets ``(di - fp) * dx`` for di in 0..2."""
    return wp.vec3d(
        (wp.float64(0.0) - fp) * dx,
        (wp.float64(1.0) - fp) * dx,
        (wp.float64(2.0) - fp) * dx,
    )


# --------------------------------------------------------------------------- #
# Kernels                                                                       #
# --------------------------------------------------------------------------- #
@wp.kernel
def _p2g_stress_k(
    pos: wp.array(dtype=wp.float64, ndim=2),
    vel: wp.array(dtype=wp.float64, ndim=2),
    mass: wp.array(dtype=wp.float64),
    affine_c: wp.array(dtype=wp.float64, ndim=3),
    stress: wp.array(dtype=wp.float64, ndim=3),
    volume_p: wp.array(dtype=wp.float64),
    grid_mass: wp.array(dtype=wp.float64, ndim=3),
    grid_mom: wp.array(dtype=wp.float64, ndim=4),
    grid_dx: wp.float64,
    dt: wp.float64,
    grid_n: wp.int32,
):
    p = wp.tid()
    m = mass[p]
    v_p = volume_p[p]
    inv_dx_sq = wp.float64(1.0) / (grid_dx * grid_dx)
    stress_scale = wp.float64(-4.0) * dt * inv_dx_sq
    ws = stress_scale * v_p
    vx = vel[p, 0]
    vy = vel[p, 1]
    vz = vel[p, 2]
    # Effective affine matrix: m*C + ws*stress (Hu-2018 88-line force fold-in).
    eff00 = m * affine_c[p, 0, 0] + ws * stress[p, 0, 0]
    eff01 = m * affine_c[p, 0, 1] + ws * stress[p, 0, 1]
    eff02 = m * affine_c[p, 0, 2] + ws * stress[p, 0, 2]
    eff10 = m * affine_c[p, 1, 0] + ws * stress[p, 1, 0]
    eff11 = m * affine_c[p, 1, 1] + ws * stress[p, 1, 1]
    eff12 = m * affine_c[p, 1, 2] + ws * stress[p, 1, 2]
    eff20 = m * affine_c[p, 2, 0] + ws * stress[p, 2, 0]
    eff21 = m * affine_c[p, 2, 1] + ws * stress[p, 2, 1]
    eff22 = m * affine_c[p, 2, 2] + ws * stress[p, 2, 2]

    fx = pos[p, 0] / grid_dx
    fy = pos[p, 1] / grid_dx
    fz = pos[p, 2] / grid_dx
    fbx = wp.floor(fx + wp.float64(0.5)) - wp.float64(1.0)
    fby = wp.floor(fy + wp.float64(0.5)) - wp.float64(1.0)
    fbz = wp.floor(fz + wp.float64(0.5)) - wp.float64(1.0)
    fpx = fx - fbx
    fpy = fy - fby
    fpz = fz - fbz
    bx = wp.int32(fbx)
    by = wp.int32(fby)
    bz = wp.int32(fbz)
    wx = _bspline_w(fpx)
    wy = _bspline_w(fpy)
    wz = _bspline_w(fpz)
    ox = _node_off(fpx, grid_dx)
    oy = _node_off(fpy, grid_dx)
    oz = _node_off(fpz, grid_dx)

    for di in range(3):
        gi = bx + di
        if gi < 0 or gi >= grid_n:
            continue
        wxv = wx[di]
        dxn = ox[di]
        for dj in range(3):
            gj = by + dj
            if gj < 0 or gj >= grid_n:
                continue
            wyv = wy[dj]
            dyn = oy[dj]
            for dk in range(3):
                gk = bz + dk
                if gk < 0 or gk >= grid_n:
                    continue
                wzv = wz[dk]
                dzn = oz[dk]
                w = wxv * wyv * wzv
                mvx = m * vx + eff00 * dxn + eff01 * dyn + eff02 * dzn
                mvy = m * vy + eff10 * dxn + eff11 * dyn + eff12 * dzn
                mvz = m * vz + eff20 * dxn + eff21 * dyn + eff22 * dzn
                wp.atomic_add(grid_mass, gi, gj, gk, w * m)
                wp.atomic_add(grid_mom, gi, gj, gk, 0, w * mvx)
                wp.atomic_add(grid_mom, gi, gj, gk, 1, w * mvy)
                wp.atomic_add(grid_mom, gi, gj, gk, 2, w * mvz)


@wp.kernel
def _grid_update_k(
    grid_mass: wp.array(dtype=wp.float64, ndim=3),
    grid_mom: wp.array(dtype=wp.float64, ndim=4),
    gravity_z: wp.float64,
    dt: wp.float64,
    floor_z: wp.int32,
    grid_n: wp.int32,
):
    i, j, k = wp.tid()
    m = grid_mass[i, j, k]
    if m <= wp.float64(0.0):
        return
    inv_m = wp.float64(1.0) / m
    vx = grid_mom[i, j, k, 0] * inv_m
    vy = grid_mom[i, j, k, 1] * inv_m
    vz = grid_mom[i, j, k, 2] * inv_m
    vz = vz + gravity_z * dt
    if k <= floor_z:
        vx = wp.float64(0.0)
        vy = wp.float64(0.0)
        vz = wp.float64(0.0)
    if k == 0 and vz < wp.float64(0.0):
        vz = wp.float64(0.0)
    if k == grid_n - 1 and vz > wp.float64(0.0):
        vz = wp.float64(0.0)
    if i == 0 and vx < wp.float64(0.0):
        vx = wp.float64(0.0)
    if i == grid_n - 1 and vx > wp.float64(0.0):
        vx = wp.float64(0.0)
    if j == 0 and vy < wp.float64(0.0):
        vy = wp.float64(0.0)
    if j == grid_n - 1 and vy > wp.float64(0.0):
        vy = wp.float64(0.0)
    grid_mom[i, j, k, 0] = m * vx
    grid_mom[i, j, k, 1] = m * vy
    grid_mom[i, j, k, 2] = m * vz


@wp.kernel
def _g2p_k(
    pos: wp.array(dtype=wp.float64, ndim=2),
    vel_new: wp.array(dtype=wp.float64, ndim=2),
    affine_c_new: wp.array(dtype=wp.float64, ndim=3),
    grid_mom: wp.array(dtype=wp.float64, ndim=4),
    grid_mass: wp.array(dtype=wp.float64, ndim=3),
    grid_dx: wp.float64,
    grid_n: wp.int32,
):
    p = wp.tid()
    affine_scale = wp.float64(4.0) / (grid_dx * grid_dx)
    fx = pos[p, 0] / grid_dx
    fy = pos[p, 1] / grid_dx
    fz = pos[p, 2] / grid_dx
    fbx = wp.floor(fx + wp.float64(0.5)) - wp.float64(1.0)
    fby = wp.floor(fy + wp.float64(0.5)) - wp.float64(1.0)
    fbz = wp.floor(fz + wp.float64(0.5)) - wp.float64(1.0)
    fpx = fx - fbx
    fpy = fy - fby
    fpz = fz - fbz
    bx = wp.int32(fbx)
    by = wp.int32(fby)
    bz = wp.int32(fbz)
    wx = _bspline_w(fpx)
    wy = _bspline_w(fpy)
    wz = _bspline_w(fpz)
    ox = _node_off(fpx, grid_dx)
    oy = _node_off(fpy, grid_dx)
    oz = _node_off(fpz, grid_dx)

    vx_acc = wp.float64(0.0)
    vy_acc = wp.float64(0.0)
    vz_acc = wp.float64(0.0)
    cxx = wp.float64(0.0)
    cxy = wp.float64(0.0)
    cxz = wp.float64(0.0)
    cyx = wp.float64(0.0)
    cyy = wp.float64(0.0)
    cyz = wp.float64(0.0)
    czx = wp.float64(0.0)
    czy = wp.float64(0.0)
    czz = wp.float64(0.0)

    for di in range(3):
        gi = bx + di
        if gi < 0 or gi >= grid_n:
            continue
        wxv = wx[di]
        dxn = ox[di]
        for dj in range(3):
            gj = by + dj
            if gj < 0 or gj >= grid_n:
                continue
            wyv = wy[dj]
            dyn = oy[dj]
            for dk in range(3):
                gk = bz + dk
                if gk < 0 or gk >= grid_n:
                    continue
                wzv = wz[dk]
                dzn = oz[dk]
                w = wxv * wyv * wzv
                m = grid_mass[gi, gj, gk]
                vix = wp.float64(0.0)
                viy = wp.float64(0.0)
                viz = wp.float64(0.0)
                if m > wp.float64(0.0):
                    inv_m = wp.float64(1.0) / m
                    vix = grid_mom[gi, gj, gk, 0] * inv_m
                    viy = grid_mom[gi, gj, gk, 1] * inv_m
                    viz = grid_mom[gi, gj, gk, 2] * inv_m
                vx_acc = vx_acc + w * vix
                vy_acc = vy_acc + w * viy
                vz_acc = vz_acc + w * viz
                cxx = cxx + w * vix * dxn
                cxy = cxy + w * vix * dyn
                cxz = cxz + w * vix * dzn
                cyx = cyx + w * viy * dxn
                cyy = cyy + w * viy * dyn
                cyz = cyz + w * viy * dzn
                czx = czx + w * viz * dxn
                czy = czy + w * viz * dyn
                czz = czz + w * viz * dzn

    vel_new[p, 0] = vx_acc
    vel_new[p, 1] = vy_acc
    vel_new[p, 2] = vz_acc
    affine_c_new[p, 0, 0] = affine_scale * cxx
    affine_c_new[p, 0, 1] = affine_scale * cxy
    affine_c_new[p, 0, 2] = affine_scale * cxz
    affine_c_new[p, 1, 0] = affine_scale * cyx
    affine_c_new[p, 1, 1] = affine_scale * cyy
    affine_c_new[p, 1, 2] = affine_scale * cyz
    affine_c_new[p, 2, 0] = affine_scale * czx
    affine_c_new[p, 2, 1] = affine_scale * czy
    affine_c_new[p, 2, 2] = affine_scale * czz


@wp.kernel
def _deform_k(
    F: wp.array(dtype=wp.float64, ndim=3),
    affine_c: wp.array(dtype=wp.float64, ndim=3),
    dt: wp.float64,
):
    p = wp.tid()
    one = wp.float64(1.0)
    a00 = one + dt * affine_c[p, 0, 0]
    a01 = dt * affine_c[p, 0, 1]
    a02 = dt * affine_c[p, 0, 2]
    a10 = dt * affine_c[p, 1, 0]
    a11 = one + dt * affine_c[p, 1, 1]
    a12 = dt * affine_c[p, 1, 2]
    a20 = dt * affine_c[p, 2, 0]
    a21 = dt * affine_c[p, 2, 1]
    a22 = one + dt * affine_c[p, 2, 2]
    f00 = F[p, 0, 0]
    f01 = F[p, 0, 1]
    f02 = F[p, 0, 2]
    f10 = F[p, 1, 0]
    f11 = F[p, 1, 1]
    f12 = F[p, 1, 2]
    f20 = F[p, 2, 0]
    f21 = F[p, 2, 1]
    f22 = F[p, 2, 2]
    F[p, 0, 0] = a00 * f00 + a01 * f10 + a02 * f20
    F[p, 0, 1] = a00 * f01 + a01 * f11 + a02 * f21
    F[p, 0, 2] = a00 * f02 + a01 * f12 + a02 * f22
    F[p, 1, 0] = a10 * f00 + a11 * f10 + a12 * f20
    F[p, 1, 1] = a10 * f01 + a11 * f11 + a12 * f21
    F[p, 1, 2] = a10 * f02 + a11 * f12 + a12 * f22
    F[p, 2, 0] = a20 * f00 + a21 * f10 + a22 * f20
    F[p, 2, 1] = a20 * f01 + a21 * f11 + a22 * f21
    F[p, 2, 2] = a20 * f02 + a21 * f12 + a22 * f22


@wp.kernel
def _stress_k(
    F: wp.array(dtype=wp.float64, ndim=3),
    mu: wp.float64,
    lam: wp.float64,
    stress: wp.array(dtype=wp.float64, ndim=3),
):
    p = wp.tid()
    f00 = F[p, 0, 0]
    f01 = F[p, 0, 1]
    f02 = F[p, 0, 2]
    f10 = F[p, 1, 0]
    f11 = F[p, 1, 1]
    f12 = F[p, 1, 2]
    f20 = F[p, 2, 0]
    f21 = F[p, 2, 1]
    f22 = F[p, 2, 2]
    j_det = (
        f00 * (f11 * f22 - f12 * f21)
        - f01 * (f10 * f22 - f12 * f20)
        + f02 * (f10 * f21 - f11 * f20)
    )
    ff00 = f00 * f00 + f01 * f01 + f02 * f02
    ff01 = f00 * f10 + f01 * f11 + f02 * f12
    ff02 = f00 * f20 + f01 * f21 + f02 * f22
    ff11 = f10 * f10 + f11 * f11 + f12 * f12
    ff12 = f10 * f20 + f11 * f21 + f12 * f22
    ff22 = f20 * f20 + f21 * f21 + f22 * f22
    log_j = wp.float64(0.0)
    if j_det <= wp.float64(0.0):  # noqa: SIM108 — if/else (not ternary) for Warp-codegen safety + Phase-1 parity
        log_j = wp.float64(-30.0)
    else:
        log_j = wp.log(j_det)
    s_iso = lam * log_j
    one = wp.float64(1.0)
    stress[p, 0, 0] = mu * (ff00 - one) + s_iso
    stress[p, 0, 1] = mu * ff01
    stress[p, 0, 2] = mu * ff02
    stress[p, 1, 0] = mu * ff01
    stress[p, 1, 1] = mu * (ff11 - one) + s_iso
    stress[p, 1, 2] = mu * ff12
    stress[p, 2, 0] = mu * ff02
    stress[p, 2, 1] = mu * ff12
    stress[p, 2, 2] = mu * (ff22 - one) + s_iso


@wp.kernel
def _p2g_nostress_k(
    pos: wp.array(dtype=wp.float64, ndim=2),
    vel: wp.array(dtype=wp.float64, ndim=2),
    mass: wp.array(dtype=wp.float64),
    affine_c: wp.array(dtype=wp.float64, ndim=3),
    grid_mass: wp.array(dtype=wp.float64, ndim=3),
    grid_mom: wp.array(dtype=wp.float64, ndim=4),
    grid_dx: wp.float64,
    grid_n: wp.int32,
):
    p = wp.tid()
    m = mass[p]
    vx = vel[p, 0]
    vy = vel[p, 1]
    vz = vel[p, 2]
    cxx = affine_c[p, 0, 0]
    cxy = affine_c[p, 0, 1]
    cxz = affine_c[p, 0, 2]
    cyx = affine_c[p, 1, 0]
    cyy = affine_c[p, 1, 1]
    cyz = affine_c[p, 1, 2]
    czx = affine_c[p, 2, 0]
    czy = affine_c[p, 2, 1]
    czz = affine_c[p, 2, 2]
    fx = pos[p, 0] / grid_dx
    fy = pos[p, 1] / grid_dx
    fz = pos[p, 2] / grid_dx
    fbx = wp.floor(fx + wp.float64(0.5)) - wp.float64(1.0)
    fby = wp.floor(fy + wp.float64(0.5)) - wp.float64(1.0)
    fbz = wp.floor(fz + wp.float64(0.5)) - wp.float64(1.0)
    fpx = fx - fbx
    fpy = fy - fby
    fpz = fz - fbz
    bx = wp.int32(fbx)
    by = wp.int32(fby)
    bz = wp.int32(fbz)
    wx = _bspline_w(fpx)
    wy = _bspline_w(fpy)
    wz = _bspline_w(fpz)
    ox = _node_off(fpx, grid_dx)
    oy = _node_off(fpy, grid_dx)
    oz = _node_off(fpz, grid_dx)
    for di in range(3):
        gi = bx + di
        if gi < 0 or gi >= grid_n:
            continue
        wxv = wx[di]
        dxn = ox[di]
        for dj in range(3):
            gj = by + dj
            if gj < 0 or gj >= grid_n:
                continue
            wyv = wy[dj]
            dyn = oy[dj]
            for dk in range(3):
                gk = bz + dk
                if gk < 0 or gk >= grid_n:
                    continue
                wzv = wz[dk]
                dzn = oz[dk]
                w = wxv * wyv * wzv
                wm = w * m
                vx_a = vx + cxx * dxn + cxy * dyn + cxz * dzn
                vy_a = vy + cyx * dxn + cyy * dyn + cyz * dzn
                vz_a = vz + czx * dxn + czy * dyn + czz * dzn
                wp.atomic_add(grid_mass, gi, gj, gk, wm)
                wp.atomic_add(grid_mom, gi, gj, gk, 0, wm * vx_a)
                wp.atomic_add(grid_mom, gi, gj, gk, 1, wm * vy_a)
                wp.atomic_add(grid_mom, gi, gj, gk, 2, wm * vz_a)


@wp.kernel
def _advect_k(
    pos: wp.array(dtype=wp.float64, ndim=2),
    vel: wp.array(dtype=wp.float64, ndim=2),
    dt: wp.float64,
    lo: wp.float64,
    hi: wp.float64,
):
    p = wp.tid()
    npx = pos[p, 0] + dt * vel[p, 0]
    npy = pos[p, 1] + dt * vel[p, 1]
    npz = pos[p, 2] + dt * vel[p, 2]
    if npx < lo:
        npx = lo
    elif npx > hi:
        npx = hi
    if npy < lo:
        npy = lo
    elif npy > hi:
        npy = hi
    if npz < lo:
        npz = lo
    elif npz > hi:
        npz = hi
    pos[p, 0] = npx
    pos[p, 1] = npy
    pos[p, 2] = npz


# --------------------------------------------------------------------------- #
# NumPy-marshalling wrappers (in-place mutation contract; mirror Phase-1 API)  #
# --------------------------------------------------------------------------- #
def _f64(arr: np.ndarray) -> wp.array:
    return wp.from_numpy(np.ascontiguousarray(arr, dtype=np.float64), dtype=wp.float64)


def p2g_with_stress(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    stress: np.ndarray,
    volume_p: np.ndarray,
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    grid_dx: float,
    dt: float,
) -> None:
    """P2G with neo-Hookean stress-divergence force injection (Hu 2018 88-line).

    ``grid_mass`` / ``grid_mom`` are written in place (caller zeros them first).
    """
    n = pos.shape[0]
    grid_n = grid_mass.shape[0]
    with wp.ScopedDevice(_DEVICE):
        gm = _f64(grid_mass)
        gmom = _f64(grid_mom)
        wp.launch(
            _p2g_stress_k,
            dim=n,
            inputs=[
                _f64(pos),
                _f64(vel),
                _f64(mass),
                _f64(affine_c),
                _f64(stress),
                _f64(volume_p),
                gm,
                gmom,
                wp.float64(grid_dx),
                wp.float64(dt),
                wp.int32(grid_n),
            ],
        )
        wp.synchronize()
        grid_mass[:] = gm.numpy()
        grid_mom[:] = gmom.numpy()


def p2g(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    grid_dx: float,
) -> None:
    """P2G mass + momentum + affine transfer (no stress; APIC affine)."""
    n = pos.shape[0]
    grid_n = grid_mass.shape[0]
    with wp.ScopedDevice(_DEVICE):
        gm = _f64(grid_mass)
        gmom = _f64(grid_mom)
        wp.launch(
            _p2g_nostress_k,
            dim=n,
            inputs=[
                _f64(pos),
                _f64(vel),
                _f64(mass),
                _f64(affine_c),
                gm,
                gmom,
                wp.float64(grid_dx),
                wp.int32(grid_n),
            ],
        )
        wp.synchronize()
        grid_mass[:] = gm.numpy()
        grid_mom[:] = gmom.numpy()


def grid_update(
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    gravity_z: float,
    dt: float,
    floor_z: int,
) -> None:
    """Grid update: gravity + sticky floor at ``floor_z`` + axis-clamp walls."""
    grid_n = grid_mass.shape[0]
    with wp.ScopedDevice(_DEVICE):
        gmom = _f64(grid_mom)
        wp.launch(
            _grid_update_k,
            dim=(grid_n, grid_n, grid_n),
            inputs=[
                _f64(grid_mass),
                gmom,
                wp.float64(gravity_z),
                wp.float64(dt),
                wp.int32(floor_z),
                wp.int32(grid_n),
            ],
        )
        wp.synchronize()
        grid_mom[:] = gmom.numpy()


def g2p(
    pos: np.ndarray,
    vel_new: np.ndarray,
    affine_c_new: np.ndarray,
    grid_mom: np.ndarray,
    grid_mass: np.ndarray,
    grid_dx: float,
) -> None:
    """Grid-to-particle velocity + APIC affine reconstruction (4/dx²)."""
    n = pos.shape[0]
    grid_n = grid_mass.shape[0]
    with wp.ScopedDevice(_DEVICE):
        vn = wp.zeros((n, 3), dtype=wp.float64)
        cn = wp.zeros((n, 3, 3), dtype=wp.float64)
        wp.launch(
            _g2p_k,
            dim=n,
            inputs=[
                _f64(pos),
                vn,
                cn,
                _f64(grid_mom),
                _f64(grid_mass),
                wp.float64(grid_dx),
                wp.int32(grid_n),
            ],
        )
        wp.synchronize()
        vel_new[:] = vn.numpy()
        affine_c_new[:] = cn.numpy()


def deformation_update(F: np.ndarray, affine_c: np.ndarray, dt: float) -> None:
    """Deformation-gradient update ``F ← (I + dt C) F`` (in place)."""
    n = F.shape[0]
    with wp.ScopedDevice(_DEVICE):
        fw = _f64(F)
        wp.launch(_deform_k, dim=n, inputs=[fw, _f64(affine_c), wp.float64(dt)])
        wp.synchronize()
        F[:] = fw.numpy()


def compute_particle_stresses(
    F: np.ndarray,
    material_id: np.ndarray,
    mu: float,
    lam: float,
    stress: np.ndarray,
) -> None:
    """Per-particle neo-Hookean Cauchy stress (single material; id ignored)."""
    n = F.shape[0]
    _ = material_id  # single-material; material_id unused (Phase-1 parity).
    with wp.ScopedDevice(_DEVICE):
        sw = wp.zeros((n, 3, 3), dtype=wp.float64)
        wp.launch(_stress_k, dim=n, inputs=[_f64(F), wp.float64(mu), wp.float64(lam), sw])
        wp.synchronize()
        stress[:] = sw.numpy()


def advect_particles(
    pos: np.ndarray,
    vel: np.ndarray,
    dt: float,
    grid_n: int,
    grid_dx: float,
) -> None:
    """Symplectic-Euler position update + interior clamp to ``[2dx, (n-2)dx]``."""
    n = pos.shape[0]
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    with wp.ScopedDevice(_DEVICE):
        pw = _f64(pos)
        wp.launch(
            _advect_k,
            dim=n,
            inputs=[pw, _f64(vel), wp.float64(dt), wp.float64(lo), wp.float64(hi)],
        )
        wp.synchronize()
        pos[:] = pw.numpy()


__all__ = [
    "CANONICAL_BLOB_CENTER",
    "CANONICAL_BLOB_RADIUS",
    "CANONICAL_BLOB_VELOCITY_Z",
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_DT",
    "CANONICAL_FLOOR_Z_INDEX",
    "CANONICAL_GRAVITY_Z",
    "CANONICAL_GRID_N",
    "CANONICAL_LAMBDA",
    "CANONICAL_MU",
    "CANONICAL_N_PARTICLES",
    "CANONICAL_N_STEPS",
    "CANONICAL_POISSON_RATIO",
    "CANONICAL_SEED",
    "CANONICAL_YOUNGS_MODULUS",
    "advect_particles",
    "compute_particle_stresses",
    "deformation_update",
    "g2p",
    "grid_update",
    "p2g",
    "p2g_with_stress",
]
