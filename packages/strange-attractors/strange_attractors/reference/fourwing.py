"""Four-wing vector field.

A four-lobed member of the modern low-order chaotic-flow catalog (Sprott,
J. C. (2010), *Elegant Chaos: Algebraically Simple Chaotic Flows*, World
Scientific, ISBN 978-981-283-881-0, catalogs flows of this class).
Canonical (a, b, c, d, e, f) = (0.2, -0.01, 1, -0.4, -1, -1).

The origin is a fixed point with a triangular-by-structure Jacobian
(eigenvalues exactly a, d, e); the field is equivariant under the parity
P = diag(-1, -1, 1) — the two symmetric wing pairs. Divergence is the
constant a + d + e.
"""

from __future__ import annotations

import numpy as np

CANONICAL = {"a": 0.2, "b": -0.01, "c": 1.0, "d": -0.4, "e": -1.0, "f": -1.0}


def four_wing_field(
    state: np.ndarray,
    *,
    a: float = 0.2,
    b: float = -0.01,
    c: float = 1.0,
    d: float = -0.4,
    e: float = -1.0,
    f: float = -1.0,
) -> np.ndarray:
    """f = (a*x + c*y*z, b*x + d*y - x*z, e*z + f*x*y)."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = a * x + c * y * z
    out[1] = b * x + d * y - x * z
    out[2] = e * z + f * x * y
    return out


def parity_transform(state: np.ndarray) -> np.ndarray:
    """The (x, y, z) -> (-x, -y, z) symmetry: f(Px) = P f(x) exactly."""
    out = np.asarray(state, dtype=np.float64).copy()
    out[0] = -out[0]
    out[1] = -out[1]
    return out


def origin_jacobian_eigenvalues(
    *, a: float = 0.2, d: float = -0.4, e: float = -1.0
) -> list[float]:
    """Closed-form eigenvalues of J at the origin: (a, d, e).

    J(0) = [[a, 0, 0], [b, d, 0], [0, 0, e]] is lower triangular, so the
    eigenvalues are its diagonal (b shifts eigenvectors, not values).
    """
    return [a, d, e]


def jacobian(
    point: "np.ndarray | list[float]",
    *,
    a: float = 0.2,
    b: float = -0.01,
    c: float = 1.0,
    d: float = -0.4,
    e: float = -1.0,
    f: float = -1.0,
) -> np.ndarray:
    """Jacobian of the four-wing field at ``point``."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [a, c * z, c * y],
            [b - z, d, -x],
            [f * y, f * x, e],
        ],
        dtype=np.float64,
    )


def divergence(*, a: float = 0.2, d: float = -0.4, e: float = -1.0) -> float:
    """div f = tr(J) = a + d + e — constant in x."""
    return a + d + e
