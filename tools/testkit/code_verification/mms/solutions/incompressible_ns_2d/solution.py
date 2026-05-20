"""Manufactured solution for the 2D incompressible Navier-Stokes equation.

Equations (with manufactured source terms S_u, S_v):
    u_t + u u_x + v u_y = -p_x / rho + nu (u_xx + u_yy) + S_u
    v_t + u v_x + v v_y = -p_y / rho + nu (v_xx + v_yy) + S_v
    u_x + v_y = 0   (incompressibility — divergence-free constraint)

Manufactured solution (Taylor-Green-style, divergence-free, periodic
on [0, 1]^2; dimensionless rho = 1):

    u(x, y, t) = sin(2 pi x) cos(2 pi y) cos(t)
    v(x, y, t) = -cos(2 pi x) sin(2 pi y) cos(t)
    p(x, y, t) = -(1/4) (cos(4 pi x) + cos(4 pi y)) cos^2(t)

The velocity field is exactly divergence-free; the pressure is a
Taylor-Green-like pressure that produces a non-trivial gradient.

See `derivation.md` for the symbolic derivation; the runner does
not re-derive at test time per spec § 2.2.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray

Array2D = NDArray[np.float64]

TWO_PI: Final[float] = 2.0 * float(np.pi)
FOUR_PI: Final[float] = 4.0 * float(np.pi)
EIGHT_PI2: Final[float] = 8.0 * float(np.pi) * float(np.pi)


@dataclass(frozen=True)
class IncompressibleNS2DSolution:
    """Taylor-Green-style manufactured solution for 2D incompressible NS.

    Attributes:
        nu: kinematic viscosity.
        L: spatial period (1.0 canonical for the dimensionless form).
        rho: density (1.0 canonical for the dimensionless form).
    """

    nu: float = 0.01
    L: float = 1.0
    rho: float = 1.0

    @property
    def formal_spatial_order(self) -> int:
        """MacCormack-corrected semi-Lagrangian advection is second-order in space."""
        return 2

    def evaluate(self, x: Array2D, y: Array2D, t: float) -> tuple[Array2D, Array2D, Array2D]:
        """Return (u, v, p) at (x, y, t).

        Assumes L = 1; for other L scale x, y accordingly before calling.
        """
        sx, cx = np.sin(TWO_PI * x), np.cos(TWO_PI * x)
        sy, cy = np.sin(TWO_PI * y), np.cos(TWO_PI * y)
        cos_t = float(np.cos(t))
        u = sx * cy * cos_t
        v = -cx * sy * cos_t
        p = -0.25 * (np.cos(FOUR_PI * x) + np.cos(FOUR_PI * y)) * (cos_t * cos_t)
        return u, v, p

    def source_term(self, x: Array2D, y: Array2D, t: float) -> tuple[Array2D, Array2D]:
        """Return (S_u, S_v): the manufactured source terms.

        Closed-form (see derivation.md § 3):
            S_u = -sin(2 pi x) cos(2 pi y) sin(t)
                + 2 pi sin(4 pi x) cos^2(t)
                + 8 pi^2 nu sin(2 pi x) cos(2 pi y) cos(t)
            S_v =  cos(2 pi x) sin(2 pi y) sin(t)
                + 2 pi sin(4 pi y) cos^2(t)
                - 8 pi^2 nu cos(2 pi x) sin(2 pi y) cos(t)
        """
        sx, cx = np.sin(TWO_PI * x), np.cos(TWO_PI * x)
        sy, cy = np.sin(TWO_PI * y), np.cos(TWO_PI * y)
        s4x, s4y = np.sin(FOUR_PI * x), np.sin(FOUR_PI * y)
        cos_t, sin_t = float(np.cos(t)), float(np.sin(t))
        cos2_t = cos_t * cos_t

        S_u: Array2D = (
            -sx * cy * sin_t + TWO_PI * s4x * cos2_t + EIGHT_PI2 * self.nu * sx * cy * cos_t
        )
        S_v: Array2D = (
            cx * sy * sin_t + TWO_PI * s4y * cos2_t - EIGHT_PI2 * self.nu * cx * sy * cos_t
        )
        return S_u, S_v

    def boundary_conditions(self) -> dict[str, str]:
        return {"x": "periodic", "y": "periodic", "period": str(self.L)}
