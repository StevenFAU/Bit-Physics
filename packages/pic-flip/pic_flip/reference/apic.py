"""APIC transfers + step for the pic-flip sim (collocated grid, 2D + 3D).

Primary method: APIC (Jiang, Schroeder, Selle, Teran, Stomakhin 2015,
*ACM TOG* 34(4), DOI 10.1145/2766996; tech-report Props 5.1/5.4/5.5 are
the gate-5 golden anchors). PIC and FLIP (Zhu & Bridson 2005, DOI
10.1145/1073204.1073298) are first-class comparison modes sharing the
same P2G / grid / G2P scaffold — the transfer differs only in the G2P
reconstruction and whether the affine matrix ``C_p`` is carried
(spec-ref § 3 / § 9).

Shape function: quadratic B-spline, identical closed form and
**base-node convention** to the MLS-MPM reference at
``packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py``
(re-implemented locally per Convention A — additive, no edits to the
MPM package; FP-equivalence to the committed golden
``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``
is asserted at gate 5):

    base = floor(particle_pos / dx + 0.5) - 1
    fp   = particle_pos / dx - base  in [0.5, 1.5)
    w[0] = 0.5 * (1.5 - fp)**2
    w[1] = 0.75 - (fp - 1)**2
    w[2] = 0.5 * (fp - 0.5)**2

``Dp = (1/4) dx^2 I`` for this stencil (SIGGRAPH 2016 MPM course notes
§ 10.1 eq. 174, DOI 10.1145/2897826.2927348), so ``Dp^-1`` is the
constant ``4 / dx^2`` — golden-pinned at
``tools/testkit/golden/tables/particle-fluids/apic-transfer-weights.json``.

Determinism (spec-ref § 8): every hot loop is
``@njit(fastmath=False, cache=True)`` per ``docs/common/numba.md``,
iterating in lex order over particles and over the 9-node (2D) /
27-node (3D) stencil; **no atomic scatter** (single-threaded reference);
identical 1D weight formula at every call site. Fixed accumulation
order => bit-identical results across same-hardware runs.

G2P samples **stored grid velocities at all stencil nodes** (no
zero-mass skip): by step order (spec-ref § 3), solid nodes have been
restored to the obstacle velocity and air nodes have been filled by
the post-projection extrapolation pass
(``pic_flip.reference.poisson_masked.extrapolate_into_air_2d``), so the
sampled field is the extended fluid field — the Bridson recipe that
keeps surface particles from dragging against phantom zeros.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from numba import njit

from .poisson_masked import (
    FLUID,
    classify_cells_2d,
    classify_cells_3d,
    default_solid_mask_2d,
    default_solid_mask_3d,
    extrapolate_into_air_2d,
    extrapolate_into_air_3d,
    project_masked_2d,
    project_masked_3d,
)
from .regularizers import (
    drift_rhs_2d,
    drift_rhs_3d,
    push_apart_2d,
    push_apart_3d,
    scatter_unit_density_2d,
    scatter_unit_density_3d,
)

__all__ = [
    "N",
    "partition_of_unity_sum",
    "MODE_PIC",
    "MODE_FLIP",
    "MODE_APIC",
    "p2g_2d",
    "p2g_3d",
    "g2p_2d",
    "g2p_3d",
    "sample_grid_2d",
    "sample_grid_3d",
    "advect_rk2_2d",
    "advect_rk2_3d",
    "count_particles_2d",
    "count_particles_3d",
    "grid_velocity_from_momentum",
    "apic_step_2d",
    "apic_step_3d",
    "default_params_2d",
    "default_params_3d",
]

MODE_PIC = "pic"
MODE_FLIP = "flip"
MODE_APIC = "apic"


def N(x: float) -> float:
    """Quadratic B-spline shape function in 1D (gate-5 golden surface).

    Piecewise quadratic:

    - ``|x| < 1/2``        : ``3/4 - x**2``
    - ``1/2 <= |x| < 3/2`` : ``(1/2) * (3/2 - |x|)**2``
    - ``|x| >= 3/2``       : ``0``

    Identical closed form to the MLS-MPM golden (FP-equivalence at
    1e-15 asserted by the gate-5 test).
    """
    ax = abs(float(x))
    if ax < 0.5:
        return 0.75 - x * x
    if ax < 1.5:
        return 0.5 * (1.5 - ax) ** 2
    return 0.0


def partition_of_unity_sum(p: float) -> float:
    """Sum of the 3 stencil weights at particle coordinate ``p`` (== 1)."""
    p_f = float(p)
    base = math.floor(p_f + 0.5) - 1
    return sum(N(p_f - (base + k)) for k in (0, 1, 2))


# -- 2D kernels ----------------------------------------------------------


@njit(fastmath=False, cache=True)
def p2g_2d(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    grid_dx: float,
) -> None:
    """Affine P2G (lumped mass), 2D.

    ``m_i += w m_p``; ``(m v)_i += w m_p (v_p + C_p (x_i - x_p))``.
    PIC/FLIP call this with ``affine_c`` zeroed — bit-identical scaffold
    (the cross-mode structural-equivalence contract, spec-ref § 9).
    Caller zeros ``grid_mass`` / ``grid_mom``. Lex iteration; no atomics.
    """
    n_particles = pos.shape[0]
    nx = grid_mass.shape[0]
    ny = grid_mass.shape[1]
    for p in range(n_particles):
        px = pos[p, 0]
        py_ = pos[p, 1]
        vx = vel[p, 0]
        vy = vel[p, 1]
        m = mass[p]
        cxx = affine_c[p, 0, 0]
        cxy = affine_c[p, 0, 1]
        cyx = affine_c[p, 1, 0]
        cyy = affine_c[p, 1, 1]

        fx = px / grid_dx
        fy = py_ / grid_dx
        bx = int(math.floor(fx + 0.5)) - 1
        by = int(math.floor(fy + 0.5)) - 1
        fpx = fx - bx
        fpy = fy - by

        wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
        wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
        wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
        wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
        wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
        wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)

        for di in range(3):
            if di == 0:
                wxv = wx0
            elif di == 1:
                wxv = wx1
            else:
                wxv = wx2
            gi = bx + di
            if gi < 0 or gi >= nx:
                continue
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                if dj == 0:
                    wyv = wy0
                elif dj == 1:
                    wyv = wy1
                else:
                    wyv = wy2
                gj = by + dj
                if gj < 0 or gj >= ny:
                    continue
                dy_node = (dj - fpy) * grid_dx

                w = wxv * wyv
                wm = w * m
                vx_a = vx + cxx * dx_node + cxy * dy_node
                vy_a = vy + cyx * dx_node + cyy * dy_node
                grid_mass[gi, gj] += wm
                grid_mom[gi, gj, 0] += wm * vx_a
                grid_mom[gi, gj, 1] += wm * vy_a


@njit(fastmath=False, cache=True)
def sample_grid_2d(
    pos: np.ndarray,
    grid_vel: np.ndarray,
    grid_dx: float,
    vel_out: np.ndarray,
) -> None:
    """B-spline sample of the stored grid velocity field at each particle."""
    n_particles = pos.shape[0]
    nx = grid_vel.shape[0]
    ny = grid_vel.shape[1]
    for p in range(n_particles):
        fx = pos[p, 0] / grid_dx
        fy = pos[p, 1] / grid_dx
        bx = int(math.floor(fx + 0.5)) - 1
        by = int(math.floor(fy + 0.5)) - 1
        fpx = fx - bx
        fpy = fy - by
        wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
        wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
        wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
        wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
        wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
        wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)
        vx_acc = 0.0
        vy_acc = 0.0
        for di in range(3):
            if di == 0:
                wxv = wx0
            elif di == 1:
                wxv = wx1
            else:
                wxv = wx2
            gi = bx + di
            if gi < 0 or gi >= nx:
                continue
            for dj in range(3):
                if dj == 0:
                    wyv = wy0
                elif dj == 1:
                    wyv = wy1
                else:
                    wyv = wy2
                gj = by + dj
                if gj < 0 or gj >= ny:
                    continue
                w = wxv * wyv
                vx_acc += w * grid_vel[gi, gj, 0]
                vy_acc += w * grid_vel[gi, gj, 1]
        vel_out[p, 0] = vx_acc
        vel_out[p, 1] = vy_acc


@njit(fastmath=False, cache=True)
def g2p_2d(
    pos: np.ndarray,
    grid_vel: np.ndarray,
    grid_dx: float,
    compute_affine: bool,
    vel_out: np.ndarray,
    affine_c_out: np.ndarray,
) -> None:
    """G2P reconstruction, 2D.

    ``v_p = sum_i w v_i``; APIC additionally reconstructs
    ``C_p = (4/dx^2) sum_i w v_i (x_i - x_p)^T`` (Prop 5.1 exactness;
    golden-pinned). PIC/FLIP call with ``compute_affine=False`` and get
    ``C_p = 0``. Samples stored velocities at all in-bounds stencil
    nodes (extended field — see module docstring).
    """
    n_particles = pos.shape[0]
    nx = grid_vel.shape[0]
    ny = grid_vel.shape[1]
    affine_scale = 4.0 / (grid_dx * grid_dx)
    for p in range(n_particles):
        fx = pos[p, 0] / grid_dx
        fy = pos[p, 1] / grid_dx
        bx = int(math.floor(fx + 0.5)) - 1
        by = int(math.floor(fy + 0.5)) - 1
        fpx = fx - bx
        fpy = fy - by
        wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
        wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
        wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
        wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
        wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
        wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)
        vx_acc = 0.0
        vy_acc = 0.0
        bxx = 0.0
        bxy = 0.0
        byx = 0.0
        byy = 0.0
        for di in range(3):
            if di == 0:
                wxv = wx0
            elif di == 1:
                wxv = wx1
            else:
                wxv = wx2
            gi = bx + di
            if gi < 0 or gi >= nx:
                continue
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                if dj == 0:
                    wyv = wy0
                elif dj == 1:
                    wyv = wy1
                else:
                    wyv = wy2
                gj = by + dj
                if gj < 0 or gj >= ny:
                    continue
                dy_node = (dj - fpy) * grid_dx
                w = wxv * wyv
                vix = grid_vel[gi, gj, 0]
                viy = grid_vel[gi, gj, 1]
                vx_acc += w * vix
                vy_acc += w * viy
                if compute_affine:
                    bxx += w * vix * dx_node
                    bxy += w * vix * dy_node
                    byx += w * viy * dx_node
                    byy += w * viy * dy_node
        vel_out[p, 0] = vx_acc
        vel_out[p, 1] = vy_acc
        if compute_affine:
            affine_c_out[p, 0, 0] = affine_scale * bxx
            affine_c_out[p, 0, 1] = affine_scale * bxy
            affine_c_out[p, 1, 0] = affine_scale * byx
            affine_c_out[p, 1, 1] = affine_scale * byy
        else:
            affine_c_out[p, 0, 0] = 0.0
            affine_c_out[p, 0, 1] = 0.0
            affine_c_out[p, 1, 0] = 0.0
            affine_c_out[p, 1, 1] = 0.0


@njit(fastmath=False, cache=True)
def advect_rk2_2d(
    pos: np.ndarray,
    grid_vel: np.ndarray,
    dt: float,
    grid_dx: float,
    n_sub: int,
    lo: float,
    hi_x: float,
    hi_y: float,
) -> None:
    """RK2 (midpoint) particle advection through the grid field, 2D.

    Zhu/Bridson recipe (spec-ref § 3 step 5): per CFL substep,
    ``x_mid = x + (h/2) V(x)``; ``x_new = x + h V(x_mid)`` with the
    B-spline-sampled stored velocity. Positions clamped to
    ``[lo, hi]`` per axis (stencil-in-bounds safety, the MPM pattern).
    """
    n_particles = pos.shape[0]
    nx = grid_vel.shape[0]
    ny = grid_vel.shape[1]
    h = dt / n_sub
    for p in range(n_particles):
        px = pos[p, 0]
        py_ = pos[p, 1]
        for _ in range(n_sub):
            # -- V(x) --
            vx1, vy1 = _sample_point_2d(grid_vel, px, py_, grid_dx, nx, ny)
            mx = px + 0.5 * h * vx1
            my = py_ + 0.5 * h * vy1
            vx2, vy2 = _sample_point_2d(grid_vel, mx, my, grid_dx, nx, ny)
            px = px + h * vx2
            py_ = py_ + h * vy2
            if px < lo:
                px = lo
            elif px > hi_x:
                px = hi_x
            if py_ < lo:
                py_ = lo
            elif py_ > hi_y:
                py_ = hi_y
        pos[p, 0] = px
        pos[p, 1] = py_


@njit(fastmath=False, cache=True)
def _sample_point_2d(
    grid_vel: np.ndarray,
    px: float,
    py_: float,
    grid_dx: float,
    nx: int,
    ny: int,
) -> tuple[float, float]:
    fx = px / grid_dx
    fy = py_ / grid_dx
    bx = int(math.floor(fx + 0.5)) - 1
    by = int(math.floor(fy + 0.5)) - 1
    fpx = fx - bx
    fpy = fy - by
    wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
    wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
    wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
    wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
    wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
    wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)
    vx_acc = 0.0
    vy_acc = 0.0
    for di in range(3):
        if di == 0:
            wxv = wx0
        elif di == 1:
            wxv = wx1
        else:
            wxv = wx2
        gi = bx + di
        if gi < 0 or gi >= nx:
            continue
        for dj in range(3):
            if dj == 0:
                wyv = wy0
            elif dj == 1:
                wyv = wy1
            else:
                wyv = wy2
            gj = by + dj
            if gj < 0 or gj >= ny:
                continue
            w = wxv * wyv
            vx_acc += w * grid_vel[gi, gj, 0]
            vy_acc += w * grid_vel[gi, gj, 1]
    return vx_acc, vy_acc


@njit(fastmath=False, cache=True)
def count_particles_2d(
    pos: np.ndarray, nx: int, ny: int, grid_dx: float, count: np.ndarray
) -> None:
    """Per-node marker count: node ``i = floor(x/dx + 0.5)`` owns the
    half-open cell region around it (fluid iff count >= 1, spec-ref § 3).
    Caller zeros ``count``."""
    n_particles = pos.shape[0]
    for p in range(n_particles):
        gi = int(math.floor(pos[p, 0] / grid_dx + 0.5))
        gj = int(math.floor(pos[p, 1] / grid_dx + 0.5))
        if 0 <= gi < nx and 0 <= gj < ny:
            count[gi, gj] += 1


# -- 3D kernels ----------------------------------------------------------


@njit(fastmath=False, cache=True)
def p2g_3d(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    grid_dx: float,
) -> None:
    """Affine P2G (lumped mass), 3D — see :func:`p2g_2d`."""
    n_particles = pos.shape[0]
    nx = grid_mass.shape[0]
    ny = grid_mass.shape[1]
    nz = grid_mass.shape[2]
    for p in range(n_particles):
        px = pos[p, 0]
        py_ = pos[p, 1]
        pz = pos[p, 2]
        vx = vel[p, 0]
        vy = vel[p, 1]
        vz = vel[p, 2]
        m = mass[p]
        cxx = affine_c[p, 0, 0]
        cxy = affine_c[p, 0, 1]
        cxz = affine_c[p, 0, 2]
        cyx = affine_c[p, 1, 0]
        cyy = affine_c[p, 1, 1]
        cyz = affine_c[p, 1, 2]
        czx = affine_c[p, 2, 0]
        czy = affine_c[p, 2, 1]
        czz = affine_c[p, 2, 2]

        fx = px / grid_dx
        fy = py_ / grid_dx
        fz = pz / grid_dx
        bx = int(math.floor(fx + 0.5)) - 1
        by = int(math.floor(fy + 0.5)) - 1
        bz = int(math.floor(fz + 0.5)) - 1
        fpx = fx - bx
        fpy = fy - by
        fpz = fz - bz

        wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
        wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
        wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
        wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
        wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
        wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)
        wz0 = 0.5 * (1.5 - fpz) * (1.5 - fpz)
        wz1 = 0.75 - (fpz - 1.0) * (fpz - 1.0)
        wz2 = 0.5 * (fpz - 0.5) * (fpz - 0.5)

        for di in range(3):
            if di == 0:
                wxv = wx0
            elif di == 1:
                wxv = wx1
            else:
                wxv = wx2
            gi = bx + di
            if gi < 0 or gi >= nx:
                continue
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                if dj == 0:
                    wyv = wy0
                elif dj == 1:
                    wyv = wy1
                else:
                    wyv = wy2
                gj = by + dj
                if gj < 0 or gj >= ny:
                    continue
                dy_node = (dj - fpy) * grid_dx
                for dk in range(3):
                    if dk == 0:
                        wzv = wz0
                    elif dk == 1:
                        wzv = wz1
                    else:
                        wzv = wz2
                    gk = bz + dk
                    if gk < 0 or gk >= nz:
                        continue
                    dz_node = (dk - fpz) * grid_dx

                    w = wxv * wyv * wzv
                    wm = w * m
                    vx_a = vx + cxx * dx_node + cxy * dy_node + cxz * dz_node
                    vy_a = vy + cyx * dx_node + cyy * dy_node + cyz * dz_node
                    vz_a = vz + czx * dx_node + czy * dy_node + czz * dz_node
                    grid_mass[gi, gj, gk] += wm
                    grid_mom[gi, gj, gk, 0] += wm * vx_a
                    grid_mom[gi, gj, gk, 1] += wm * vy_a
                    grid_mom[gi, gj, gk, 2] += wm * vz_a


@njit(fastmath=False, cache=True)
def sample_grid_3d(
    pos: np.ndarray,
    grid_vel: np.ndarray,
    grid_dx: float,
    vel_out: np.ndarray,
) -> None:
    """B-spline sample of the stored grid velocity at each particle, 3D."""
    n_particles = pos.shape[0]
    nx = grid_vel.shape[0]
    ny = grid_vel.shape[1]
    nz = grid_vel.shape[2]
    for p in range(n_particles):
        vx, vy, vz = _sample_point_3d(
            grid_vel, pos[p, 0], pos[p, 1], pos[p, 2], grid_dx, nx, ny, nz
        )
        vel_out[p, 0] = vx
        vel_out[p, 1] = vy
        vel_out[p, 2] = vz


@njit(fastmath=False, cache=True)
def _sample_point_3d(
    grid_vel: np.ndarray,
    px: float,
    py_: float,
    pz: float,
    grid_dx: float,
    nx: int,
    ny: int,
    nz: int,
) -> tuple[float, float, float]:
    fx = px / grid_dx
    fy = py_ / grid_dx
    fz = pz / grid_dx
    bx = int(math.floor(fx + 0.5)) - 1
    by = int(math.floor(fy + 0.5)) - 1
    bz = int(math.floor(fz + 0.5)) - 1
    fpx = fx - bx
    fpy = fy - by
    fpz = fz - bz
    wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
    wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
    wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
    wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
    wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
    wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)
    wz0 = 0.5 * (1.5 - fpz) * (1.5 - fpz)
    wz1 = 0.75 - (fpz - 1.0) * (fpz - 1.0)
    wz2 = 0.5 * (fpz - 0.5) * (fpz - 0.5)
    vx_acc = 0.0
    vy_acc = 0.0
    vz_acc = 0.0
    for di in range(3):
        if di == 0:
            wxv = wx0
        elif di == 1:
            wxv = wx1
        else:
            wxv = wx2
        gi = bx + di
        if gi < 0 or gi >= nx:
            continue
        for dj in range(3):
            if dj == 0:
                wyv = wy0
            elif dj == 1:
                wyv = wy1
            else:
                wyv = wy2
            gj = by + dj
            if gj < 0 or gj >= ny:
                continue
            for dk in range(3):
                if dk == 0:
                    wzv = wz0
                elif dk == 1:
                    wzv = wz1
                else:
                    wzv = wz2
                gk = bz + dk
                if gk < 0 or gk >= nz:
                    continue
                w = wxv * wyv * wzv
                vx_acc += w * grid_vel[gi, gj, gk, 0]
                vy_acc += w * grid_vel[gi, gj, gk, 1]
                vz_acc += w * grid_vel[gi, gj, gk, 2]
    return vx_acc, vy_acc, vz_acc


@njit(fastmath=False, cache=True)
def g2p_3d(
    pos: np.ndarray,
    grid_vel: np.ndarray,
    grid_dx: float,
    compute_affine: bool,
    vel_out: np.ndarray,
    affine_c_out: np.ndarray,
) -> None:
    """G2P reconstruction, 3D — see :func:`g2p_2d`."""
    n_particles = pos.shape[0]
    nx = grid_vel.shape[0]
    ny = grid_vel.shape[1]
    nz = grid_vel.shape[2]
    affine_scale = 4.0 / (grid_dx * grid_dx)
    for p in range(n_particles):
        fx = pos[p, 0] / grid_dx
        fy = pos[p, 1] / grid_dx
        fz = pos[p, 2] / grid_dx
        bx = int(math.floor(fx + 0.5)) - 1
        by = int(math.floor(fy + 0.5)) - 1
        bz = int(math.floor(fz + 0.5)) - 1
        fpx = fx - bx
        fpy = fy - by
        fpz = fz - bz
        wx0 = 0.5 * (1.5 - fpx) * (1.5 - fpx)
        wx1 = 0.75 - (fpx - 1.0) * (fpx - 1.0)
        wx2 = 0.5 * (fpx - 0.5) * (fpx - 0.5)
        wy0 = 0.5 * (1.5 - fpy) * (1.5 - fpy)
        wy1 = 0.75 - (fpy - 1.0) * (fpy - 1.0)
        wy2 = 0.5 * (fpy - 0.5) * (fpy - 0.5)
        wz0 = 0.5 * (1.5 - fpz) * (1.5 - fpz)
        wz1 = 0.75 - (fpz - 1.0) * (fpz - 1.0)
        wz2 = 0.5 * (fpz - 0.5) * (fpz - 0.5)
        vx_acc = 0.0
        vy_acc = 0.0
        vz_acc = 0.0
        bxx = 0.0
        bxy = 0.0
        bxz = 0.0
        byx = 0.0
        byy = 0.0
        byz = 0.0
        bzx = 0.0
        bzy = 0.0
        bzz = 0.0
        for di in range(3):
            if di == 0:
                wxv = wx0
            elif di == 1:
                wxv = wx1
            else:
                wxv = wx2
            gi = bx + di
            if gi < 0 or gi >= nx:
                continue
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                if dj == 0:
                    wyv = wy0
                elif dj == 1:
                    wyv = wy1
                else:
                    wyv = wy2
                gj = by + dj
                if gj < 0 or gj >= ny:
                    continue
                dy_node = (dj - fpy) * grid_dx
                for dk in range(3):
                    if dk == 0:
                        wzv = wz0
                    elif dk == 1:
                        wzv = wz1
                    else:
                        wzv = wz2
                    gk = bz + dk
                    if gk < 0 or gk >= nz:
                        continue
                    dz_node = (dk - fpz) * grid_dx
                    w = wxv * wyv * wzv
                    vix = grid_vel[gi, gj, gk, 0]
                    viy = grid_vel[gi, gj, gk, 1]
                    viz = grid_vel[gi, gj, gk, 2]
                    vx_acc += w * vix
                    vy_acc += w * viy
                    vz_acc += w * viz
                    if compute_affine:
                        bxx += w * vix * dx_node
                        bxy += w * vix * dy_node
                        bxz += w * vix * dz_node
                        byx += w * viy * dx_node
                        byy += w * viy * dy_node
                        byz += w * viy * dz_node
                        bzx += w * viz * dx_node
                        bzy += w * viz * dy_node
                        bzz += w * viz * dz_node
        vel_out[p, 0] = vx_acc
        vel_out[p, 1] = vy_acc
        vel_out[p, 2] = vz_acc
        if compute_affine:
            affine_c_out[p, 0, 0] = affine_scale * bxx
            affine_c_out[p, 0, 1] = affine_scale * bxy
            affine_c_out[p, 0, 2] = affine_scale * bxz
            affine_c_out[p, 1, 0] = affine_scale * byx
            affine_c_out[p, 1, 1] = affine_scale * byy
            affine_c_out[p, 1, 2] = affine_scale * byz
            affine_c_out[p, 2, 0] = affine_scale * bzx
            affine_c_out[p, 2, 1] = affine_scale * bzy
            affine_c_out[p, 2, 2] = affine_scale * bzz
        else:
            for a in range(3):
                for b in range(3):
                    affine_c_out[p, a, b] = 0.0


@njit(fastmath=False, cache=True)
def advect_rk2_3d(
    pos: np.ndarray,
    grid_vel: np.ndarray,
    dt: float,
    grid_dx: float,
    n_sub: int,
    lo: float,
    hi_x: float,
    hi_y: float,
    hi_z: float,
) -> None:
    """RK2 (midpoint) particle advection, 3D — see :func:`advect_rk2_2d`."""
    n_particles = pos.shape[0]
    nx = grid_vel.shape[0]
    ny = grid_vel.shape[1]
    nz = grid_vel.shape[2]
    h = dt / n_sub
    for p in range(n_particles):
        px = pos[p, 0]
        py_ = pos[p, 1]
        pz = pos[p, 2]
        for _ in range(n_sub):
            vx1, vy1, vz1 = _sample_point_3d(grid_vel, px, py_, pz, grid_dx, nx, ny, nz)
            mx = px + 0.5 * h * vx1
            my = py_ + 0.5 * h * vy1
            mz = pz + 0.5 * h * vz1
            vx2, vy2, vz2 = _sample_point_3d(grid_vel, mx, my, mz, grid_dx, nx, ny, nz)
            px = px + h * vx2
            py_ = py_ + h * vy2
            pz = pz + h * vz2
            if px < lo:
                px = lo
            elif px > hi_x:
                px = hi_x
            if py_ < lo:
                py_ = lo
            elif py_ > hi_y:
                py_ = hi_y
            if pz < lo:
                pz = lo
            elif pz > hi_z:
                pz = hi_z
        pos[p, 0] = px
        pos[p, 1] = py_
        pos[p, 2] = pz


@njit(fastmath=False, cache=True)
def count_particles_3d(
    pos: np.ndarray, nx: int, ny: int, nz: int, grid_dx: float, count: np.ndarray
) -> None:
    """Per-node marker count, 3D — see :func:`count_particles_2d`."""
    n_particles = pos.shape[0]
    for p in range(n_particles):
        gi = int(math.floor(pos[p, 0] / grid_dx + 0.5))
        gj = int(math.floor(pos[p, 1] / grid_dx + 0.5))
        gk = int(math.floor(pos[p, 2] / grid_dx + 0.5))
        if 0 <= gi < nx and 0 <= gj < ny and 0 <= gk < nz:
            count[gi, gj, gk] += 1


# -- Step orchestration ----------------------------------------------------


def grid_velocity_from_momentum(
    grid_mass: np.ndarray, grid_mom: np.ndarray
) -> np.ndarray:
    """``v_i = mom_i / m_i`` where ``m_i > 0``; zero elsewhere."""
    grid_vel = np.zeros_like(grid_mom)
    massed = grid_mass > 0.0
    grid_vel[massed] = grid_mom[massed] / grid_mass[massed][..., None]
    return grid_vel


def default_params_2d() -> dict[str, Any]:
    """Baseline 2D parameter set (diagnostic tier; canonicals pin their own).

    ``n_jacobi`` is per-scene: chosen by measured hydrostatic
    convergence for each canonical, then pinned (spec-ref § 6.3 — the
    GPU Gems 3 ch. 30 solver-depth failure). The default here suits the
    shallow diagnostic scenes only.
    """
    return {
        "nx": 32,
        "ny": 32,
        "dx": 1.0 / 32.0,
        "dt": 2.0e-3,
        "rho": 1.0,
        "gravity": -9.81,
        "mode": MODE_APIC,
        "n_jacobi": 300,
        "n_extrapolation_layers": 3,
        "n_wall": 2,
        "cfl": 0.5,
        "regularizers": True,
        # minDist = 2 * factor * dx; at the reference seeding of 2
        # particles per cell axis (spacing dx/2), factor 0.25 makes the
        # rest lattice exactly inert (pair distance == minDist, strict-<
        # comparison — invariant 6).
        "push_apart_radius_factor": 0.25,
        "push_apart_iters": 2,
        # Fraction of the measured density excess relaxed per step.
        # Full-per-step (k = 1) is measured UNSTABLE against this
        # converged solver (corrective velocity ~ excess * dx / dt
        # feeds back through the free surface; still-pool blows up to
        # ~8 m/s). Muller's demo tolerates his k = 1 because his
        # 20-40-iteration unconverged solve low-passes the source.
        # k = 0.05 relaxes the excess over ~20 steps — measured stable,
        # still fast against the secular (hundreds-of-steps) drift it
        # exists to fix.
        "drift_k": 0.05,
    }


def default_params_3d() -> dict[str, Any]:
    """Baseline 3D parameter set — see :func:`default_params_2d`."""
    params = default_params_2d()
    params.update({"nx": 16, "ny": 16, "nz": 16, "dx": 1.0 / 16.0, "n_jacobi": 200})
    return params


def _n_substeps(max_speed: float, dt: float, dx: float, cfl: float) -> int:
    """CFL-limited substep count (deterministic function of the state)."""
    if max_speed <= 0.0:
        return 1
    return max(1, int(math.ceil(max_speed * dt / (cfl * dx))))


def apic_step_2d(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    params: dict[str, Any],
    rho_rest: float | None = None,
    solid_mask: np.ndarray | None = None,
) -> dict[str, Any]:
    """One 2D step (spec-ref § 3). Mutates ``pos``/``vel``/``affine_c``.

    Order: P2G -> label -> gravity -> masked projection (with optional
    drift-compensation RHS) -> solid restore + air extrapolation ->
    G2P (mode) -> RK2 advection -> push-apart. Returns diagnostics.
    """
    nx = int(params["nx"])
    ny = int(params["ny"])
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    gravity = float(params.get("gravity", -9.81))
    mode = str(params.get("mode", MODE_APIC))
    n_wall = int(params.get("n_wall", 2))
    regularize = bool(params.get("regularizers", True))

    if solid_mask is None:
        solid_mask = default_solid_mask_2d(nx, ny, n_wall)

    # 1. P2G (PIC/FLIP zero the affine term — bit-identical scaffold).
    c_for_p2g = affine_c if mode == MODE_APIC else np.zeros_like(affine_c)
    grid_mass = np.zeros((nx, ny), dtype=np.float64)
    grid_mom = np.zeros((nx, ny, 2), dtype=np.float64)
    p2g_2d(pos, vel, mass, c_for_p2g, grid_mass, grid_mom, dx)
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    grid_vel_old = grid_vel.copy()  # FLIP delta baseline (post-P2G, pre-force).

    # 2. Cell labels from marker occupancy.
    count = np.zeros((nx, ny), dtype=np.int64)
    count_particles_2d(pos, nx, ny, dx, count)
    labels = classify_cells_2d(count, solid_mask)

    # 3. Gravity on massed nodes (air nodes are overwritten by the
    #    post-projection extrapolation before any particle samples them).
    grid_vel[grid_mass > 0.0, 1] += gravity * dt

    # 4. Optional density-drift compensation RHS (Muller's "necessary"
    #    regularizer #2; one-sided, spec-ref § 3 step 6).
    rhs_extra = None
    if regularize and rho_rest is not None:
        den = np.zeros((nx, ny), dtype=np.float64)
        scatter_unit_density_2d(pos, dx, den)
        rhs_extra = drift_rhs_2d(
            den, labels, float(rho_rest), rho, dt, float(params.get("drift_k", 1.0))
        )

    # 5. Masked free-surface projection + solid restore inside.
    grid_vel, pressure, div_after = project_masked_2d(
        grid_vel,
        labels,
        dx,
        dt,
        rho,
        int(params["n_jacobi"]),
        rhs_extra=rhs_extra,
    )

    # 6. Air-cell velocity extrapolation (breadth-first, >= 2 layers).
    extrapolate_into_air_2d(
        grid_vel, labels, int(params.get("n_extrapolation_layers", 3))
    )

    # 7. G2P per mode.
    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    if mode == MODE_APIC:
        g2p_2d(pos, grid_vel, dx, True, vel_new, c_new)
    elif mode == MODE_PIC:
        g2p_2d(pos, grid_vel, dx, False, vel_new, c_new)
    else:  # FLIP: v_p += S(new) - S(old).
        g2p_2d(pos, grid_vel, dx, False, vel_new, c_new)
        old_sample = np.empty_like(vel)
        sample_grid_2d(pos, grid_vel_old, dx, old_sample)
        vel_new = vel + (vel_new - old_sample)
    vel[:] = vel_new
    affine_c[:] = c_new

    # 8. RK2 advection (CFL-limited substeps) + stencil-safety clamp.
    max_speed = float(np.max(np.abs(vel))) if vel.size else 0.0
    n_sub = _n_substeps(max_speed, dt, dx, float(params.get("cfl", 0.5)))
    lo = n_wall * dx
    advect_rk2_2d(
        pos, grid_vel, dt, dx, n_sub, lo, (nx - 1 - n_wall) * dx, (ny - 1 - n_wall) * dx
    )

    # 9. Push-apart (Muller's "necessary" regularizer #1).
    if regularize:
        r_p = float(params.get("push_apart_radius_factor", 0.25)) * dx
        push_apart_2d(
            pos,
            r_p,
            int(params.get("push_apart_iters", 2)),
            lo,
            (nx - 1 - n_wall) * dx,
            (ny - 1 - n_wall) * dx,
        )

    fluid_nodes = int(np.sum(labels == FLUID))
    return {
        "max_speed": max_speed,
        "n_substeps": n_sub,
        "max_div_fluid": float(div_after),
        "fluid_node_count": fluid_nodes,
        "pressure": pressure,
        "labels": labels,
        "grid_vel": grid_vel,
    }


def apic_step_3d(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    params: dict[str, Any],
    rho_rest: float | None = None,
    solid_mask: np.ndarray | None = None,
) -> dict[str, Any]:
    """One 3D step — mirrors :func:`apic_step_2d` (gravity along -z)."""
    nx = int(params["nx"])
    ny = int(params["ny"])
    nz = int(params["nz"])
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    gravity = float(params.get("gravity", -9.81))
    mode = str(params.get("mode", MODE_APIC))
    n_wall = int(params.get("n_wall", 2))
    regularize = bool(params.get("regularizers", True))

    if solid_mask is None:
        solid_mask = default_solid_mask_3d(nx, ny, nz, n_wall)

    c_for_p2g = affine_c if mode == MODE_APIC else np.zeros_like(affine_c)
    grid_mass = np.zeros((nx, ny, nz), dtype=np.float64)
    grid_mom = np.zeros((nx, ny, nz, 3), dtype=np.float64)
    p2g_3d(pos, vel, mass, c_for_p2g, grid_mass, grid_mom, dx)
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    grid_vel_old = grid_vel.copy()

    count = np.zeros((nx, ny, nz), dtype=np.int64)
    count_particles_3d(pos, nx, ny, nz, dx, count)
    labels = classify_cells_3d(count, solid_mask)

    grid_vel[grid_mass > 0.0, 2] += gravity * dt

    rhs_extra = None
    if regularize and rho_rest is not None:
        den = np.zeros((nx, ny, nz), dtype=np.float64)
        scatter_unit_density_3d(pos, dx, den)
        rhs_extra = drift_rhs_3d(
            den, labels, float(rho_rest), rho, dt, float(params.get("drift_k", 1.0))
        )

    grid_vel, pressure, div_after = project_masked_3d(
        grid_vel,
        labels,
        dx,
        dt,
        rho,
        int(params["n_jacobi"]),
        rhs_extra=rhs_extra,
    )

    extrapolate_into_air_3d(
        grid_vel, labels, int(params.get("n_extrapolation_layers", 3))
    )

    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    if mode == MODE_APIC:
        g2p_3d(pos, grid_vel, dx, True, vel_new, c_new)
    elif mode == MODE_PIC:
        g2p_3d(pos, grid_vel, dx, False, vel_new, c_new)
    else:
        g2p_3d(pos, grid_vel, dx, False, vel_new, c_new)
        old_sample = np.empty_like(vel)
        sample_grid_3d(pos, grid_vel_old, dx, old_sample)
        vel_new = vel + (vel_new - old_sample)
    vel[:] = vel_new
    affine_c[:] = c_new

    max_speed = float(np.max(np.abs(vel))) if vel.size else 0.0
    n_sub = _n_substeps(max_speed, dt, dx, float(params.get("cfl", 0.5)))
    lo = n_wall * dx
    advect_rk2_3d(
        pos,
        grid_vel,
        dt,
        dx,
        n_sub,
        lo,
        (nx - 1 - n_wall) * dx,
        (ny - 1 - n_wall) * dx,
        (nz - 1 - n_wall) * dx,
    )

    if regularize:
        r_p = float(params.get("push_apart_radius_factor", 0.25)) * dx
        push_apart_3d(
            pos,
            r_p,
            int(params.get("push_apart_iters", 2)),
            lo,
            (nx - 1 - n_wall) * dx,
            (ny - 1 - n_wall) * dx,
            (nz - 1 - n_wall) * dx,
        )

    fluid_nodes = int(np.sum(labels == FLUID))
    return {
        "max_speed": max_speed,
        "n_substeps": n_sub,
        "max_div_fluid": float(div_after),
        "fluid_node_count": fluid_nodes,
        "pressure": pressure,
        "labels": labels,
        "grid_vel": grid_vel,
    }
