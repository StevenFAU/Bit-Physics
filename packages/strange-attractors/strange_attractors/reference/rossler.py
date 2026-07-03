"""Rössler 1976 vector field.

Source: Rössler, O. E. (1976), "An equation for continuous chaos",
Phys. Lett. A 57 (5), 397-398, Eq. (1). Canonical (a, b, c) = (0.2,
0.2, 5.7) per Rössler § 2.
"""

from __future__ import annotations

import math

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


def fixed_points(
    *, a: float = 0.2, b: float = 0.2, c: float = 5.7
) -> dict[str, list[float]]:
    """Closed-form fixed points of the Rössler vector field.

    From dx/dt = 0: y = -z; from dy/dt = 0: x = -a*y = a*z; substituting
    into dz/dt = 0 gives a*z**2 - c*z + b = 0, so
    z_± = (c ± sqrt(c**2 - 4*a*b)) / (2*a), with x = a*z and y = -z.
    ``P_in`` is the inner (small-z) saddle-focus the scroll winds around;
    ``P_out`` the outer point. Requires c**2 > 4*a*b (true at canonical).
    """
    disc = c * c - 4.0 * a * b
    if disc <= 0.0:
        raise ValueError(f"c^2 - 4ab = {disc} <= 0: no real fixed points")
    root = math.sqrt(disc)
    z_in = (c - root) / (2.0 * a)
    z_out = (c + root) / (2.0 * a)
    return {
        "P_in": [a * z_in, -z_in, z_in],
        "P_out": [a * z_out, -z_out, z_out],
    }


def jacobian(
    point: "np.ndarray | list[float]", *, a: float = 0.2, b: float = 0.2, c: float = 5.7
) -> np.ndarray:
    """Jacobian of the Rössler field at ``point`` (b enters only via FPs)."""
    _ = b
    x, _y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [0.0, -1.0, -1.0],
            [1.0, a, 0.0],
            [z, 0.0, x - c],
        ],
        dtype=np.float64,
    )


def divergence(
    point: "np.ndarray | list[float]", *, a: float = 0.2, b: float = 0.2, c: float = 5.7
) -> float:
    """div f = tr(J) = a + (x - c) — state-dependent, linear in x."""
    _ = b
    return a + (float(point[0]) - c)
