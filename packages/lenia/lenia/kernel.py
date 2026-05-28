"""Quad4 kernel shape function (Chakazul/Lenia).

Stage 1b implementation. Closed form grep-cited from the vendored
Chakazul source at SHA ``adfc542939266de7f4bb7ebb552e8499701ee107``
(Convention #8, NOT from memory):

- ``references/Chakazul-Lenia/Python/LeniaF.py:493`` —
  ``1: lambda r: (r>0)*(r<1) * (4 * r * (1-r))**4,  # polynomial (quad4)``
- ``references/Chakazul-Lenia/Python/LeniaND.py:273`` —
  ``0: lambda r: (4 * r * (1-r))**4,  # polynomial (quad4)``

The compact-support form (``references/Chakazul-Lenia/Python/LeniaF.py:493``) is the implementation
contract: the kernel is zero strictly outside ``(0, 1)``; the
``(r>0)*(r<1)`` mask is the citation anchor. We tighten the boundary
to ``[0, 1]`` (closed interval) here because the three golden anchors
include ``K(0) = 0`` and ``K(1) = 0`` (boundary values, both equal
zero anyway by the polynomial form), and the closed mask is more
intuitive for the canonical-anchor tests.

Three canonical anchors (hand-derivable from the closed form +
verified against the vendored Chakazul polynomial):

    K(0)   = (4 · 0 · 1)^4 = 0           (compact-support boundary)
    K(0.5) = (4 · 0.5 · 0.5)^4 = 1^4 = 1 (PEAK)
    K(1)   = (4 · 1 · 0)^4 = 0           (compact-support boundary)

The §6.3 prose at ``docs/phases/phase-3-plan.md:1351`` says "kernel
at r=0 (peak K(0))" — Quad4 evaluates K(0)=0, NOT a peak; the peak
is at r=0.5. SHIFTED-surface-only per charter §1.2 + §0.3; NO plan
edit.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def quad4_kernel(r: NDArray[np.floating]) -> NDArray[np.floating]:
    """Chakazul/Lenia Quad4 kernel shape function ``K(r) = (4 r (1 - r))^4``.

    Parameters
    ----------
    r
        NumPy array of radii (any shape).

    Returns
    -------
    K(r) evaluated element-wise. Zero outside ``[0, 1]`` (compact
    support).
    """
    r_arr = np.asarray(r, dtype=np.float64)
    inside = (r_arr >= 0.0) & (r_arr <= 1.0)
    base = 4.0 * r_arr * (1.0 - r_arr)
    return np.where(inside, base**4, 0.0)
