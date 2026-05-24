"""Stack-D DFSPH reference - Taichi-DSL spatial-hash SPH + pure-Python golden surface.

Ports the Phase-1 NumPy reference (``packages/sph-water/sph_water/reference/dfsph.py``,
stack ``numpy-reference``) to Stack-D. The kernel math is re-derived from the
upstream sources, NOT copied from the sealed Stack-B module:

- 3D Monaghan cubic-spline kernel: Monaghan (1992), Annu. Rev. Astron. Astrophys.
  30, 543; Monaghan (2005), Rep. Prog. Phys. 68 (8), 1703, Eq. (2.7).
- SPH density / continuity: Bender & Koschier (2015), SCA '15, Eq. (5).
- Reference implementation cross-check: SPlisHSPlasH (manifest SHA
  ``6bff55a6eaf14083d34650f22a268ce156b62b54``).

NOTE (IC-12 R-T2): this module defines ``@ti.kernel`` functions, so it MUST NOT
carry ``from __future__ import annotations`` (the Taichi AST transformer rejects
stringised annotations). Kernel return-type annotations are omitted (IC-12 4.6).

Two surfaces:

1. **Pure-Python golden surface** (``W``, ``grad_W_magnitude``, ``grad_W``,
   ``density``, ``density_evolution``, ``neighbor_lists``, ``canonical_params``,
   ``SIGMA_3D``). Native Python ``float`` (f64); reproduces the Phase-0
   cubic-spline-kernel golden (abs < 1e-12) and the DFSPH density-evolution
   2-particle golden (abs < 1e-15) exactly. These are the gate-4 verification
   functions; they are deliberately NOT Taichi kernels (small fixtures).
2. **Taichi-DSL spatial-hash SPH** (``_ensure_taichi``, ``_build_grid``,
   ``_compute_density``, ``_integrate``). The canonical-tier SPH density over an
   inlined 27-cell spatial hash (cell = 2h cutoff), plus the explicit-Euler
   integrator. f64 via IC-11 ``set_taichi_deterministic(arch="cpu")`` + f64-typed
   ``ti.types.ndarray`` args with direct f64-ndarray accumulation (the RD-2D
   Stack-D precision pattern; Stage-0 banked f64 requirement satisfied without a
   ``default_fp`` IC-11 edit). ``cpu_max_num_threads=1`` serialises the
   ``ti.atomic_add`` grid insertion (Stage-0 R-S2 derisk).
"""

import math

import numpy as np
import taichi as ti
from common_py.determinism import Config, set_taichi_deterministic

#: 3D cubic-spline normalisation constant sigma_3 = 1/pi (Monaghan 2005 Eq. 2.7).
SIGMA_3D: float = 1.0 / math.pi


def _f(q: float) -> float:
    """Cubic-spline piecewise factor f(q); compact support f(q) = 0 for q >= 2."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if q < 1.0:
        return 1.0 - 1.5 * q * q + 0.75 * q * q * q
    if q < 2.0:
        diff = 2.0 - q
        return 0.25 * diff * diff * diff
    return 0.0


def _fprime(q: float) -> float:
    """First derivative f'(q) of the cubic-spline factor."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if q < 1.0:
        return -3.0 * q + 2.25 * q * q
    if q < 2.0:
        diff = 2.0 - q
        return -0.75 * diff * diff
    return 0.0


def W(q: float, h: float) -> float:
    """3D Monaghan cubic-spline kernel value W(q, h) = sigma_3 / h^3 * f(q)."""
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    return float(SIGMA_3D / (h * h * h) * _f(float(q)))


def grad_W_magnitude(q: float, h: float) -> float:
    """Magnitude |grad W|(q, h) = sigma_3 / h^4 * |f'(q)|."""
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    return float(SIGMA_3D / (h * h * h * h) * abs(_fprime(float(q))))


def grad_W(r_vec: np.ndarray, h: float) -> np.ndarray:
    """Vector gradient grad_i W(r_i - r_j, h) = (sigma_3 / h^4) f'(q) r_hat.

    Returns the zero vector for ||r|| == 0 (f'(0) = 0; no preferred direction).
    """
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    r = np.asarray(r_vec, dtype=np.float64)
    mag = float(np.linalg.norm(r))
    if mag == 0.0:
        return np.zeros_like(r)
    q = mag / h
    return (SIGMA_3D / (h**4)) * _fprime(q) * (r / mag)


def neighbor_lists(
    positions: np.ndarray, h: float, *, support_factor: float = 2.0
) -> list[list[int]]:
    """O(N^2) neighbor-list builder; excludes self; sorted ascending by id.

    Compact support q < support_factor (default 2 => r < 2h). Strict
    less-than ``d^2 < cutoff^2`` matches the Phase-1 reference contract.
    """
    p = np.asarray(positions, dtype=np.float64)
    if p.ndim != 2 or p.shape[1] != 3:
        raise ValueError(f"positions must have shape (N, 3); got {p.shape}")
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    if support_factor <= 0.0:
        raise ValueError(f"support_factor must be strictly positive; got {support_factor!r}")
    n = p.shape[0]
    cutoff = support_factor * h
    cutoff_sq = cutoff * cutoff
    diff = p[:, None, :] - p[None, :, :]
    d2 = np.einsum("ijk,ijk->ij", diff, diff)
    np.fill_diagonal(d2, np.inf)
    mask = d2 < cutoff_sq
    return [np.where(mask[i])[0].tolist() for i in range(n)]


def density(*, particles, h: float) -> list[float]:
    """SPH density rho_i = sum_j m_j W(|r_i - r_j|/h, h), self-term included.

    Matches the Phase-1 reference + ``_density_jit_inner`` convention: the
    self-contribution m_i * sigma_3 / h^3 (q = 0, f(0) = 1) is added first, then
    neighbors in sorted-id order.
    """
    positions = np.asarray([p["p"] for p in particles], dtype=np.float64)
    masses = np.asarray([p["m"] for p in particles], dtype=np.float64)
    if positions.shape[0] == 0:
        return []
    nbr_lists = neighbor_lists(positions, h)
    rho: list[float] = []
    for i, nl in enumerate(nbr_lists):
        accum = float(masses[i] * W(0.0, h))
        for j in nl:
            r = positions[i] - positions[j]
            q = float(np.linalg.norm(r) / h)
            accum += float(masses[j] * W(q, h))
        rho.append(accum)
    return rho


def density_evolution(*, particles, h: float) -> list[float]:
    """SPH continuity d(rho_i)/dt = sum_j m_j (v_i - v_j) . grad_i W(r_i - r_j, h).

    Bender & Koschier 2015 Eq. (5); self term contributes zero gradient and is
    excluded via :func:`neighbor_lists`.
    """
    positions = np.asarray([p["p"] for p in particles], dtype=np.float64)
    velocities = np.asarray([p["v"] for p in particles], dtype=np.float64)
    masses = np.asarray([p["m"] for p in particles], dtype=np.float64)
    if positions.shape[0] == 0:
        return []
    nbr_lists = neighbor_lists(positions, h)
    drho_dt: list[float] = []
    for i, nl in enumerate(nbr_lists):
        accum = 0.0
        for j in nl:
            r = positions[i] - positions[j]
            v_rel = velocities[i] - velocities[j]
            grad = grad_W(r, h)
            accum += float(masses[j] * float(np.dot(v_rel, grad)))
        drho_dt.append(accum)
    return drho_dt


def canonical_params() -> dict[str, float]:
    """Canonical DFSPH parameters (locked identical to the Phase-1 NumPy reference)."""
    return {
        "h": 0.05,
        "rho_0": 1000.0,
        "dt": 1e-3,
        "max_iter_density": 50,
        "max_iter_divergence": 50,
        "density_tolerance": 1e-4,
        "divergence_tolerance": 1e-4,
        "g_z": -9.81,
        "viscosity": 0.01,
    }


# --------------------------------------------------------------------------- #
# Taichi-DSL spatial-hash SPH (canonical-tier capture compute).
# --------------------------------------------------------------------------- #

_TAICHI_INITIALIZED = False


def _ensure_taichi() -> None:
    """Initialise Taichi (idempotent) per IC-11 arch='cpu' + determinism.

    ``set_taichi_deterministic`` pins ``cpu_max_num_threads=1`` (serialises the
    ``ti.atomic_add`` grid insertion). f64 precision is achieved via f64-typed
    ``ti.types.ndarray`` kernel args + direct f64-ndarray accumulation (NOT via a
    ``default_fp`` change to the IC-11 helper) - the RD-2D Stack-D precision
    pattern. RNG entry is exclusively NumPy ``default_rng`` (the kernels consume
    no ``ti.random`` surface), so ``seed=0`` here is irrelevant.
    """
    global _TAICHI_INITIALIZED
    if _TAICHI_INITIALIZED:
        return
    set_taichi_deterministic(Config(deterministic=True, seed=0), arch="cpu")
    _TAICHI_INITIALIZED = True


@ti.kernel
def _build_grid(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    cell_count: ti.types.ndarray(dtype=ti.i32, ndim=1),
    cell_part: ti.types.ndarray(dtype=ti.i32, ndim=2),
    ox: ti.f64,
    oy: ti.f64,
    oz: ti.f64,
    cell: ti.f64,
    ncell: ti.i32,
    n: ti.i32,
    max_per_cell: ti.i32,
):
    """Build the spatial hash (cell = 2h cutoff). atomic_add serialised at 1 thread.

    Insertion order == particle-id order under ``cpu_max_num_threads=1`` (Stage-0
    R-S2 derisk), so the per-cell member ordering is deterministic.
    """
    for c in range(ncell * ncell * ncell):
        cell_count[c] = 0
    for p in range(n):
        ci = ti.max(0, ti.min(ncell - 1, ti.cast((pos[p, 0] - ox) / cell, ti.i32)))
        cj = ti.max(0, ti.min(ncell - 1, ti.cast((pos[p, 1] - oy) / cell, ti.i32)))
        ck = ti.max(0, ti.min(ncell - 1, ti.cast((pos[p, 2] - oz) / cell, ti.i32)))
        cidx = (ci * ncell + cj) * ncell + ck
        idx = ti.atomic_add(cell_count[cidx], 1)
        if idx < max_per_cell:
            cell_part[cidx, idx] = p


@ti.kernel
def _compute_density(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    masses: ti.types.ndarray(dtype=ti.f64, ndim=1),
    rho: ti.types.ndarray(dtype=ti.f64, ndim=1),
    cell_count: ti.types.ndarray(dtype=ti.i32, ndim=1),
    cell_part: ti.types.ndarray(dtype=ti.i32, ndim=2),
    ox: ti.f64,
    oy: ti.f64,
    oz: ti.f64,
    cell: ti.f64,
    h: ti.f64,
    sigma_inv_h3: ti.f64,
    ncell: ti.i32,
    n: ti.i32,
    max_per_cell: ti.i32,
):
    """SPH density via the 27-cell spatial-hash stencil; self-term + neighbors.

    rho_i = m_i * sigma_3/h^3 + sum_{j != i, q < 2} m_j * sigma_3/h^3 * f(q).
    All arithmetic flows through f64 ndarray reads + f64 params; accumulation is
    direct into the f64 ``rho`` ndarray (no standalone f32 local), so the f32
    ``default_fp`` never bites (Stage-0 banked f64 requirement).
    """
    for p in range(n):
        ci = ti.max(0, ti.min(ncell - 1, ti.cast((pos[p, 0] - ox) / cell, ti.i32)))
        cj = ti.max(0, ti.min(ncell - 1, ti.cast((pos[p, 1] - oy) / cell, ti.i32)))
        ck = ti.max(0, ti.min(ncell - 1, ti.cast((pos[p, 2] - oz) / cell, ti.i32)))
        rho[p] = masses[p] * sigma_inv_h3  # self-contribution f(0) = 1
        for di, dj, dk in ti.ndrange((-1, 2), (-1, 2), (-1, 2)):
            ni = ci + di
            nj = cj + dj
            nk = ck + dk
            if 0 <= ni < ncell and 0 <= nj < ncell and 0 <= nk < ncell:
                cidx = (ni * ncell + nj) * ncell + nk
                cnt = ti.min(cell_count[cidx], max_per_cell)
                for s in range(cnt):
                    j = cell_part[cidx, s]
                    if j != p:
                        rx = pos[p, 0] - pos[j, 0]
                        ry = pos[p, 1] - pos[j, 1]
                        rz = pos[p, 2] - pos[j, 2]
                        q = ti.sqrt(rx * rx + ry * ry + rz * rz) / h
                        if q < 1.0:
                            rho[p] += (
                                masses[j] * sigma_inv_h3 * (1.0 - 1.5 * q * q + 0.75 * q * q * q)
                            )
                        elif q < 2.0:
                            rho[p] += (
                                masses[j]
                                * sigma_inv_h3
                                * 0.25
                                * ((2.0 - q) * (2.0 - q) * (2.0 - q))
                            )


@ti.kernel
def _integrate(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    vel: ti.types.ndarray(dtype=ti.f64, ndim=2),
    g_z: ti.f64,
    dt: ti.f64,
    n: ti.i32,
):
    """One semi-implicit explicit-Euler step: v_z += g_z dt; p += dt v (new v).

    Mirrors the Phase-1 reference ``_canonical_step`` integrator (gravity along z;
    no pressure force fed back). x,y velocities stay 0 => the cloud free-falls
    rigidly (relative positions invariant; SPH density is then static per frame).
    """
    for p in range(n):
        vel[p, 2] += g_z * dt
        pos[p, 0] += dt * vel[p, 0]
        pos[p, 1] += dt * vel[p, 1]
        pos[p, 2] += dt * vel[p, 2]
