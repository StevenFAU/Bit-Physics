"""Rössler 1976 vector field.

Source: Rössler, O. E. (1976), "An equation for continuous chaos",
Phys. Lett. A 57 (5), 397-398, Eq. (1). Canonical (a, b, c) = (0.2,
0.2, 5.7) per Rössler § 2.
"""

from __future__ import annotations

import numpy as np


def rossler_field(
    state: np.ndarray,
    *,
    a: float = 0.2,
    b: float = 0.2,
    c: float = 5.7,
) -> np.ndarray:
    """f(x, y, z) = (-y - z, x + a*y, b + z*(x - c))."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = -y - z
    out[1] = x + a * y
    out[2] = b + z * (x - c)
    return out
