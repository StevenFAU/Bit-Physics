"""Manufactured solution for the 2D Gray-Scott reaction-diffusion equation.

Co-bundled with the 3D Gray-Scott MMS per charter R8 amendment
(Phase 0 RD-2D shipped without an MMS gate; Stage 2 lands the 2D
MMS alongside the 3D extension so Phase 2+ implementation phases of
both sims have a code-verification anchor).

Equations (with manufactured source terms S_u, S_v):
    u_t = D_u * (u_xx + u_yy) - u v^2 + F (1 - u) + S_u
    v_t = D_v * (v_xx + v_yy) + u v^2 - (F + k) v + S_v

Manufactured solution (smooth, L-periodic, bounded in [0.25, 0.75]):

    u(x, y, t) = (sin(pi x / L) cos(pi y / L) cos(t) + 2) / 4
    v(x, y, t) = (cos(pi x / L) sin(pi y / L) sin(t) + 2) / 4

See `derivation.md` for the symbolic derivation.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray

Array2D = NDArray[np.float64]


@dataclass(frozen=True)
class GrayScott2DSolution:
    """Manufactured solution for 2D Gray-Scott."""

    D_u: float = 0.16
    D_v: float = 0.08
    F: float = 0.0367
    k: float = 0.0649
    L: float = 1.0

    @property
    def formal_spatial_order(self) -> int:
        return 2

    def evaluate(self, x: Array2D, y: Array2D, t: float) -> tuple[Array2D, Array2D]:
        kk: Final[float] = float(np.pi) / self.L
        u = (np.sin(kk * x) * np.cos(kk * y) * float(np.cos(t)) + 2.0) / 4.0
        v = (np.cos(kk * x) * np.sin(kk * y) * float(np.sin(t)) + 2.0) / 4.0
        return u, v

    def source_term(self, x: Array2D, y: Array2D, t: float) -> tuple[Array2D, Array2D]:
        """Return (S_u, S_v): the manufactured source terms.

        Derived from S_u = u_t - D_u ∇²u + u v² - F(1-u);
        S_v = v_t - D_v ∇²v - u v² + (F+k) v.
        """
        kk: Final[float] = float(np.pi) / self.L
        sx, cx = np.sin(kk * x), np.cos(kk * x)
        sy, cy = np.sin(kk * y), np.cos(kk * y)
        cos_t, sin_t = float(np.cos(t)), float(np.sin(t))

        u = (sx * cy * cos_t + 2.0) / 4.0
        v = (cx * sy * sin_t + 2.0) / 4.0

        u_t = -sin_t * sx * cy / 4.0
        lap_u = -2.0 * kk * kk * sx * cy * cos_t / 4.0
        v_t = cos_t * cx * sy / 4.0
        lap_v = -2.0 * kk * kk * cx * sy * sin_t / 4.0

        S_u: Array2D = u_t - self.D_u * lap_u + u * v * v - self.F * (1.0 - u)
        S_v: Array2D = v_t - self.D_v * lap_v - u * v * v + (self.F + self.k) * v
        return S_u, S_v

    def boundary_conditions(self) -> dict[str, str]:
        return {"x": "periodic", "y": "periodic", "period": str(self.L)}
