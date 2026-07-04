"""Position/density regularizers for pic-flip (Muller's "necessary" pair).

Two **non-physical regularizers, stated as such** (spec-ref § 3 step 6;
Muller, Ten Minute Physics #18 "How to write a FLIP water simulator" —
slides call the pair "necessary" and the shipped demo carries the same
toggle to demonstrate the failure modes):

1. **Push-apart** — a fixed number of symmetric positional-projection
   sweeps on particle pairs closer than ``2 r_p`` (cell-hash
   neighborhood; ``s = 0.5 (minDist - d)/d``, each particle moved by
   ``-/+ s * (x_j - x_i)`` — Muller's exact recipe). Fixes post-impact
   clumping/boiling.
2. **Density drift compensation** — scatter a unit-mass particle
   density to grid nodes (same quadratic B-spline as the transfers);
   add a **one-sided** source to the projection RHS where the density
   exceeds the frame-0 rest density, driving a corrective expansion
   ``div(u') = k * (rho/rho_0 - 1) / dt`` — ``k`` is the fraction of
   the excess relaxed per step. Fixes the secular volume loss every
   velocity-only-projection PIC/FLIP exhibits. **k normalization
   (measured, deviates from a naive reading of Muller's k = 1):**
   full-per-step relaxation is unstable against a *converged* masked
   solve (the corrective velocity ~ excess * dx / dt exceeds the
   stable band and feeds back; the still-pool null test explodes).
   The reference default is k = 0.05 (excess relaxed over ~20 steps),
   measured stable — see ``pic_flip.reference.apic.default_params_2d``.

Both are **OFF for every closed-form golden and transfer-level
invariant** and **ON (declared in provenance) for canonical captures**
(spec-ref § 3). Invariant 6 (spec-ref § 6.6): at rest — all pair
distances >= 2 r_p and rho <= rho_0 everywhere — both are exactly
inert (push-apart displaces nothing; the drift source is identically
zero), so they cannot inject energy into the still-pool null test.

Determinism: the push-apart sweep is a sequential Gauss-Seidel pass in
particle-id order with reverse-insertion cell linked lists — a pure
function of the input ordering; ``@njit(fastmath=False, cache=True)``,
no atomics (spec-ref § 8).
"""

from __future__ import annotations

import math

import numpy as np
from numba import njit

from .poisson_masked import FLUID

__all__ = [
    "push_apart_2d",
    "push_apart_3d",
    "scatter_unit_density_2d",
    "scatter_unit_density_3d",
    "measure_rest_density",
    "drift_rhs_2d",
    "drift_rhs_3d",
]


@njit(fastmath=False, cache=True)
def scatter_unit_density_2d(pos: np.ndarray, grid_dx: float, den: np.ndarray) -> None:
    """Unit-mass B-spline scatter (particle number density at nodes).

    Same stencil/weights as the P2G transfer. Caller zeros ``den``.
    """
    n_particles = pos.shape[0]
    nx = den.shape[0]
    ny = den.shape[1]
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
                den[gi, gj] += wxv * wyv


@njit(fastmath=False, cache=True)
def scatter_unit_density_3d(pos: np.ndarray, grid_dx: float, den: np.ndarray) -> None:
    """Unit-mass B-spline scatter, 3D — see :func:`scatter_unit_density_2d`."""
    n_particles = pos.shape[0]
    nx = den.shape[0]
    ny = den.shape[1]
    nz = den.shape[2]
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
                    den[gi, gj, gk] += wxv * wyv * wzv


def measure_rest_density(den: np.ndarray, labels: np.ndarray) -> float:
    """Frame-0 rest density: **max** scattered density over fluid nodes.

    The max (not the mean) is the one-sided-safe threshold: free-surface
    nodes always read low (partial stencil support), so a mean would sit
    below the settled interior value and the one-sided drift source
    would fire *at rest*, violating invariant 6 (regularizer inertness).
    With the frame-0 max, ``rho <= rho_0`` holds everywhere at the rest
    configuration (exact inertness); densification beyond the frame-0
    peak — the actual failure mode — still triggers compensation.
    Conservative by construction; declared in canonical provenance.
    """
    fluid = labels == FLUID
    if not np.any(fluid):
        return 0.0
    return float(np.max(den[fluid]))


def _drift_rhs(
    den: np.ndarray,
    labels: np.ndarray,
    rho_rest: float,
    rho: float,
    dt: float,
    k: float,
) -> np.ndarray:
    """One-sided drift-compensation RHS term (see module docstring).

    ``rhs_extra = -(rho/dt) * k * max(den/rho_rest - 1, 0) / dt`` on
    fluid nodes: the projection then realises the corrective expansion
    ``div(u') = k * excess / dt`` (rhs sign convention: the solver
    drives ``div(u')`` to ``-(dt/rho) * rhs_extra``).
    """
    if rho_rest <= 0.0:
        return np.zeros_like(den)
    excess = np.maximum(den / rho_rest - 1.0, 0.0)
    out = np.where(labels == FLUID, -(rho / dt) * k * excess / dt, 0.0)
    return out


def drift_rhs_2d(
    den: np.ndarray,
    labels: np.ndarray,
    rho_rest: float,
    rho: float,
    dt: float,
    k: float = 1.0,
) -> np.ndarray:
    return _drift_rhs(den, labels, rho_rest, rho, dt, k)


def drift_rhs_3d(
    den: np.ndarray,
    labels: np.ndarray,
    rho_rest: float,
    rho: float,
    dt: float,
    k: float = 1.0,
) -> np.ndarray:
    return _drift_rhs(den, labels, rho_rest, rho, dt, k)


@njit(fastmath=False, cache=True)
def push_apart_2d(
    pos: np.ndarray,
    r_p: float,
    n_iters: int,
    lo: float,
    hi_x: float,
    hi_y: float,
) -> None:
    """Symmetric pair separation to ``minDist = 2 r_p``, 2D (in place).

    Muller's recipe: for each close pair, ``s = 0.5 (minDist - d)/d``;
    move the pair ends by ``-/+ s * (x_j - x_i)``. Cell hash of size
    ``2 r_p``; sequential Gauss-Seidel in particle-id order (each pair
    visited once, ``j > i``); coincident pairs (d == 0) are skipped
    (documented degeneracy). Positions re-clamped to the stencil-safe
    box after each displacement.
    """
    n = pos.shape[0]
    min_dist = 2.0 * r_p
    min_dist2 = min_dist * min_dist
    h = 2.0 * r_p
    if h <= 0.0 or n == 0:
        return
    ncx = int(hi_x / h) + 3
    ncy = int(hi_y / h) + 3
    n_cells = ncx * ncy
    head = np.empty(n_cells, dtype=np.int64)
    nxt = np.empty(n, dtype=np.int64)
    for _ in range(n_iters):
        for c in range(n_cells):
            head[c] = -1
        for p in range(n):
            cx = int(pos[p, 0] / h)
            cy = int(pos[p, 1] / h)
            if cx < 0:
                cx = 0
            elif cx >= ncx:
                cx = ncx - 1
            if cy < 0:
                cy = 0
            elif cy >= ncy:
                cy = ncy - 1
            c = cx * ncy + cy
            nxt[p] = head[c]
            head[c] = p
        for i in range(n):
            cx = int(pos[i, 0] / h)
            cy = int(pos[i, 1] / h)
            for ox in range(-1, 2):
                gx = cx + ox
                if gx < 0 or gx >= ncx:
                    continue
                for oy in range(-1, 2):
                    gy = cy + oy
                    if gy < 0 or gy >= ncy:
                        continue
                    j = head[gx * ncy + gy]
                    while j != -1:
                        if j > i:
                            dx_ = pos[j, 0] - pos[i, 0]
                            dy_ = pos[j, 1] - pos[i, 1]
                            d2 = dx_ * dx_ + dy_ * dy_
                            if 0.0 < d2 < min_dist2:
                                d = math.sqrt(d2)
                                s = 0.5 * (min_dist - d) / d
                                pos[i, 0] -= s * dx_
                                pos[i, 1] -= s * dy_
                                pos[j, 0] += s * dx_
                                pos[j, 1] += s * dy_
                                if pos[i, 0] < lo:
                                    pos[i, 0] = lo
                                elif pos[i, 0] > hi_x:
                                    pos[i, 0] = hi_x
                                if pos[i, 1] < lo:
                                    pos[i, 1] = lo
                                elif pos[i, 1] > hi_y:
                                    pos[i, 1] = hi_y
                                if pos[j, 0] < lo:
                                    pos[j, 0] = lo
                                elif pos[j, 0] > hi_x:
                                    pos[j, 0] = hi_x
                                if pos[j, 1] < lo:
                                    pos[j, 1] = lo
                                elif pos[j, 1] > hi_y:
                                    pos[j, 1] = hi_y
                        j = nxt[j]


@njit(fastmath=False, cache=True)
def push_apart_3d(
    pos: np.ndarray,
    r_p: float,
    n_iters: int,
    lo: float,
    hi_x: float,
    hi_y: float,
    hi_z: float,
) -> None:
    """Symmetric pair separation, 3D — see :func:`push_apart_2d`."""
    n = pos.shape[0]
    min_dist = 2.0 * r_p
    min_dist2 = min_dist * min_dist
    h = 2.0 * r_p
    if h <= 0.0 or n == 0:
        return
    ncx = int(hi_x / h) + 3
    ncy = int(hi_y / h) + 3
    ncz = int(hi_z / h) + 3
    n_cells = ncx * ncy * ncz
    head = np.empty(n_cells, dtype=np.int64)
    nxt = np.empty(n, dtype=np.int64)
    for _ in range(n_iters):
        for c in range(n_cells):
            head[c] = -1
        for p in range(n):
            cx = int(pos[p, 0] / h)
            cy = int(pos[p, 1] / h)
            cz = int(pos[p, 2] / h)
            if cx < 0:
                cx = 0
            elif cx >= ncx:
                cx = ncx - 1
            if cy < 0:
                cy = 0
            elif cy >= ncy:
                cy = ncy - 1
            if cz < 0:
                cz = 0
            elif cz >= ncz:
                cz = ncz - 1
            c = (cx * ncy + cy) * ncz + cz
            nxt[p] = head[c]
            head[c] = p
        for i in range(n):
            cx = int(pos[i, 0] / h)
            cy = int(pos[i, 1] / h)
            cz = int(pos[i, 2] / h)
            for ox in range(-1, 2):
                gx = cx + ox
                if gx < 0 or gx >= ncx:
                    continue
                for oy in range(-1, 2):
                    gy = cy + oy
                    if gy < 0 or gy >= ncy:
                        continue
                    for oz in range(-1, 2):
                        gz = cz + oz
                        if gz < 0 or gz >= ncz:
                            continue
                        j = head[(gx * ncy + gy) * ncz + gz]
                        while j != -1:
                            if j > i:
                                dx_ = pos[j, 0] - pos[i, 0]
                                dy_ = pos[j, 1] - pos[i, 1]
                                dz_ = pos[j, 2] - pos[i, 2]
                                d2 = dx_ * dx_ + dy_ * dy_ + dz_ * dz_
                                if 0.0 < d2 < min_dist2:
                                    d = math.sqrt(d2)
                                    s = 0.5 * (min_dist - d) / d
                                    pos[i, 0] -= s * dx_
                                    pos[i, 1] -= s * dy_
                                    pos[i, 2] -= s * dz_
                                    pos[j, 0] += s * dx_
                                    pos[j, 1] += s * dy_
                                    pos[j, 2] += s * dz_
                                    if pos[i, 0] < lo:
                                        pos[i, 0] = lo
                                    elif pos[i, 0] > hi_x:
                                        pos[i, 0] = hi_x
                                    if pos[i, 1] < lo:
                                        pos[i, 1] = lo
                                    elif pos[i, 1] > hi_y:
                                        pos[i, 1] = hi_y
                                    if pos[i, 2] < lo:
                                        pos[i, 2] = lo
                                    elif pos[i, 2] > hi_z:
                                        pos[i, 2] = hi_z
                                    if pos[j, 0] < lo:
                                        pos[j, 0] = lo
                                    elif pos[j, 0] > hi_x:
                                        pos[j, 0] = hi_x
                                    if pos[j, 1] < lo:
                                        pos[j, 1] = lo
                                    elif pos[j, 1] > hi_y:
                                        pos[j, 1] = hi_y
                                    if pos[j, 2] < lo:
                                        pos[j, 2] = lo
                                    elif pos[j, 2] > hi_z:
                                        pos[j, 2] = hi_z
                            j = nxt[j]
