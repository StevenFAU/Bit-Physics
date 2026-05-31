"""ParticleLeniaSim — Stack-D Taichi-backed Particle Lenia (energy-based, LOCAL rule).

STAGE 1a SCAFFOLD — the engine compute surface raises ``NotImplementedError``; the acceptance tests
(gradient golden, force/symmetry anchors, determinism, PBT, capture, diagnostics) FAIL RED. Stage 1b
implements the Taichi analytic-force engine (``f_i = -∇E(p_i)``; explicit f64 accumulators,
single-thread serial → bit-exact) + the forward-Euler rollout + the capture, inverting the suite to
GREEN.

Particle Lenia uses the canonical LOCAL rule (``dp_i/dt = -∇E(p_i)``); the TOTAL energy is NOT
monotonic (no Lyapunov golden). The rigorous moat is the force/symmetry INVARIANT, not the traj.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from .forward import ParticleLeniaConfig, initial_positions

__all__ = ["ParticleLeniaSim"]

_NI = "Stage 1a scaffold — implemented at Stage 1b"


class ParticleLeniaSim:
    """Stack-D Taichi-backed Particle Lenia sim (LOCAL energy-descent rule). [Stage 1b]"""

    def __init__(self, config: ParticleLeniaConfig) -> None:
        self.config = config
        self._pos = initial_positions(config)

    def compute_force(self, positions: NDArray[np.float64] | None = None) -> NDArray[np.float64]:
        """Return the engine per-particle force ``f_i = -∇E(p_i)``. [Stage 1b]"""
        raise NotImplementedError(_NI)

    def step(self) -> None:
        """Advance one forward-Euler step ``p ← p + dt·(-∇E)``. [Stage 1b]"""
        raise NotImplementedError(_NI)

    def positions(self) -> NDArray[np.float64]:
        """Return the current positions ``(N, 2)``."""
        return self._pos.copy()

    def capture(self, out_dir: str | Path) -> Path:
        """Write the canonical Particle Lenia rollout capture. [Stage 1b]"""
        raise NotImplementedError(_NI)
