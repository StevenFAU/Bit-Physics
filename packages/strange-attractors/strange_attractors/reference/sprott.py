"""Sprott-A (conservative, volume-preserving) vector field.

Source: Sprott, J. C. (1994), Phys. Rev. E 50 (2), R647-R650. The
Sprott-A system is volume-preserving: div f = d/dx(y) + d/dy(-x + y*z)
+ d/dz(1 - y^2) = 0 + z + 0 = z, which integrates to zero net
contraction over a Lyapunov-balanced orbit (and is the basis of the
PBT time-reversibility invariant).
"""

from __future__ import annotations

import numpy as np


def sprott_a_field(state: np.ndarray) -> np.ndarray:
    """Sprott-A: dx/dt = y, dy/dt = -x + y*z, dz/dt = 1 - y^2."""
    x, y, z = state[0], state[1], state[2]
    out = np.empty_like(state)
    out[0] = y
    out[1] = -x + y * z
    out[2] = 1.0 - y * y
    return out


def equilibria() -> list[list[float]]:
    """Sprott-A has NO equilibria — the defining structural fact.

    dx/dt = 0 forces y = 0, but dz/dt = 1 - y**2 = 1 != 0 at y = 0: the
    system is inconsistent, so the fixed-point set is empty (all
    trajectories move forever — the conservative chaotic-sea picture).
    """
    return []


def jacobian(point: "np.ndarray | list[float]") -> np.ndarray:
    """Jacobian of the Sprott-A field at ``point``."""
    _x, y, z = float(point[0]), float(point[1]), float(point[2])
    return np.array(
        [
            [0.0, 1.0, 0.0],
            [-1.0, z, y],
            [0.0, -2.0 * y, 0.0],
        ],
        dtype=np.float64,
    )


def divergence(point: "np.ndarray | list[float]") -> float:
    """div f = tr(J) = z — signed local contraction that averages to zero
    over a bounded orbit (the volume-preserving/conservative signature)."""
    return float(point[2])


def parity_transform(state: "np.ndarray") -> np.ndarray:
    """The (x, y, z) -> (-x, -y, z) symmetry: f(Px) = P f(x) exactly."""
    out = np.asarray(state, dtype=np.float64).copy()
    out[0] = -out[0]
    out[1] = -out[1]
    return out
