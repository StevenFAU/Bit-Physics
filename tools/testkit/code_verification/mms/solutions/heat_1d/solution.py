"""Manufactured solution for the 1D heat equation with periodic BCs.

Equation (with manufactured source S):
    u_t = D * u_xx + S(x, t)   on (0, L) x (0, T],  periodic in x of period L.

Manufactured solution:
    u(x, t) = sin(2 pi x / L) * cos(t)

The derived non-trivial source term (independent of the FTCS solver) is:
    S(x, t) = sin(2 pi x / L) * [D * (2 pi / L)^2 * cos(t) - sin(t)]

The function is periodic on [0, L] (so opposite boundaries agree to machine
precision) and is NOT a free solution of the unaugmented heat equation,
guaranteeing a non-vanishing source.

See `derivation.md` (committed in this directory) for the symbolic derivation
emitted by `derive.py`; the runner does not re-derive at test time per spec
§ 2.2.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class HeatEq1DSolution:
    """Manufactured solution u(x, t) = sin(2 pi x / L) * cos(t).

    Attributes:
        D: thermal diffusivity (PDE coefficient on u_xx). Default 1.0.
        L: spatial period. Default 1.0.
    """

    D: float = 1.0
    L: float = 1.0

    @property
    def formal_spatial_order(self) -> int:
        """The formal spatial order of the reference FTCS scheme (centered diff)."""
        return 2

    def evaluate(self, x: NDArray[np.float64], t: float) -> NDArray[np.float64]:
        """u(x, t) = sin(2 pi x / L) * cos(t)."""
        k: Final[float] = 2.0 * np.pi / self.L
        result: NDArray[np.float64] = np.sin(k * x) * np.cos(t)
        return result

    def source_term(self, x: NDArray[np.float64], t: float) -> NDArray[np.float64]:
        """Manufactured source S(x, t) = sin(k x) * [D k^2 cos(t) - sin(t)]."""
        k: Final[float] = 2.0 * np.pi / self.L
        amplitude: float = self.D * k * k * float(np.cos(t)) - float(np.sin(t))
        result: NDArray[np.float64] = np.sin(k * x) * amplitude
        return result

    def boundary_conditions(self) -> dict[str, str]:
        """Return a descriptor of the BCs (periodic in x of period L)."""
        return {"x": "periodic", "period": str(self.L)}

    def free_decay_rate(self) -> float:
        """Analytical decay rate of sin(k x) under the unforced heat eq.

        For zero source and IC sin(2 pi x / L), the exact solution is
            u(x, t) = sin(k x) * exp(-D k^2 t),    k = 2 pi / L.
        Returns D * k^2.
        """
        k: Final[float] = 2.0 * np.pi / self.L
        return self.D * k * k
