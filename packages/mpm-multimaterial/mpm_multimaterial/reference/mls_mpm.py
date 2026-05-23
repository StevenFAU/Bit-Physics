"""MLS-MPM hot kernels — P2G transfer, G2P transfer, deformation update.

Pure NumPy + numba ``@njit(fastmath=False, cache=True)`` per
``docs/common/numba.md`` § 2 + plan § 4.2 step 2 (Stage 0 Task 0.4
routing — APPLY numba pre-emptively on the particle-grid transfer hot
kernels).

The shape-function module ``mpm_multimaterial.reference.shape_functions``
ships the pure-Python piecewise N(x) + partition-of-unity surface
consumed by gate-5 (the MLS-MPM quadratic B-spline golden). This module
duplicates the closed-form formula INSIDE the numba-jitted body
because numba's ``@njit`` cannot call into pure-Python helpers (the
duplication is intentional + load-bearing; the formula is anchored at
``tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`` § 1).
FP-equivalence between the pure-Python and numba-jitted shape-function
evaluations holds at 1e-15 because the formula is the same closed-form
piecewise quadratic; no SIMD vs scalar accumulation gap.

Determinism: every loop iterates in lex order over particles and over
the 27-cell P2G/G2P stencil (3×3×3 grid offsets in lex (di, dj, dk));
no atomic-scatter (canonical Python NumPy reference is single-threaded
per ``@njit`` default + ``parallel=False``); identical 1D weight
formula at P2G and G2P call sites (R-MPM-1 mitigation; plan § 9.2 P26
cause-1 worked example).

**Base-node convention.** ``base = floor(particle_pos / dx + 0.5) - 1``
per the golden table's ``base_node_convention`` field at
``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``;
particle interacts with grid nodes ``base, base+1, base+2``. The
particle's offset from the base node in grid-spacing units is
``fp = fx - base ∈ [0.5, 1.5)``. The 3 weights are:

    w[0] = 0.5 * (1.5 - fp)**2     # node base; |offset| = fp ∈ [0.5, 1.5)
    w[1] = 0.75 - (fp - 1)**2       # node base+1; |offset| = |fp-1| ∈ [0, 0.5)
    w[2] = 0.5 * (fp - 0.5)**2      # node base+2; |offset| = |fp-2| ∈ [0.5, 1.5)

(Stage 1 SHIFT S1: replaces the initial ``ix = int(fx - 0.5)`` + the
``ox`` formulation; R-MPM-3 caught in the wild during step-state
trace at the diagnostic-tier dynamics. Plan § 9.2 P26 cause-2 — the
off-by-one was silent for partition-of-unity + mass-conservation
tests because both still sum to 1, but produced wrong dynamics.)

Anchors:

- Hu et al. 2018, *ACM TOG* 37(4), DOI 10.1145/3197517.3201293 § 3.
- 88-line MLS-MPM reference at
  https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp
  (citation-only per R8 amendment; no vendored code).
- Steffen-Kirby-Berzins 2008, *IJNME* 76 (6), DOI 10.1002/nme.2360
  § 3 Eq. (15).
"""

from __future__ import annotations

import math

import numpy as np
from numba import njit


@njit(fastmath=False, cache=True)
def p2g(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    grid_dx: float,
) -> None:
    """Particle-to-grid transfer (mass + momentum + affine velocity term).

    For each particle ``p`` at position ``x_p`` with velocity ``v_p``,
    mass ``m_p``, and affine-velocity matrix ``C_p``:

        m_i        += N_i(x_p) * m_p
        m_i * v_i  += N_i(x_p) * m_p * (v_p + C_p (x_i - x_p))

    where ``N_i(x_p)`` is the 3D tensor-product quadratic B-spline
    weight at grid node ``i`` and the sum runs over the 27 nodes in
    the 3×3×3 stencil centered at ``base = floor(x_p / dx + 0.5) - 1``.

    Loop order: lex over particles, then lex over (di, dj, dk) in
    (0..2, 0..2, 0..2). No atomic ops (single-threaded ``@njit``).
    Mitigates R-MPM-1 (P2G stencil ordering mismatch — plan § 9.2 P26).

    Grids ``grid_mass`` (n, n, n) and ``grid_mom`` (n, n, n, 3) are
    written in place; caller zeros them before each call.
    """
    n_particles = pos.shape[0]
    grid_n = grid_mass.shape[0]
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
        # MLS-MPM 3-node base convention (golden table-pinned):
        bx = int(math.floor(fx + 0.5)) - 1
        by = int(math.floor(fy + 0.5)) - 1
        bz = int(math.floor(fz + 0.5)) - 1
        # Particle's offset from base in grid-spacing units, ∈ [0.5, 1.5).
        fpx = fx - bx
        fpy = fy - by
        fpz = fz - bz

        # 1D quadratic B-spline weights at nodes (base, base+1, base+2).
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
            if gi < 0 or gi >= grid_n:
                continue
            # Node position - particle position in physical units.
            dx_node = (di - fpx) * grid_dx
            for dj in range(3):
                if dj == 0:
                    wyv = wy0
                elif dj == 1:
                    wyv = wy1
                else:
                    wyv = wy2
                gj = by + dj
                if gj < 0 or gj >= grid_n:
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
                    if gk < 0 or gk >= grid_n:
                        continue
                    dz_node = (dk - fpz) * grid_dx

                    w = wxv * wyv * wzv
                    wm = w * m
                    # Affine velocity contribution at this grid node:
                    # v_affine = v_p + C_p (x_i - x_p)
                    vx_a = vx + cxx * dx_node + cxy * dy_node + cxz * dz_node
                    vy_a = vy + cyx * dx_node + cyy * dy_node + cyz * dz_node
                    vz_a = vz + czx * dx_node + czy * dy_node + czz * dz_node

                    grid_mass[gi, gj, gk] += wm
                    grid_mom[gi, gj, gk, 0] += wm * vx_a
                    grid_mom[gi, gj, gk, 1] += wm * vy_a
                    grid_mom[gi, gj, gk, 2] += wm * vz_a


@njit(fastmath=False, cache=True)
def g2p(
    pos: np.ndarray,
    vel_new: np.ndarray,
    affine_c_new: np.ndarray,
    grid_mom: np.ndarray,
    grid_mass: np.ndarray,
    grid_dx: float,
) -> None:
    """Grid-to-particle transfer (velocity + affine-velocity reconstruction).

    For each particle ``p``:

        v_p_new   = sum_i N_i(x_p) * v_i
        C_p_new   = (4 / dx^2) * sum_i N_i(x_p) * v_i ⊗ (x_i - x_p)

    where ``v_i = mom_i / mass_i`` is the grid velocity (zero if grid
    cell has no mass). The factor ``4 / dx^2`` is the MLS-MPM
    quadratic B-spline reconstruction coefficient (Hu 2018 § 4
    equation for C update; this is the analytic factor that makes the
    affine reconstruction exact for the quadratic kernel — APIC).

    Same lex iteration order as ``p2g`` (R-MPM-1 mitigation).
    """
    n_particles = pos.shape[0]
    grid_n = grid_mass.shape[0]
    affine_scale = 4.0 / (grid_dx * grid_dx)
    for p in range(n_particles):
        px = pos[p, 0]
        py_ = pos[p, 1]
        pz = pos[p, 2]
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
        cxx = 0.0
        cxy = 0.0
        cxz = 0.0
        cyx = 0.0
        cyy = 0.0
        cyz = 0.0
        czx = 0.0
        czy = 0.0
        czz = 0.0

        for di in range(3):
            if di == 0:
                wxv = wx0
            elif di == 1:
                wxv = wx1
            else:
                wxv = wx2
            gi = bx + di
            if gi < 0 or gi >= grid_n:
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
                if gj < 0 or gj >= grid_n:
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
                    if gk < 0 or gk >= grid_n:
                        continue
                    dz_node = (dk - fpz) * grid_dx

                    w = wxv * wyv * wzv
                    m = grid_mass[gi, gj, gk]
                    if m > 0.0:
                        inv_m = 1.0 / m
                        vix = grid_mom[gi, gj, gk, 0] * inv_m
                        viy = grid_mom[gi, gj, gk, 1] * inv_m
                        viz = grid_mom[gi, gj, gk, 2] * inv_m
                    else:
                        vix = 0.0
                        viy = 0.0
                        viz = 0.0
                    vx_acc += w * vix
                    vy_acc += w * viy
                    vz_acc += w * viz
                    # Affine reconstruction (APIC):
                    # C += scale * w * v_i ⊗ (x_i - x_p)
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


@njit(fastmath=False, cache=True)
def deformation_update(
    F: np.ndarray,
    affine_c: np.ndarray,
    dt: float,
) -> None:
    """Deformation-gradient update F^{n+1} = (I + dt C) F^n.

    In-place. Lex over particles; per-particle 3x3 matrix multiply
    (no BLAS — direct entry-wise multiply-add at @njit).

    Hu 2018 § 3 equation 4 (deformation-gradient update via affine
    velocity).
    """
    n_particles = F.shape[0]
    for p in range(n_particles):
        a00 = 1.0 + dt * affine_c[p, 0, 0]
        a01 = dt * affine_c[p, 0, 1]
        a02 = dt * affine_c[p, 0, 2]
        a10 = dt * affine_c[p, 1, 0]
        a11 = 1.0 + dt * affine_c[p, 1, 1]
        a12 = dt * affine_c[p, 1, 2]
        a20 = dt * affine_c[p, 2, 0]
        a21 = dt * affine_c[p, 2, 1]
        a22 = 1.0 + dt * affine_c[p, 2, 2]
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


@njit(fastmath=False, cache=True)
def compute_particle_stresses(
    F: np.ndarray,
    material_id: np.ndarray,
    mu: float,
    lam: float,
    stress: np.ndarray,
) -> None:
    """Per-particle Cauchy stress for neo-Hookean material (Hu 2018 § 5).

    σ = (μ (F F^T − I) + λ log(J) I) / J  per the canonical 88-line
    reference form, but we return σ * V (volume-weighted stress)
    which is the quantity consumed by the grid-force injection.

    Single material at this sub-phase scope (multi-material constitutive
    surface declared per algebraic.md § 3; Phase 2+ populates the
    full table — viscoelastic / plastic / granular). All particles
    use ``material_id == 0`` and neo-Hookean (μ, λ).

    In-place into ``stress`` (n_particles, 3, 3).
    """
    n_particles = F.shape[0]
    for p in range(n_particles):
        _ = material_id[p]
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
        if j_det <= 0.0:
            log_j = -30.0
        else:
            log_j = np.log(j_det)
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


@njit(fastmath=False, cache=True)
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
    """P2G with stress-divergence force injection (Hu 2018 88-line variant).

    Adds the force contribution ``-dt * volume_p * stress @ grad N_i``
    to the grid momentum on top of the standard particle-momentum
    transfer. For the MLS-MPM quadratic B-spline kernel the gradient
    contribution simplifies to the APIC affine-velocity injection
    augmented with a scaled per-cell ``stress @ (x_i - x_p)`` term
    (88-line reference, eq. "affine += dt * stress * (-4 dx_inv²)").

    For simplicity at this sub-phase the stress is folded into an
    effective affine-velocity contribution before the regular P2G
    sweep — equivalent to Hu 2018 § 3 + § 5 derivation but avoids a
    separate ``∇N_i`` pass.
    """
    n_particles = pos.shape[0]
    grid_n = grid_mass.shape[0]
    inv_dx_sq = 1.0 / (grid_dx * grid_dx)
    stress_scale = -4.0 * dt * inv_dx_sq  # MLS-MPM 88-line coefficient.

    for p in range(n_particles):
        px = pos[p, 0]
        py_ = pos[p, 1]
        pz = pos[p, 2]
        vx = vel[p, 0]
        vy = vel[p, 1]
        vz = vel[p, 2]
        m = mass[p]
        v_p = volume_p[p]
        ws = stress_scale * v_p
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
            if gi < 0 or gi >= grid_n:
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
                if gj < 0 or gj >= grid_n:
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
                    if gk < 0 or gk >= grid_n:
                        continue
                    dz_node = (dk - fpz) * grid_dx

                    w = wxv * wyv * wzv
                    grid_mass[gi, gj, gk] += w * m
                    mvx = m * vx + eff00 * dx_node + eff01 * dy_node + eff02 * dz_node
                    mvy = m * vy + eff10 * dx_node + eff11 * dy_node + eff12 * dz_node
                    mvz = m * vz + eff20 * dx_node + eff21 * dy_node + eff22 * dz_node
                    grid_mom[gi, gj, gk, 0] += w * mvx
                    grid_mom[gi, gj, gk, 1] += w * mvy
                    grid_mom[gi, gj, gk, 2] += w * mvz


@njit(fastmath=False, cache=True)
def grid_update(
    grid_mass: np.ndarray,
    grid_mom: np.ndarray,
    gravity_z: float,
    dt: float,
    floor_z: int,
) -> None:
    """Grid-update step: apply gravity + simple floor BC.

    For each grid cell with mass > 0:

    1. Compute velocity v_i = mom_i / mass_i.
    2. Apply gravity: v_i_z += gravity_z * dt.
    3. Apply floor BC at z = floor_z: if z <= floor_z, zero v_i_z
       (no-slip along z; sticky floor).
    4. Re-write mom_i = mass_i * v_i.

    Lex order over (i, j, k); deterministic. No atomics.
    """
    grid_n = grid_mass.shape[0]
    for i in range(grid_n):
        for j in range(grid_n):
            for k in range(grid_n):
                m = grid_mass[i, j, k]
                if m <= 0.0:
                    continue
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


@njit(fastmath=False, cache=True)
def advect_particles(
    pos: np.ndarray,
    vel: np.ndarray,
    dt: float,
    grid_n: int,
    grid_dx: float,
) -> None:
    """Symplectic-Euler position update: x_{n+1} = x_n + dt * v_{n+1}.

    Clamps positions to grid interior ``[2*dx, (n-2)*dx]`` to keep the
    3×3×3 stencil in-bounds for the next P2G pass (R-MPM-1 boundary
    safety; no out-of-stencil particles can corrupt determinism).
    """
    n_particles = pos.shape[0]
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    for p in range(n_particles):
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


__all__ = [
    "advect_particles",
    "compute_particle_stresses",
    "deformation_update",
    "g2p",
    "grid_update",
    "p2g",
    "p2g_with_stress",
]
