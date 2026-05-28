"""Quad4 kernel shape function (Chakazul/Lenia).

Stage 1a — shell. The body raises :class:`NotImplementedError`; Stage
1b lands the Taichi-backed real-space kernel after grep-citing the
Quad4 formula from the vendored Chakazul source (Convention #8).

Mathematical form (charter §1.2 §0.3 SHIFT — hand-derivable, NOT from
memory):

    K(r) = (4 r (1 - r))^4    for r in [0, 1]
    K(r) = 0                  for r > 1 (compact support)

Three canonical anchors (charter §4 — golden-table values):

    K(0)   = (4 · 0 · 1)^4 = 0           (compact-support boundary, NOT a peak)
    K(0.5) = (4 · 0.5 · 0.5)^4 = 1^4 = 1 (PEAK)
    K(1)   = (4 · 1 · 0)^4 = 0           (compact-support boundary)

The §6.3 prose at `docs/phases/phase-3-plan.md:1351` says "kernel at
r=0 (peak K(0))" — Quad4 evaluates K(0)=0, NOT a peak; the peak is at
r=0.5. Stage 1a re-grounds; Stage 1b grounds the three anchors against
the vendored Chakazul derivation.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

_STAGE_1A_SHELL = (
    "Quad4 kernel Stage 1a scaffold: implementation lands at Stage 1b "
    "after grep-citing the formula from vendored Chakazul/Lenia "
    "(SHA adfc542939266de7f4bb7ebb552e8499701ee107). "
    "Expected closed form: K(r) = (4·r·(1-r))^4 for r in [0, 1], else 0."
)


def quad4_kernel(r: NDArray[np.floating]) -> NDArray[np.floating]:
    """Chakazul/Lenia Quad4 kernel shape function ``K(r) = (4 r (1 - r))^4``.

    Parameters
    ----------
    r
        NumPy array of radii in the unit interval (clipped to [0, 1]
        for compact support).

    Returns
    -------
    K(r) evaluated element-wise. Zero outside the compact support.

    Notes
    -----
    Stage 1a — shell only. Body raises :class:`NotImplementedError`.
    """
    raise NotImplementedError(_STAGE_1A_SHELL)
