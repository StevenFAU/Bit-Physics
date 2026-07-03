"""Chen vector field.

Source: Chen, G., Ueta, T. (1999), "Yet another chaotic attractor",
Int. J. Bifurcation Chaos 9 (7), 1465-1466, DOI 10.1142/S0218127499001024.
Canonical (a, b, c) = (35, 3, 28).

Structurally a Lorenz sibling: fixed points are the origin plus
C± = (±sqrt(b*(2c - a)), ±sqrt(b*(2c - a)), 2c - a); the origin Jacobian
is block-triangular with one eigenvalue -b and a closed-form quadratic
pair. Divergence is the constant c - a - b. The system is FAST at
canonical parameters — the calibrated dt is 0.002 (spec § 3.3.1 note).
"""

from __future__ import annotations

import math

import numpy as np


def chen_field(
    state: np.ndarray,
    *,
    a: float = 35.0,
    b: float = 3.0,
    c: float = 28.0,
) -> np.ndarray:
    """f = (a*(y - x), (c - a)*x - x*z + c*y, x*y - b*z)."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = a * (y - x)
    out[1] = (c - a) * x - x * z + c * y
    out[2] = x * y - b * z
    return out


def fixed_points(
    *, a: float = 35.0, b: float = 3.0, c: float = 28.0
) -> dict[str, list[float]]:
    """Closed-form fixed points: origin and C± at z = 2c - a.

    From dx/dt = 0: y = x; substituting into dz/dt = 0 gives z = x^2/b;
    dy/dt = 0 then yields x^2 = b*(2c - a) (requires 2c > a, true at
    canonical). Mirrors the Lorenz C± algebra.
    """
    p0 = [0.0, 0.0, 0.0]
    zc = 2.0 * c - a
    if b * zc <= 0.0:
        return {"P0": p0, "C_plus": p0, "C_minus": p0}
    s = math.sqrt(b * zc)
    return {"P0": p0, "C_plus": [s, s, zc], "C_minus": [-s, -s, zc]}


def origin_jacobian_eigenvalues(
    *, a: float = 35.0, b: float = 3.0, c: float = 28.0
) -> list[float]:
    """Closed-form eigenvalues of J at the origin.

    Block-triangular like Lorenz: -b plus the roots of
    lambda^2 + (a - c)*lambda - a*(2c - a) = 0 from the (x, y) block
    [[-a, a], [c - a, c]].
    """
    disc = (a - c) ** 2 + 4.0 * a * (2.0 * c - a)
    root = math.sqrt(disc)
    lam1 = (-(a - c) + root) / 2.0
    lam2 = (-(a - c) - root) / 2.0
    return [lam1, lam2, -b]


def jacobian(
    point: "np.ndarray | list[float]",
    *,
    a: float = 35.0,
    b: float = 3.0,
    c: float = 28.0,
) -> np.ndarray:
    """Jacobian of the Chen field at ``point``."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [-a, a, 0.0],
            [c - a - z, c, -x],
            [y, x, -b],
        ],
        dtype=np.float64,
    )


def divergence(*, a: float = 35.0, b: float = 3.0, c: float = 28.0) -> float:
    """div f = tr(J) = c - a - b — constant in x."""
    return c - a - b
