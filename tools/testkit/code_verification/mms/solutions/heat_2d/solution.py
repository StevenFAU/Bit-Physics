"""Manufactured solution for the 2D heat equation with periodic BCs.

Equation (with manufactured source S):
    T_t = alpha * (T_xx + T_yy) + S(x, y, t)   on (0, Lx) x (0, Ly) x (0, T],
    periodic in x and y.

Manufactured solution (spec-ref.md § 4.4 — the heat_1d lineage extended):
    T(x, y, t) = sin(2 pi x / Lx) * sin(2 pi y / Ly) * cos(t)

The derived non-trivial source term (independent of the FTCS solver) is:
    S(x, y, t) = sin(2 pi x / Lx) * sin(2 pi y / Ly)
                 * [alpha * ((2 pi / Lx)^2 + (2 pi / Ly)^2) * cos(t) - sin(t)]

Periodic on the box (opposite boundaries agree to machine precision) and NOT
a free solution of the unaugmented heat equation, guaranteeing a
non-vanishing source.

See `derivation.md` (committed in this directory) for the derivation; the
runner does not re-derive at test time.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class HeatEq2DSolution:
    """Manufactured solution T(x, y, t) = sin(2 pi x / Lx) sin(2 pi y / Ly) cos(t).

    Attributes:
        alpha: thermal diffusivity (PDE coefficient on the Laplacian). Default 1.0.
        Lx: spatial period in x. Default 1.0.
        Ly: spatial period in y. Default 1.0.
    """

    alpha: float = 1.0
    Lx: float = 1.0
    Ly: float = 1.0

    @property
    def formal_spatial_order(self) -> int:
        """Formal spatial order of the reference FTCS scheme (centered diff)."""
        return 2

    def evaluate(
        self, x: NDArray[np.float64], y: NDArray[np.float64], t: float
    ) -> NDArray[np.float64]:
        """T(x, y, t) = sin(2 pi x / Lx) * sin(2 pi y / Ly) * cos(t)."""
        kx: Final[float] = 2.0 * np.pi / self.Lx
        ky: Final[float] = 2.0 * np.pi / self.Ly
        result: NDArray[np.float64] = np.sin(kx * x) * np.sin(ky * y) * np.cos(t)
        return result

    def source_term(
        self, x: NDArray[np.float64], y: NDArray[np.float64], t: float
    ) -> NDArray[np.float64]:
        """S = sin(kx x) sin(ky y) * [alpha*(kx^2 + ky^2)*cos(t) - sin(t)]."""
        kx: Final[float] = 2.0 * np.pi / self.Lx
        ky: Final[float] = 2.0 * np.pi / self.Ly
        amplitude: float = self.alpha * (kx * kx + ky * ky) * float(np.cos(t)) - float(np.sin(t))
        result: NDArray[np.float64] = np.sin(kx * x) * np.sin(ky * y) * amplitude
        return result

    def boundary_conditions(self) -> dict[str, str]:
        """Descriptor of the BCs (periodic in x and y)."""
        return {
            "x": "periodic",
            "period_x": str(self.Lx),
            "y": "periodic",
            "period_y": str(self.Ly),
        }

    def free_decay_rate(self) -> float:
        """Analytical decay rate of the (1,1) mode under the unforced heat eq:
        alpha * ((2 pi / Lx)^2 + (2 pi / Ly)^2)."""
        kx: Final[float] = 2.0 * np.pi / self.Lx
        ky: Final[float] = 2.0 * np.pi / self.Ly
        return self.alpha * (kx * kx + ky * ky)
