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
