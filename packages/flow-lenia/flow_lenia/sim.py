"""FlowLeniaSim — Stack-D Taichi-backed Flow Lenia (mass-conservative, reintegration tracking).

STAGE 1a SCAFFOLD — the engine ``step`` / ``capture`` raise ``NotImplementedError``; the acceptance
tests (conservation golden, mass/non-negativity/zero-flow anchors, determinism, PBT, capture,
diagnostics) FAIL RED. Stage 1b implements the Taichi convolve -> flow -> reintegration-scatter step
(mass-conserving to summation roundoff; single-thread serial -> bit-identical run-to-run) + the
capture, inverting the suite to GREEN.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from .forward import FlowLeniaConfig, gaussian_kernel, initial_mass

__all__ = ["FlowLeniaSim"]

_NI = "Stage 1a scaffold — implemented at Stage 1b"


class FlowLeniaSim:
    """Stack-D Taichi-backed Flow Lenia sim (mass-conservative reintegration). [Stage 1b]"""

    def __init__(self, config: FlowLeniaConfig) -> None:
        self.config = config
        self._a = initial_mass(config)
        self._kernel = gaussian_kernel(config.kernel_radius, config.kernel_sigma)

    def step(self) -> None:
        """Advance one mass-conservative step (convolve -> flow -> reintegrate). [Stage 1b]"""
        raise NotImplementedError(_NI)

    def mass_field(self) -> NDArray[np.float64]:
        """Return the current mass field as a NumPy 2-D float64 array."""
        return self._a.copy()

    def capture(self, out_dir: str | Path) -> Path:
        """Write the canonical Flow Lenia rollout capture. [Stage 1b]"""
        raise NotImplementedError(_NI)
