"""Thomas cyclically-symmetric vector field.

Source: Thomas, R. (1999), "Deterministic chaos seen in terms of feedback
circuits", Int. J. Bifurcation Chaos 9 (10), 1889-1905,
DOI 10.1142/S0218127499001383. Canonical b = 0.208186 (the widely used
chaotic value; catalogued in Sprott 2003, ISBN 978-0-19-850839-7).

The field is invariant under the cyclic coordinate rotation
(x, y, z) -> (y, z, x) — the basis of one PBT invariant — and its
divergence is the constant -3*b (uniform contraction).
"""

from __future__ import annotations

import math

import numpy as np

CANONICAL_B = 0.208186


def thomas_field(state: np.ndarray, *, b: float = CANONICAL_B) -> np.ndarray:
    """f(x, y, z) = (sin y - b*x, sin z - b*y, sin x - b*z)."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = np.sin(y) - b * x
    out[1] = np.sin(z) - b * y
    out[2] = np.sin(x) - b * z
    return out


def cyclic_transform(state: np.ndarray) -> np.ndarray:
    """The (x, y, z) -> (y, z, x) rotation: f(Cx) = C f(x) exactly."""
    s = np.asarray(state, dtype=np.float64)
    return np.array([s[1], s[2], s[0]], dtype=np.float64)


def diagonal_fixed_points(*, b: float = CANONICAL_B) -> list[list[float]]:
    """Fixed points on the symmetry diagonal x = y = z, i.e. sin u = b*u.

    For 0 < b < 1 there are three: u = 0 and u = ±u* with u* in (pi/2, pi)
    solved by bisection (the transcendental equation has no closed form;
    the bisection IS the reference method, cross-checked by the golden
    generator's mpmath root and by the field-residual test).
    """
    if not 0.0 < b < 1.0:
        raise ValueError(f"diagonal analysis assumes 0 < b < 1, got {b}")
    lo, hi = math.pi / 2, math.pi
    g = lambda u: math.sin(u) - b * u  # noqa: E731 - two-line local
    if g(lo) <= 0:
        # very large b within (0,1): only the origin survives
        return [[0.0, 0.0, 0.0]]
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if g(mid) > 0:
            lo = mid
        else:
            hi = mid
    u = 0.5 * (lo + hi)
    return [[0.0, 0.0, 0.0], [u, u, u], [-u, -u, -u]]


def origin_jacobian_eigenvalues(*, b: float = CANONICAL_B) -> list[complex]:
    """Closed-form eigenvalues of J at the origin: -b + cube roots of 1.

    J(0) = -b*I + P where P is the cyclic permutation matrix
    [[0,1,0],[0,0,1],[1,0,0]]; P's eigenvalues are the cube roots of
    unity, so J(0) has -b + 1 and -b - 1/2 ± (sqrt(3)/2) i.
    """
    return [
        complex(1.0 - b, 0.0),
        complex(-b - 0.5, math.sqrt(3.0) / 2.0),
        complex(-b - 0.5, -math.sqrt(3.0) / 2.0),
    ]


def jacobian(
    point: "np.ndarray | list[float]", *, b: float = CANONICAL_B
) -> np.ndarray:
    """Jacobian of the Thomas field at ``point``."""
    x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [-b, math.cos(y), 0.0],
            [0.0, -b, math.cos(z)],
            [math.cos(x), 0.0, -b],
        ],
        dtype=np.float64,
    )


def divergence(*, b: float = CANONICAL_B) -> float:
    """div f = tr(J) = -3*b — constant in x (uniform contraction)."""
    return -3.0 * b
