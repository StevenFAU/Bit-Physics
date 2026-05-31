"""Particle Lenia — config + closed-form energy/gradient analytic helpers (Stack D).

Particle Lenia (Mordvintsev, Niklasson, Randazzo 2022, Google Research Self-Organising Systems —
"Particle Lenia and the energy-based formulation", https://google-research.github.io/self-organising-systems/particle-lenia/).
Each particle ``p_i`` carries a Lenia field ``U(x) = Σ_j K(|x - p_j|)``, a growth map ``G(U)``, a
repulsion field ``R(x)``, and a per-particle energy field ``E(x) = R(x) - G(U(x))``. The **canonical
LOCAL rule** integrates ``dp_i/dt = -∇E(p_i)`` — each particle greedily minimises its OWN local
energy; the TOTAL energy is NOT monotonic (the article contrasts this with a global-descent rule).

This module is the strict-typed pure-NumPy surface: the configuration dataclass + the closed-form
analytic energy/gradient helpers the gradient-golden anchors verify the Taichi engine against —

* **A1** the analytic per-particle force ``-∇E(p_i)`` (hand-derived chain rule through ``K``, ``G``,
  ``R``). The Taichi engine computes the SAME force; A1 is the independent NumPy mirror (the
  smoke-diff bit-faithful-mirror pattern).
* **A2** central finite differences of ``E`` (independent numerical method).
* **A3** translation invariance of the TOTAL energy ``E_total(P + δ) == E_total(P)`` (an exact
  symmetry — ``E`` depends only on pairwise distances; equivalently ``Σ_i ∇_{p_i} E_total = 0``).
  NOTE the LOCAL force sum ``Σ_i ∇E(p_i)`` is NOT zero (the local rule does not conserve momentum);
  the sound symmetry anchor is the GLOBAL-energy invariance, not the local-force sum.

Default parameters are the SOS-article 2D defaults (``mu_k=4, sigma_k=1, w_k=0.022``; ``mu_g=0.6,
sigma_g=0.15``; ``c_rep=1``; Euler ``dt=0.1``).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]

__all__ = [
    "ParticleLeniaConfig",
    "energy_E",
    "grad_E_analytic",
    "grad_E_fd",
    "initial_positions",
    "total_energy",
]


@dataclass(frozen=True)
class ParticleLeniaConfig:
    """Particle Lenia configuration (SOS-article 2D defaults).

    The canonical LOCAL rule: ``dp_i/dt = -∇E(p_i)``, forward Euler ``dt``. Determinism is via a
    seed-pinned NumPy RNG for the initial cluster + a single-thread serial Taichi force kernel
    (no atomics; explicit f64 accumulators — the lenia f32-downcast lesson). Particle Lenia is a
    dynamical system whose long rollouts can be sensitive; the GOLDEN is the force/symmetry
    INVARIANT, not the trajectory (the charter pointwise-vs-trajectory distinction).
    """

    n_particles: int = 200
    mu_k: float = 4.0
    sigma_k: float = 1.0
    w_k: float = 0.022
    mu_g: float = 0.6
    sigma_g: float = 0.15
    c_rep: float = 1.0
    dt: float = 0.1
    steps: int = 100
    init_radius: float = 12.0
    seed: int = 42


def initial_positions(cfg: ParticleLeniaConfig) -> FloatArray:
    """Seed-pinned random 2D cluster (uniform in a disk of radius ``init_radius``)."""
    rng = np.random.default_rng(cfg.seed)
    n = cfg.n_particles
    # Uniform-in-disk via sqrt-radius; deterministic given the seed.
    theta = rng.uniform(0.0, 2.0 * np.pi, size=n)
    rad = cfg.init_radius * np.sqrt(rng.uniform(0.0, 1.0, size=n))
    pos = np.stack([rad * np.cos(theta), rad * np.sin(theta)], axis=1)
    return np.ascontiguousarray(pos, dtype=np.float64)


def _pair_distances(x: FloatArray, positions: FloatArray) -> tuple[FloatArray, FloatArray]:
    """Return ``(d, r)`` where ``d = x - p_j`` (N,2) and ``r = |x - p_j|`` (N,)."""
    d = x[None, :] - positions
    r = np.sqrt((d * d).sum(axis=1))
    return d, r


def _U_R(
    x: FloatArray, positions: FloatArray, cfg: ParticleLeniaConfig, exclude: int | None
) -> tuple[float, float]:
    _d, r = _pair_distances(x, positions)
    mask = np.ones(len(positions), dtype=bool)
    if exclude is not None:
        mask[exclude] = False
    k = cfg.w_k * np.exp(-((r - cfg.mu_k) ** 2) / (cfg.sigma_k**2))
    u = float(k[mask].sum())
    rep = np.maximum(1.0 - r, 0.0)
    rval = float(0.5 * cfg.c_rep * (rep[mask] ** 2).sum())
    return u, rval


def energy_E(
    x: FloatArray, positions: FloatArray, cfg: ParticleLeniaConfig, exclude: int | None = None
) -> float:
    """Per-particle energy field ``E(x) = R(x) - G(U(x))`` (``exclude`` drops a self-index)."""
    u, rval = _U_R(x, positions, cfg, exclude)
    g = float(np.exp(-((u - cfg.mu_g) ** 2) / (cfg.sigma_g**2)))
    return rval - g


def grad_E_analytic(positions: FloatArray, cfg: ParticleLeniaConfig) -> FloatArray:
    """Closed-form ``∇E(p_i)`` per particle (A1; hand-derived chain rule), shape ``(N, 2)``.

    ``∇E = ∇R - G'(U)·∇U`` with ``∇U = Σ_j K'(r)·(d/r)``, ``∇R = -c_rep·Σ_j max(1-r,0)·(d/r)``,
    summed over ``j ≠ i`` (the singular self-distance is excluded)."""
    n = len(positions)
    grads = np.zeros((n, 2), dtype=np.float64)
    for i in range(n):
        x = positions[i]
        d = x[None, :] - positions
        r = np.sqrt((d * d).sum(axis=1))
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        rr = np.where(r > 0.0, r, 1.0)
        dirv = d / rr[:, None]
        k = cfg.w_k * np.exp(-((r - cfg.mu_k) ** 2) / (cfg.sigma_k**2))
        kp = k * (-2.0 * (r - cfg.mu_k) / (cfg.sigma_k**2))  # dK/dr
        u = float(k[mask].sum())
        d_u = (kp[mask, None] * dirv[mask]).sum(axis=0)
        g = float(np.exp(-((u - cfg.mu_g) ** 2) / (cfg.sigma_g**2)))
        gp = g * (-2.0 * (u - cfg.mu_g) / (cfg.sigma_g**2))
        rep = np.maximum(1.0 - r, 0.0)
        d_r = (cfg.c_rep * rep[mask, None] * (-1.0) * dirv[mask]).sum(axis=0)
        grads[i] = d_r - gp * d_u
    return grads


def grad_E_fd(positions: FloatArray, cfg: ParticleLeniaConfig, eps: float = 1e-6) -> FloatArray:
    """Central-FD ``∇E(p_i)`` per particle (A2; numerical baseline), shape ``(N, 2)``."""
    n = len(positions)
    grads = np.zeros((n, 2), dtype=np.float64)
    for i in range(n):
        for k in range(2):
            xp = positions[i].copy()
            xm = positions[i].copy()
            xp[k] += eps
            xm[k] -= eps
            grads[i, k] = (
                energy_E(xp, positions, cfg, exclude=i) - energy_E(xm, positions, cfg, exclude=i)
            ) / (2.0 * eps)
    return grads


def total_energy(positions: FloatArray, cfg: ParticleLeniaConfig) -> float:
    """Total system energy ``E_total = Σ_i E(p_i)`` (each ``E(p_i)`` excludes its self-index)."""
    return float(
        sum(energy_E(positions[i], positions, cfg, exclude=i) for i in range(len(positions)))
    )
