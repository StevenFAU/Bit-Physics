"""Halvorsen cyclically-symmetric vector field.

Cataloged in Sprott, J. C. (2003), *Chaos and Time-Series Analysis*,
Oxford University Press (ISBN 978-0-19-850839-7). Canonical a = 1.4.

Cyclically symmetric under (x, y, z) -> (y, z, x); divergence is the
constant -3*a.
"""

from __future__ import annotations

import numpy as np

CANONICAL_A = 1.4


def halvorsen_field(state: np.ndarray, *, a: float = CANONICAL_A) -> np.ndarray:
    """f = (-a*x - 4y - 4z - y^2, -a*y - 4z - 4x - z^2, -a*z - 4x - 4y - x^2)."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = -a * x - 4.0 * y - 4.0 * z - y * y
    out[1] = -a * y - 4.0 * z - 4.0 * x - z * z
    out[2] = -a * z - 4.0 * x - 4.0 * y - x * x
    return out


def cyclic_transform(state: np.ndarray) -> np.ndarray:
    """The (x, y, z) -> (y, z, x) rotation: f(Cx) = C f(x) exactly."""
    s = np.asarray(state, dtype=np.float64)
    return np.array([s[1], s[2], s[0]], dtype=np.float64)


def origin_jacobian_eigenvalues(*, a: float = CANONICAL_A) -> list[float]:
    """Closed-form eigenvalues of J at the origin.

    J(0) = -a*I - 4*(ones - I) is a symmetric circulant: eigenvalue
    -a - 8 on the diagonal direction (1, 1, 1) and -a + 4 (twice) on
    its orthogonal complement.
    """
    return [-a - 8.0, -a + 4.0, -a + 4.0]


def jacobian(
    point: "np.ndarray | list[float]", *, a: float = CANONICAL_A
) -> np.ndarray:
    """Jacobian of the Halvorsen field at ``point``."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [-a, -4.0 - 2.0 * y, -4.0],
            [-4.0, -a, -4.0 - 2.0 * z],
            [-4.0 - 2.0 * x, -4.0, -a],
        ],
        dtype=np.float64,
    )


def divergence(*, a: float = CANONICAL_A) -> float:
    """div f = tr(J) = -3*a — constant in x."""
    return -3.0 * a
