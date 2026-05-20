"""Lorenz 1963 vector field + structural invariants.

Source: Lorenz, E. N. (1963), "Deterministic Nonperiodic Flow",
J. Atmos. Sci. 20 (2), 130-141, Eqs. (25)-(27). Canonical parameters
(sigma, rho, beta) = (10, 28, 8/3) per Lorenz § "Numerical
Integration", pp. 134-135.

The structural invariants ``fixed_points`` / ``origin_jacobian_eigenvalues``
/ ``divergence`` are independent of any numerical integrator and are
the anchors used by ``lorenz-structural.json`` (spec § 6.1 / R9 golden
anchors).
"""

from __future__ import annotations

import math

import numpy as np


def lorenz_field(
    state: np.ndarray,
    *,
    sigma: float = 10.0,
    rho: float = 28.0,
    beta: float = 8.0 / 3.0,
) -> np.ndarray:
    """Lorenz vector field f(x; sigma, rho, beta).

    f(x, y, z) = (sigma * (y - x), x * (rho - z) - y, x * y - beta * z).
    """
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = sigma * (y - x)
    out[1] = x * (rho - z) - y
    out[2] = x * y - beta * z
    return out


def fixed_points(*, sigma: float, rho: float, beta: float) -> dict[str, list[float]]:
    """Closed-form fixed points of the Lorenz vector field.

    For rho > 1: P0 = origin; C_+- = (+-sqrt(beta*(rho-1)), same, rho-1).
    For rho <= 1 the only fixed point is the origin (returned with the
    C_+- coordinates set to the origin to keep the schema stable).
    """
    p0 = [0.0, 0.0, 0.0]
    if rho <= 1.0:
        return {"P0": p0, "C_plus": p0, "C_minus": p0}
    s = math.sqrt(beta * (rho - 1.0))
    return {
        "P0": p0,
        "C_plus": [s, s, rho - 1.0],
        "C_minus": [-s, -s, rho - 1.0],
    }


def origin_jacobian_eigenvalues(
    *, sigma: float, rho: float, beta: float
) -> list[float]:
    """Closed-form eigenvalues of J(P_0) for the Lorenz system.

    The Jacobian at the origin is block-triangular; one eigenvalue is
    -beta. The 2x2 (x, y) block has characteristic polynomial
    lambda^2 + (sigma+1)*lambda + sigma*(1-rho) = 0.
    """
    disc = (sigma + 1.0) ** 2 + 4.0 * sigma * (rho - 1.0)
    sqrt_disc = math.sqrt(disc)
    lam1 = (-(sigma + 1.0) + sqrt_disc) / 2.0
    lam2 = (-(sigma + 1.0) - sqrt_disc) / 2.0
    lam3 = -beta
    return [lam1, lam2, lam3]


def divergence(*, sigma: float, rho: float, beta: float) -> float:
    """Divergence of the Lorenz vector field (= tr(J), constant in x).

    div f = -sigma - 1 - beta. Independent of (x, y, z).
    """
    return -sigma - 1.0 - beta
