"""Dadras–Momeni vector field.

Source: Dadras, S., Momeni, H. R. (2009), "A novel three-dimensional
autonomous chaotic system generating two, three and four-scroll
attractors", Phys. Lett. A 373 (40), 3637-3642,
DOI 10.1016/j.physleta.2009.07.088. Canonical
(p, o, r, c, e) = (3, 2.7, 1.7, 2, 9).

The origin is a fixed point with an upper-triangular-by-blocks Jacobian:
its eigenvalues are exactly (-p, r, -e). Divergence is the constant
-p + r - e.
"""

from __future__ import annotations

import numpy as np

CANONICAL = {"p": 3.0, "o": 2.7, "r": 1.7, "c": 2.0, "e": 9.0}


def dadras_field(
    state: np.ndarray,
    *,
    p: float = 3.0,
    o: float = 2.7,
    r: float = 1.7,
    c: float = 2.0,
    e: float = 9.0,
) -> np.ndarray:
    """f = (y - p*x + o*y*z, r*y - x*z + z, c*x*y - e*z)."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = y - p * x + o * y * z
    out[1] = r * y - x * z + z
    out[2] = c * x * y - e * z
    return out


def origin_jacobian_eigenvalues(
    *, p: float = 3.0, r: float = 1.7, e: float = 9.0
) -> list[float]:
    """Closed-form eigenvalues of J at the origin: (-p, r, -e).

    J(0) = [[-p, 1, 0], [0, r, 1], [0, 0, -e]] is upper triangular, so
    the eigenvalues are its diagonal.
    """
    return [-p, r, -e]


def jacobian(
    point: "np.ndarray | list[float]",
    *,
    p: float = 3.0,
    o: float = 2.7,
    r: float = 1.7,
    c: float = 2.0,
    e: float = 9.0,
) -> np.ndarray:
    """Jacobian of the Dadras field at ``point``."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [-p, 1.0 + o * z, o * y],
            [-z, r, 1.0 - x],
            [c * y, c * x, -e],
        ],
        dtype=np.float64,
    )


def divergence(*, p: float = 3.0, r: float = 1.7, e: float = 9.0) -> float:
    """div f = tr(J) = -p + r - e — constant in x."""
    return -p + r - e
