"""Aizawa 1982 vector field.

Source: Aizawa, Y. (1982), Prog. Theor. Phys. 68 (1), 64-84. Form
commonly cataloged in Sprott 2003 § 5. Canonical
(a, b, c, d, e, f) = (0.95, 0.7, 0.6, 3.5, 0.25, 0.1).
"""

from __future__ import annotations

import numpy as np


def aizawa_field(
    state: np.ndarray,
    *,
    a: float = 0.95,
    b: float = 0.7,
    c: float = 0.6,
    d: float = 3.5,
    e: float = 0.25,
    f: float = 0.1,
) -> np.ndarray:
    """Aizawa vector field per algebraic.md § 4."""
    x, y, z = state[0], state[1], state[2]
    r2 = x * x + y * y
    out = np.empty_like(state)
    out[0] = (z - b) * x - d * y
    out[1] = d * x + (z - b) * y
    out[2] = c + a * z - (z * z * z) / 3.0 - r2 * (1.0 + e * z) + f * z * x * x * x
    return out
