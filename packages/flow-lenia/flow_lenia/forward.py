"""Flow Lenia — config + reference transport / conservation helpers (Stack D).

Flow Lenia (Plantec et al., ALIFE 2022; arXiv:2212.07906) — mass-conservative Lenia. The growth
field drives a flow ``F``, and matter is transported by **reintegration tracking** so the TOTAL mass
is conserved *by construction*: each cell redistributes ALL of its mass to its flow-displaced
neighbours (the redistribution weights sum to 1), so ``Σ A`` is invariant **to floating-point
summation roundoff (~Nε)** — NOT bit-exact (the operator's honest-tolerance instruction; the
square-distribution integral / bilinear-splat weights sum to 1 algebraically, but their float sum
carries roundoff).

This module is the strict-typed pure-NumPy surface: the configuration dataclass + the reference
affinity / flow / reintegration-transport helpers the golden anchors verify the Taichi engine
against —

* **A1** exact mass conservation by the reintegration construction: ``Σ A_{t+dt} == Σ A_t`` to
  summation roundoff (MEASURE the tolerance; do NOT claim bit-exact).
* **A2** non-negativity: the bilinear-splat redistributes non-negative mass with non-negative
  weights → ``A ≥ 0``.
* **A3** zero-flow identity: ``F ≡ 0`` ⇒ each cell maps to itself with weight 1 ⇒ ``A`` is
  unchanged pointwise (EXACT — advection by zero velocity is the identity).

The flow here is the **affinity gradient** ``F = ∇U`` (``U = K * A``); the mass-conservation /
non-negativity / zero-flow invariants are **flow-agnostic** (they are properties of the
reintegration transport, not of the specific ``F``). The full alpha-weighted Flow Lenia flow
``F = (1-alpha)∇U - alpha∇A_Σ`` (arXiv:2212.07906) is a documented extension (invariants unchanged).
The reintegration uses the bilinear-splat (point-distribution) limit of the paper's uniform square
distribution ``D``; both redistribute a cell's full mass (weights summing to 1). Periodic BC (no
mass leaves the torus).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]

__all__ = [
    "FlowLeniaConfig",
    "affinity_gradient",
    "gaussian_kernel",
    "initial_mass",
    "reintegrate",
    "total_mass",
]


@dataclass(frozen=True)
class FlowLeniaConfig:
    """Flow Lenia configuration (mass-conservative, periodic BC).

    The reintegration transport conserves total mass to summation roundoff (~Nε). Determinism is
    via a seed-pinned NumPy RNG for the initial mass + a single-thread serial Taichi scatter kernel
    (the scatter accumulation order is fixed under ``cpu_max_num_threads=1`` → bit-exact run-to-run,
    even though the mass INVARIANT is only to summation tolerance — the two are distinct).
    """

    grid: int = 32
    kernel_radius: int = 4
    kernel_sigma: float = 2.0
    dt: float = 0.2
    steps: int = 40
    seed: int = 42


def gaussian_kernel(radius: int, sigma: float) -> FloatArray:
    """Normalised Gaussian convolution kernel (``∫ K = 1``), shape ``(2R+1, 2R+1)``."""
    ax = np.arange(-radius, radius + 1, dtype=np.float64)
    xx, yy = np.meshgrid(ax, ax, indexing="ij")
    k = np.exp(-(xx * xx + yy * yy) / (2.0 * sigma * sigma))
    return np.ascontiguousarray(k / k.sum(), dtype=np.float64)


def initial_mass(cfg: FlowLeniaConfig) -> FloatArray:
    """Seed-pinned random non-negative mass field on the periodic grid."""
    rng = np.random.default_rng(cfg.seed)
    return np.ascontiguousarray(rng.uniform(0.0, 1.0, size=(cfg.grid, cfg.grid)), dtype=np.float64)


def _convolve_periodic(a: FloatArray, k: FloatArray) -> FloatArray:
    radius = k.shape[0] // 2
    out = np.zeros_like(a)
    for di in range(-radius, radius + 1):
        for dj in range(-radius, radius + 1):
            out += np.roll(np.roll(a, di, axis=0), dj, axis=1) * k[di + radius, dj + radius]
    return out


def affinity_gradient(a: FloatArray, cfg: FlowLeniaConfig) -> tuple[FloatArray, FloatArray]:
    """Flow ``F = ∇U`` with ``U = K * A`` (periodic central differences), returns ``(Fx, Fy)``."""
    k = gaussian_kernel(cfg.kernel_radius, cfg.kernel_sigma)
    u = _convolve_periodic(a, k)
    fx = (np.roll(u, -1, axis=0) - np.roll(u, 1, axis=0)) * 0.5
    fy = (np.roll(u, -1, axis=1) - np.roll(u, 1, axis=1)) * 0.5
    return fx, fy


def reintegrate(a: FloatArray, fx: FloatArray, fy: FloatArray, dt: float) -> FloatArray:
    """Reference reintegration-tracking transport (forward bilinear splat; periodic BC).

    Each cell ``(i, j)`` sends its full mass ``A[i,j]`` to the flow-displaced target
    ``(i + dt·Fx, j + dt·Fy)``, distributed over the 4 surrounding cells with bilinear weights
    (summing to 1) → total mass conserved to summation roundoff; non-negative mass + weights →
    non-negative output. The mass-conservation mechanism (the genuine Flow Lenia delta)."""
    n = a.shape[0]
    out = np.zeros_like(a)
    for i in range(n):
        for j in range(n):
            m = a[i, j]
            ti = i + dt * fx[i, j]
            tj = j + dt * fy[i, j]
            fi0 = np.floor(ti)
            fj0 = np.floor(tj)
            i0 = int(fi0) % n
            j0 = int(fj0) % n
            wi = ti - fi0
            wj = tj - fj0
            i1 = (i0 + 1) % n
            j1 = (j0 + 1) % n
            out[i0, j0] += m * (1.0 - wi) * (1.0 - wj)
            out[i0, j1] += m * (1.0 - wi) * wj
            out[i1, j0] += m * wi * (1.0 - wj)
            out[i1, j1] += m * wi * wj
    return out


def total_mass(a: FloatArray) -> float:
    """Total mass ``Σ A`` (the conserved quantity, to summation roundoff)."""
    return float(a.sum())
