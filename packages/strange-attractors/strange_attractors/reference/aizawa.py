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


def axis_fixed_points(*, a: float = 0.95, c: float = 0.6) -> list[float]:
    """z-coordinates of the on-axis fixed points (x = y = 0), ascending.

    On the z-axis the x- and y-equations vanish identically and the
    z-equation reduces to c + a*z - z**3/3 = 0, i.e. the depressed cubic
    z**3 - 3*a*z - 3*c = 0. At canonical (a, c) its discriminant is
    positive: three real roots. Only b, d, e, f are absent — the axis
    fixed-point set depends on (a, c) alone.
    """
    roots = np.roots([1.0, 0.0, -3.0 * a, -3.0 * c])
    real = sorted(float(r.real) for r in roots if abs(r.imag) < 1e-9)
    return real


def axis_jacobian_eigenvalues(
    z: float, *, a: float = 0.95, b: float = 0.7, d: float = 3.5
) -> list[complex]:
    """Closed-form eigenvalues of J at an on-axis point (0, 0, z).

    At x = y = 0 the Jacobian is block-diagonal: the (x, y) block is the
    rotation-plus-scale [[z-b, -d], [d, z-b]] with eigenvalues
    (z - b) ± d*i, and the z-row contributes a - z**2.
    """
    return [complex(z - b, d), complex(z - b, -d), complex(a - z * z, 0.0)]


def jacobian(
    point: "np.ndarray | list[float]",
    *,
    a: float = 0.95,
    b: float = 0.7,
    d: float = 3.5,
    e: float = 0.25,
    f: float = 0.1,
) -> np.ndarray:
    """Jacobian of the Aizawa field at ``point`` (c enters only the field)."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [z - b, -d, x],
            [d, z - b, y],
            [
                -2.0 * x * (1.0 + e * z) + 3.0 * f * z * x * x,
                -2.0 * y * (1.0 + e * z),
                a - z * z - e * (x * x + y * y) + f * x**3,
            ],
        ],
        dtype=np.float64,
    )


def divergence(
    point: "np.ndarray | list[float]",
    *,
    a: float = 0.95,
    b: float = 0.7,
    e: float = 0.25,
    f: float = 0.1,
) -> float:
    """div f = 2*(z - b) + a - z**2 - e*(x**2 + y**2) + f*x**3."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return 2.0 * (z - b) + a - z * z - e * (x * x + y * y) + f * x**3
