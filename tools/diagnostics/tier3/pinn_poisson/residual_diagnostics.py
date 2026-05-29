"""Tier-3 PINN-Poisson: residual-boundedness diagnostic.

Verifies the spec-ref §6 envelope-scoped PBT predicates on a captured residual
field: the interior PDE residual ``|Δu_NN - f|`` and the boundary residual
``|u_NN - g|`` each lie within their trained envelope. Sits above the generic
Tier-1 (NaN/Inf) and Tier-2 (scalar-field) diagnostics.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class ResidualBoundReport:
    """Report for :func:`check_residual_bounds`."""

    max_pde_residual: float
    max_boundary_residual: float
    pde_envelope: float
    boundary_envelope: float
    finite: bool
    ok: bool


def check_residual_bounds(
    pde_residual: NDArray[np.floating],
    boundary_residual: NDArray[np.floating],
    *,
    pde_envelope: float,
    boundary_envelope: float,
) -> ResidualBoundReport:
    """Verify both residual fields are finite and within their trained envelopes."""
    pde = np.abs(np.asarray(pde_residual, dtype=np.float64))
    bnd = np.abs(np.asarray(boundary_residual, dtype=np.float64))
    finite = bool(np.isfinite(pde).all() and np.isfinite(bnd).all())
    max_pde = float(pde.max(initial=0.0))
    max_bnd = float(bnd.max(initial=0.0))
    return ResidualBoundReport(
        max_pde_residual=max_pde,
        max_boundary_residual=max_bnd,
        pde_envelope=float(pde_envelope),
        boundary_envelope=float(boundary_envelope),
        finite=finite,
        ok=finite and max_pde <= float(pde_envelope) and max_bnd <= float(boundary_envelope),
    )
