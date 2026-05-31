"""Property-based invariants for Particle Lenia (PBT source + mutation target).

Two regime-scoped invariants (charter §4.4):

* :func:`force_matches_finite_difference` — the variant-axis invariant: the Taichi engine's
  per-particle force equals ``-∇E(p_i)`` to a relative tolerance vs an INDEPENDENT central FD of the
  energy field. **Regime:** the energy-based LOCAL rule (the force IS the negative local-energy
  gradient). This is the operator's "force = -∇E identity" rigorous core (A1/A2). Re-declared on
  falsification, never widened. **NOTE:** energy MONOTONICITY is NOT asserted — the canonical LOCAL
  rule does not make ``E_total`` monotone (the article contrasts local vs global descent); a
  Lyapunov golden would be unsound here.
* :func:`total_energy_translation_invariant` — a symmetry invariant: ``E_total`` depends only on
  pairwise distances, so ``E_total(P + δ) == E_total(P)`` for any uniform shift ``δ`` (equivalently
  ``Σ_i ∇_{p_i} E_total = 0`` — a Noether-like exactness). **Regime:** any configuration. The LOCAL
  force sum is NOT zero (the local rule does not conserve momentum); the sound anchor is the
  GLOBAL-energy invariance.
"""

from __future__ import annotations

import numpy as np

from .forward import ParticleLeniaConfig, grad_E_fd, total_energy
from .sim import ParticleLeniaSim


def force_matches_finite_difference(
    cfg: ParticleLeniaConfig,
    positions: np.ndarray,
    *,
    rel_tol: float = 1e-5,
    eps: float = 1e-6,
) -> bool:
    """True iff the engine force equals ``-∇E`` (central FD) within ``rel_tol`` (all particles)."""
    sim = ParticleLeniaSim(cfg)
    force = sim.compute_force(np.ascontiguousarray(positions, dtype=np.float64))
    fd = -grad_E_fd(np.ascontiguousarray(positions, dtype=np.float64), cfg, eps=eps)
    denom = max(float(np.max(np.abs(fd))), 1e-6)
    return bool(float(np.max(np.abs(force - fd))) / denom <= rel_tol)


def total_energy_translation_invariant(
    cfg: ParticleLeniaConfig,
    positions: np.ndarray,
    delta: np.ndarray,
    *,
    atol: float = 1e-9,
) -> bool:
    """True iff ``E_total(P + δ) == E_total(P)`` within ``atol`` (translation symmetry)."""
    p = np.ascontiguousarray(positions, dtype=np.float64)
    d = np.asarray(delta, dtype=np.float64)
    e0 = total_energy(p, cfg)
    e1 = total_energy(p + d[None, :], cfg)
    return bool(abs(e1 - e0) <= atol + 1e-9 * abs(e0))
