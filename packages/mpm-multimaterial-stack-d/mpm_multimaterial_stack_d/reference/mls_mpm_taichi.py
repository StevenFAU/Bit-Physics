"""Taichi-DSL MLS-MPM/APIC reference for the Stack-D port.

spec-ref-stack-d.md section 5. Ported from the Phase-1 NumPy+numba reference
``packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py``: the
neo-Hookean stress, the APIC P2G transfer with stress-fold (Hu 2018 88-line
variant), the APIC G2P reconstruction (4/dx^2 coefficient), the grid update
(gravity + sticky floor + axis-clamp walls), the deformation-gradient update
F^{n+1} = (I + dt C) F^n, and symplectic-Euler advection. NumPy arrays flow in
and out; the hot kernels run as ``@ti.kernel`` over ``ti.types.ndarray`` views
(the RD-2D / sph-water / LBM Stack-D pattern). Single-material neo-Hookean
(``material_id`` all-0; probe S-M5 -- "multimaterial" is Phase-1 naming-only).

Module-level discipline (Taichi-integration IC-12):

- NO ``from __future__ import annotations`` -- Taichi's ``@ti.kernel`` AST
  transformer resolves argument-type annotations at decoration time; PEP 563
  stringification breaks it (IC-12 section 4.2, R-T2).
- NO ``-> None`` return annotation on any ``@ti.kernel`` (IC-12 section 4.6).

f64 PRECISION (Stage-0 banked, LOAD-BEARING): ``set_taichi_deterministic`` pins
arch + threads + seed + offline_cache but NOT ``default_fp=ti.f64``; bare ``0.0``
kernel locals infer f32. Every in-kernel accumulator (P2G scatter operands, the
G2P velocity + APIC-C reductions, the neo-Hookean stress 3x3 terms, the
deformation-gradient 3x3 multiply) is seeded explicitly as ``ti.f64(0.0)`` (the
operands are read from f64 ``ti.types.ndarray`` views, so the running sums stay
f64). MPM is the first cross-stack port whose cross-stack-non-trivial surface is
a P2G atomic-SCATTER (IC-15 deferred aspect #3), not a per-cell reduction.

Determinism (Stage-0 Task 0.3 posture (i)): the P2G ``ti.atomic_add`` grid-node
accumulation is serialised by ``cpu_max_num_threads=1`` (from
``set_taichi_deterministic``); the particle ``for p in range(n)`` loop runs in
index order at one thread, so the per-node accumulation order matches the numba
reference's sequential ``+=`` -- run-to-run bit-exact (Stage-0 verified). The
27-cell stencil iterates in fixed lex ``(di, dj, dk)`` order (R-MPM-1 parity).
Base-node convention ``base = floor(p/dx + 0.5) - 1`` (golden-table-pinned;
R-MPM-3).
"""

from typing import Final

import taichi as ti
from common_py.determinism import Config, set_taichi_deterministic

# Canonical drop-impact descriptor constants (mirror the Phase-1 reference).
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

_TAICHI_INITIALIZED = False


def _ensure_taichi() -> None:
    """Initialise Taichi (idempotent) per IC-11 arch='cpu' + determinism.

    ``set_taichi_deterministic`` pins ``cpu_max_num_threads=1`` (posture (i);
    serialises the P2G atomic-scatter) + ``offline_cache=True``. The blob-sampler
    RNG lives in NumPy (``sim.py``), NOT in the kernels, so the Taichi ``seed`` is
    irrelevant to the kernels; ``seed=42`` is recorded for consistency.
    """
    global _TAICHI_INITIALIZED
    if _TAICHI_INITIALIZED:
        return
    set_taichi_deterministic(Config(deterministic=True, seed=CANONICAL_SEED), arch="cpu")
    _TAICHI_INITIALIZED = True


# --------------------------------------------------------------------------
# Taichi kernels (ti.types.ndarray; f64-seeded). Arithmetic mirrors the Phase-1
# numba kernels verbatim for cross-stack-equivalence parity.
# --------------------------------------------------------------------------
@ti.kernel
def _k_p2g(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    vel: ti.types.ndarray(dtype=ti.f64, ndim=2),
    mass: ti.types.ndarray(dtype=ti.f64, ndim=1),
    affine_c: ti.types.ndarray(dtype=ti.f64, ndim=3),
    grid_mass: ti.types.ndarray(dtype=ti.f64, ndim=3),
    grid_mom: ti.types.ndarray(dtype=ti.f64, ndim=4),
    grid_dx: ti.f64,
):
    grid_n = grid_mass.shape[0]
    for p in range(pos.shape[0]):
        px = pos[p, 0]
        py = pos[p, 1]
        pz = pos[p, 2]
        vx = vel[p, 0]
        vy = vel[p, 1]
        vz = vel[p, 2]
        m = mass[p]
        fx = px / grid_dx
        fy = py / grid_dx
        fz = pz / grid_dx
        bx = ti.cast(ti.floor(fx + 0.5), ti.i32) - 1
        by = ti.cast(ti.floor(fy + 0.5), ti.i32) - 1
        bz = ti.cast(ti.floor(fz + 0.5), ti.i32) - 1
        fpx = fx - bx
        fpy = fy - by
        fpz = fz - bz
        wx = ti.Vector([0.5 * (1.5 - fpx) ** 2, 0.75 - (fpx - 1.0) ** 2, 0.5 * (fpx - 0.5) ** 2])
        wy = ti.Vector([0.5 * (1.5 - fpy) ** 2, 0.75 - (fpy - 1.0) ** 2, 0.5 * (fpy - 0.5) ** 2])
        wz = ti.Vector([0.5 * (1.5 - fpz) ** 2, 0.75 - (fpz - 1.0) ** 2, 0.5 * (fpz - 0.5) ** 2])
        for di in range(3):
            gi = bx + di
            if gi < 0 or gi >= grid_n:
                continue
            for dj in range(3):
                gj = by + dj
                if gj < 0 or gj >= grid_n:
                    continue
                for dk in range(3):
                    gk = bz + dk
                    if gk < 0 or gk >= grid_n:
                        continue
                    w = ti.f64(wx[di] * wy[dj] * wz[dk])
                    wm = w * m
                    ti.atomic_add(grid_mass[gi, gj, gk], wm)
                    ti.atomic_add(grid_mom[gi, gj, gk, 0], wm * vx)
                    ti.atomic_add(grid_mom[gi, gj, gk, 1], wm * vy)
                    ti.atomic_add(grid_mom[gi, gj, gk, 2], wm * vz)


@ti.kernel
def _k_p2g_with_stress(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    vel: ti.types.ndarray(dtype=ti.f64, ndim=2),
    mass: ti.types.ndarray(dtype=ti.f64, ndim=1),
    affine_c: ti.types.ndarray(dtype=ti.f64, ndim=3),
    stress: ti.types.ndarray(dtype=ti.f64, ndim=3),
    volume_p: ti.types.ndarray(dtype=ti.f64, ndim=1),
    grid_mass: ti.types.ndarray(dtype=ti.f64, ndim=3),
    grid_mom: ti.types.ndarray(dtype=ti.f64, ndim=4),
    grid_dx: ti.f64,
    dt: ti.f64,
):
    grid_n = grid_mass.shape[0]
    inv_dx_sq = 1.0 / (grid_dx * grid_dx)
    stress_scale = -4.0 * dt * inv_dx_sq
    for p in range(pos.shape[0]):
        px = pos[p, 0]
        py = pos[p, 1]
        pz = pos[p, 2]
        vx = vel[p, 0]
        vy = vel[p, 1]
        vz = vel[p, 2]
        m = mass[p]
        ws = stress_scale * volume_p[p]
        eff00 = m * affine_c[p, 0, 0] + ws * stress[p, 0, 0]
        eff01 = m * affine_c[p, 0, 1] + ws * stress[p, 0, 1]
        eff02 = m * affine_c[p, 0, 2] + ws * stress[p, 0, 2]
        eff10 = m * affine_c[p, 1, 0] + ws * stress[p, 1, 0]
        eff11 = m * affine_c[p, 1, 1] + ws * stress[p, 1, 1]
        eff12 = m * affine_c[p, 1, 2] + ws * stress[p, 1, 2]
        eff20 = m * affine_c[p, 2, 0] + ws * stress[p, 2, 0]
        eff21 = m * affine_c[p, 2, 1] + ws * stress[p, 2, 1]
        eff22 = m * affine_c[p, 2, 2] + ws * stress[p, 2, 2]
        fx = px / grid_dx
        fy = py / grid_dx
        fz = pz / grid_dx
        bx = ti.cast(ti.floor(fx + 0.5), ti.i32) - 1
        by = ti.cast(ti.floor(fy + 0.5), ti.i32) - 1
        bz = ti.cast(ti.floor(fz + 0.5), ti.i32) - 1
        fpx = fx - bx
        fpy = fy - by
        fpz = fz - bz
        wx = ti.Vector([0.5 * (1.5 - fpx) ** 2, 0.75 - (fpx - 1.0) ** 2, 0.5 * (fpx - 0.5) ** 2])
        wy = ti.Vector([0.5 * (1.5 - fpy) ** 2, 0.75 - (fpy - 1.0) ** 2, 0.5 * (fpy - 0.5) ** 2])
        wz = ti.Vector([0.5 * (1.5 - fpz) ** 2, 0.75 - (fpz - 1.0) ** 2, 0.5 * (fpz - 0.5) ** 2])
        for di in range(3):
            gi = bx + di
            if gi < 0 or gi >= grid_n:
                continue
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                gj = by + dj
                if gj < 0 or gj >= grid_n:
                    continue
                dy_node = (dj - fpy) * grid_dx
                for dk in range(3):
                    gk = bz + dk
                    if gk < 0 or gk >= grid_n:
                        continue
                    dz_node = (dk - fpz) * grid_dx
                    w = ti.f64(wx[di] * wy[dj] * wz[dk])
                    mvx = m * vx + eff00 * dx_node + eff01 * dy_node + eff02 * dz_node
                    mvy = m * vy + eff10 * dx_node + eff11 * dy_node + eff12 * dz_node
                    mvz = m * vz + eff20 * dx_node + eff21 * dy_node + eff22 * dz_node
                    ti.atomic_add(grid_mass[gi, gj, gk], w * m)
                    ti.atomic_add(grid_mom[gi, gj, gk, 0], w * mvx)
                    ti.atomic_add(grid_mom[gi, gj, gk, 1], w * mvy)
                    ti.atomic_add(grid_mom[gi, gj, gk, 2], w * mvz)


@ti.kernel
def _k_g2p(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    vel_new: ti.types.ndarray(dtype=ti.f64, ndim=2),
    affine_c_new: ti.types.ndarray(dtype=ti.f64, ndim=3),
    grid_mom: ti.types.ndarray(dtype=ti.f64, ndim=4),
    grid_mass: ti.types.ndarray(dtype=ti.f64, ndim=3),
    grid_dx: ti.f64,
):
    grid_n = grid_mass.shape[0]
    affine_scale = 4.0 / (grid_dx * grid_dx)
    for p in range(pos.shape[0]):
        px = pos[p, 0]
        py = pos[p, 1]
        pz = pos[p, 2]
        fx = px / grid_dx
        fy = py / grid_dx
        fz = pz / grid_dx
        bx = ti.cast(ti.floor(fx + 0.5), ti.i32) - 1
        by = ti.cast(ti.floor(fy + 0.5), ti.i32) - 1
        bz = ti.cast(ti.floor(fz + 0.5), ti.i32) - 1
        fpx = fx - bx
        fpy = fy - by
        fpz = fz - bz
        wx = ti.Vector([0.5 * (1.5 - fpx) ** 2, 0.75 - (fpx - 1.0) ** 2, 0.5 * (fpx - 0.5) ** 2])
        wy = ti.Vector([0.5 * (1.5 - fpy) ** 2, 0.75 - (fpy - 1.0) ** 2, 0.5 * (fpy - 0.5) ** 2])
        wz = ti.Vector([0.5 * (1.5 - fpz) ** 2, 0.75 - (fpz - 1.0) ** 2, 0.5 * (fpz - 0.5) ** 2])
        vx_acc = ti.f64(0.0)
        vy_acc = ti.f64(0.0)
        vz_acc = ti.f64(0.0)
        cxx = ti.f64(0.0)
        cxy = ti.f64(0.0)
        cxz = ti.f64(0.0)
        cyx = ti.f64(0.0)
        cyy = ti.f64(0.0)
        cyz = ti.f64(0.0)
        czx = ti.f64(0.0)
        czy = ti.f64(0.0)
        czz = ti.f64(0.0)
        for di in range(3):
            gi = bx + di
            if gi < 0 or gi >= grid_n:
                continue
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                gj = by + dj
                if gj < 0 or gj >= grid_n:
                    continue
                dy_node = (dj - fpy) * grid_dx
                for dk in range(3):
                    gk = bz + dk
                    if gk < 0 or gk >= grid_n:
                        continue
                    dz_node = (dk - fpz) * grid_dx
                    w = ti.f64(wx[di] * wy[dj] * wz[dk])
                    m = grid_mass[gi, gj, gk]
                    vix = ti.f64(0.0)
                    viy = ti.f64(0.0)
                    viz = ti.f64(0.0)
                    if m > 0.0:
                        inv_m = 1.0 / m
                        vix = grid_mom[gi, gj, gk, 0] * inv_m
                        viy = grid_mom[gi, gj, gk, 1] * inv_m
                        viz = grid_mom[gi, gj, gk, 2] * inv_m
                    vx_acc += w * vix
                    vy_acc += w * viy
                    vz_acc += w * viz
                    cxx += w * vix * dx_node
                    cxy += w * vix * dy_node
                    cxz += w * vix * dz_node
                    cyx += w * viy * dx_node
                    cyy += w * viy * dy_node
                    cyz += w * viy * dz_node
                    czx += w * viz * dx_node
                    czy += w * viz * dy_node
                    czz += w * viz * dz_node
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


@ti.kernel
def _k_grid_update(
    grid_mass: ti.types.ndarray(dtype=ti.f64, ndim=3),
    grid_mom: ti.types.ndarray(dtype=ti.f64, ndim=4),
    gravity_z: ti.f64,
    dt: ti.f64,
    floor_z: ti.i32,
):
    grid_n = grid_mass.shape[0]
    for i, j, k in ti.ndrange(grid_n, grid_n, grid_n):
        m = grid_mass[i, j, k]
        if m > 0.0:
            inv_m = 1.0 / m
            vx = grid_mom[i, j, k, 0] * inv_m
            vy = grid_mom[i, j, k, 1] * inv_m
            vz = grid_mom[i, j, k, 2] * inv_m
            vz += gravity_z * dt
            if k <= floor_z:
                vx = 0.0
                vy = 0.0
                vz = 0.0
            if k == 0 and vz < 0.0:
                vz = 0.0
            if k == grid_n - 1 and vz > 0.0:
                vz = 0.0
            if i == 0 and vx < 0.0:
                vx = 0.0
            if i == grid_n - 1 and vx > 0.0:
                vx = 0.0
            if j == 0 and vy < 0.0:
                vy = 0.0
            if j == grid_n - 1 and vy > 0.0:
                vy = 0.0
            grid_mom[i, j, k, 0] = m * vx
            grid_mom[i, j, k, 1] = m * vy
            grid_mom[i, j, k, 2] = m * vz


@ti.kernel
def _k_deformation_update(
    f_grad: ti.types.ndarray(dtype=ti.f64, ndim=3),
    affine_c: ti.types.ndarray(dtype=ti.f64, ndim=3),
    dt: ti.f64,
):
    for p in range(f_grad.shape[0]):
        a00 = 1.0 + dt * affine_c[p, 0, 0]
        a01 = dt * affine_c[p, 0, 1]
        a02 = dt * affine_c[p, 0, 2]
        a10 = dt * affine_c[p, 1, 0]
        a11 = 1.0 + dt * affine_c[p, 1, 1]
        a12 = dt * affine_c[p, 1, 2]
        a20 = dt * affine_c[p, 2, 0]
        a21 = dt * affine_c[p, 2, 1]
        a22 = 1.0 + dt * affine_c[p, 2, 2]
        f00 = f_grad[p, 0, 0]
        f01 = f_grad[p, 0, 1]
        f02 = f_grad[p, 0, 2]
        f10 = f_grad[p, 1, 0]
        f11 = f_grad[p, 1, 1]
        f12 = f_grad[p, 1, 2]
        f20 = f_grad[p, 2, 0]
        f21 = f_grad[p, 2, 1]
        f22 = f_grad[p, 2, 2]
        f_grad[p, 0, 0] = a00 * f00 + a01 * f10 + a02 * f20
        f_grad[p, 0, 1] = a00 * f01 + a01 * f11 + a02 * f21
        f_grad[p, 0, 2] = a00 * f02 + a01 * f12 + a02 * f22
        f_grad[p, 1, 0] = a10 * f00 + a11 * f10 + a12 * f20
        f_grad[p, 1, 1] = a10 * f01 + a11 * f11 + a12 * f21
        f_grad[p, 1, 2] = a10 * f02 + a11 * f12 + a12 * f22
        f_grad[p, 2, 0] = a20 * f00 + a21 * f10 + a22 * f20
        f_grad[p, 2, 1] = a20 * f01 + a21 * f11 + a22 * f21
        f_grad[p, 2, 2] = a20 * f02 + a21 * f12 + a22 * f22


@ti.kernel
def _k_compute_stresses(
    f_grad: ti.types.ndarray(dtype=ti.f64, ndim=3),
    mu: ti.f64,
    lam: ti.f64,
    stress: ti.types.ndarray(dtype=ti.f64, ndim=3),
):
    for p in range(f_grad.shape[0]):
        f00 = f_grad[p, 0, 0]
        f01 = f_grad[p, 0, 1]
        f02 = f_grad[p, 0, 2]
        f10 = f_grad[p, 1, 0]
        f11 = f_grad[p, 1, 1]
        f12 = f_grad[p, 1, 2]
        f20 = f_grad[p, 2, 0]
        f21 = f_grad[p, 2, 1]
        f22 = f_grad[p, 2, 2]
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
        log_j = ti.f64(-30.0)
        if j_det > 0.0:
            log_j = ti.log(j_det)
        s_iso = lam * log_j
        stress[p, 0, 0] = mu * (ff00 - 1.0) + s_iso
        stress[p, 0, 1] = mu * ff01
        stress[p, 0, 2] = mu * ff02
        stress[p, 1, 0] = mu * ff01
        stress[p, 1, 1] = mu * (ff11 - 1.0) + s_iso
        stress[p, 1, 2] = mu * ff12
        stress[p, 2, 0] = mu * ff02
        stress[p, 2, 1] = mu * ff12
        stress[p, 2, 2] = mu * (ff22 - 1.0) + s_iso


@ti.kernel
def _k_advect(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    vel: ti.types.ndarray(dtype=ti.f64, ndim=2),
    dt: ti.f64,
    grid_n: ti.i32,
    grid_dx: ti.f64,
):
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    for p in range(pos.shape[0]):
        npx = pos[p, 0] + dt * vel[p, 0]
        npy = pos[p, 1] + dt * vel[p, 1]
        npz = pos[p, 2] + dt * vel[p, 2]
        pos[p, 0] = ti.min(ti.max(npx, lo), hi)
        pos[p, 1] = ti.min(ti.max(npy, lo), hi)
        pos[p, 2] = ti.min(ti.max(npz, lo), hi)


# --------------------------------------------------------------------------
# Public wrappers (NumPy in/out; signatures mirror the Phase-1 reference).
# In-place-written args (grid_*, F, stress, vel_new, affine_c_new, pos) are
# passed through directly -- NOT copied -- so the kernel writes land in the
# caller's array. The sim + invariants supply contiguous f64 arrays.
# --------------------------------------------------------------------------
def p2g(pos, vel, mass, affine_c, grid_mass, grid_mom, grid_dx):
    """Particle-to-grid mass + momentum transfer (no stress); APIC affine."""
    _ensure_taichi()
    _k_p2g(pos, vel, mass, affine_c, grid_mass, grid_mom, float(grid_dx))


def p2g_with_stress(pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, grid_dx, dt):
    """P2G with neo-Hookean stress-divergence force injection (Hu 2018 88-line)."""
    _ensure_taichi()
    _k_p2g_with_stress(
        pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, float(grid_dx), float(dt)
    )


def g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, grid_dx):
    """Grid-to-particle velocity + APIC affine-matrix reconstruction (4/dx^2)."""
    _ensure_taichi()
    _k_g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, float(grid_dx))


def grid_update(grid_mass, grid_mom, gravity_z, dt, floor_z):
    """Grid update: gravity + sticky floor at floor_z + axis-clamp walls."""
    _ensure_taichi()
    _k_grid_update(grid_mass, grid_mom, float(gravity_z), float(dt), int(floor_z))


def deformation_update(F, affine_c, dt):
    """Deformation-gradient update F^{n+1} = (I + dt C) F^n (in place)."""
    _ensure_taichi()
    _k_deformation_update(F, affine_c, float(dt))


def compute_particle_stresses(F, material_id, mu, lam, stress):
    """Per-particle neo-Hookean Cauchy stress (single material; material_id ignored)."""
    _ensure_taichi()
    _k_compute_stresses(F, float(mu), float(lam), stress)


def advect_particles(pos, vel, dt, grid_n, grid_dx):
    """Symplectic-Euler position update + interior clamp to [2dx, (n-2)dx]."""
    _ensure_taichi()
    _k_advect(pos, vel, float(dt), int(grid_n), float(grid_dx))


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
