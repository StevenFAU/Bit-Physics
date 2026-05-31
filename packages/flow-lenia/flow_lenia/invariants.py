"""Property-based invariants for Flow Lenia (PBT source + mutation target).

Two regime-scoped invariants (charter §4.4):

* :func:`total_mass_conserved` — the variant-axis invariant (the genuine Flow Lenia delta): the
  reintegration-tracking step conserves total mass ``Σ A`` to **summation roundoff** (NOT bit-exact;
  the operator's honest-tolerance instruction). **Regime:** periodic BC (no mass leaves the torus) —
  the reintegration scheme's exact-conservation domain. This is the sound home of the Phase-3
  plain-Lenia ``mass_approximately_conserved`` invariant that was FALSIFIED under Quad4 (re-routed,
  not widened). Re-declared on falsification, never widened.
* :func:`mass_non_negative` — a forward-physics invariant: the bilinear-splat redistributes
  non-negative mass with non-negative weights → ``A ≥ 0``. **Regime:** non-negative IC.
"""

from __future__ import annotations

import numpy as np

from .forward import FlowLeniaConfig, total_mass
from .sim import FlowLeniaSim


def _step_once(cfg: FlowLeniaConfig, a: np.ndarray) -> np.ndarray:
    sim = FlowLeniaSim(cfg)
    sim._a = np.ascontiguousarray(a, dtype=np.float64)
    sim.step()
    return sim.mass_field()


def total_mass_conserved(
    cfg: FlowLeniaConfig,
    a: np.ndarray,
    *,
    rel_tol: float = 1e-12,
) -> bool:
    """True iff one reintegration step conserves ``Σ A`` within ``rel_tol`` (summation roundoff)."""
    a = np.ascontiguousarray(a, dtype=np.float64)
    m0 = total_mass(a)
    m1 = total_mass(_step_once(cfg, a))
    return bool(abs(m1 - m0) <= rel_tol * max(abs(m0), 1e-12))


def mass_non_negative(cfg: FlowLeniaConfig, a: np.ndarray, *, slack: float = 0.0) -> bool:
    """True iff the reintegration step keeps the mass field non-negative (``A ≥ -slack``)."""
    a = np.maximum(np.ascontiguousarray(a, dtype=np.float64), 0.0)
    return bool(float(np.min(_step_once(cfg, a))) >= -slack)
