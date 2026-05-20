"""Manufactured solution for the 3D Gray-Scott reaction-diffusion equation.

Equations (with manufactured source terms S_u, S_v):
    u_t = D_u * (u_xx + u_yy + u_zz) - u v^2 + F (1 - u) + S_u
    v_t = D_v * (v_xx + v_yy + v_zz) + u v^2 - (F + k) v + S_v

Manufactured solution (smooth, L-periodic in each spatial axis,
t-dependent, bounded in [0.25, 0.75] for the canonical L = 1):

    u(x, y, z, t) = (sin(pi x / L) cos(pi y / L) sin(pi z / L) cos(t) + 2) / 4
    v(x, y, z, t) = (cos(pi x / L) sin(pi y / L) cos(pi z / L) sin(t) + 2) / 4

These are bounded approximately in [0.25, 0.75]; the Gray-Scott
nonlinearity ``-u v^2 + F(1-u)`` is therefore well-defined and the
manufactured solution stays away from the singular boundary of the
physical (u, v) ∈ [0, 1] regime. The source terms S_u, S_v are
derived from the PDE residuals; see `derivation.md` for the SymPy
expressions.

See `derivation.md` for the symbolic SymPy derivation; the runner
does not re-derive at test time per spec § 2.2.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray

Array3D = NDArray[np.float64]


@dataclass(frozen=True)
class GrayScott3DSolution:
    """Manufactured solution for 3D Gray-Scott.

    Attributes:
        D_u, D_v: diffusion coefficients (Pearson 1993 canonical 0.16, 0.08).
        F, k: feed and kill rates (Pearson 1993 canonical 0.0367, 0.0649).
        L: spatial period (1.0 canonical).
    """

    D_u: float = 0.16
    D_v: float = 0.08
    F: float = 0.0367
    k: float = 0.0649
    L: float = 1.0

    @property
    def formal_spatial_order(self) -> int:
        """Formal order of the reference 7-point centered-Laplacian scheme."""
        return 2

    def _u(self, x: Array3D, y: Array3D, z: Array3D, t: float) -> Array3D:
        kk: Final[float] = float(np.pi) / self.L
        amp: Array3D = np.sin(kk * x) * np.cos(kk * y) * np.sin(kk * z)
        return (amp * float(np.cos(t)) + 2.0) / 4.0

    def _v(self, x: Array3D, y: Array3D, z: Array3D, t: float) -> Array3D:
        kk: Final[float] = float(np.pi) / self.L
        amp: Array3D = np.cos(kk * x) * np.sin(kk * y) * np.cos(kk * z)
        return (amp * float(np.sin(t)) + 2.0) / 4.0

    def evaluate(self, x: Array3D, y: Array3D, z: Array3D, t: float) -> tuple[Array3D, Array3D]:
        """Return (u, v) at the given (x, y, z, t)."""
        return self._u(x, y, z, t), self._v(x, y, z, t)

    def source_term(self, x: Array3D, y: Array3D, z: Array3D, t: float) -> tuple[Array3D, Array3D]:
        """Return (S_u, S_v): the manufactured source terms.

        Derived from S_u = u_t - D_u ∇²u + u v² - F(1-u);
        S_v = v_t - D_v ∇²v - u v² + (F+k) v.
        """
        kk: Final[float] = float(np.pi) / self.L
        sx, cx = np.sin(kk * x), np.cos(kk * x)
        sy, cy = np.sin(kk * y), np.cos(kk * y)
        sz, cz = np.sin(kk * z), np.cos(kk * z)
        cos_t, sin_t = float(np.cos(t)), float(np.sin(t))

        u = (sx * cy * sz * cos_t + 2.0) / 4.0
        v = (cx * sy * cz * sin_t + 2.0) / 4.0

        # u_t = -sin(t) * sx*cy*sz / 4
        u_t = -sin_t * sx * cy * sz / 4.0
        # Laplacian of sx*cy*sz is -3 k^2 * sx*cy*sz
        lap_u = -3.0 * kk * kk * sx * cy * sz * cos_t / 4.0
        # v_t = cos(t) * cx*sy*cz / 4
        v_t = cos_t * cx * sy * cz / 4.0
        lap_v = -3.0 * kk * kk * cx * sy * cz * sin_t / 4.0

        S_u: Array3D = u_t - self.D_u * lap_u + u * v * v - self.F * (1.0 - u)
        S_v: Array3D = v_t - self.D_v * lap_v - u * v * v + (self.F + self.k) * v
        return S_u, S_v

    def boundary_conditions(self) -> dict[str, str]:
        return {"x": "periodic", "y": "periodic", "z": "periodic", "period": str(self.L)}
