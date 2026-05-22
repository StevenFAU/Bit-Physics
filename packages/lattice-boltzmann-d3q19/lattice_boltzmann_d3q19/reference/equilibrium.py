"""D3Q19 equilibrium distribution + macroscopic moments (gate-5 golden arm).

Implements Qian-d'Humières-Lallemand (1992) eq. (3a) second-order
Maxwell-Boltzmann truncation, matching
``tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`` at
absolute 1e-15 tolerance per the gate-5 (a) contract.

Two callable surfaces:

  - `feq(rho, u)` — point-evaluated equilibrium for ONE (rho, u);
    returns a 19-element list. Consumed by the gate-5 golden test
    and by sim-init at every fluid cell.
  - `feq_field(rho, u)` — field-evaluated equilibrium for entire
    arrays of (rho, u); returns a `(19, *grid)` array. Consumed by
    the BGK collision step.

The 19-direction ordering MUST match
:data:`lattice_boltzmann_d3q19.reference.constants.VELOCITIES` (which
in turn matches the golden JSON's velocity_indexing). Re-using the
``constants`` module avoids the velocity-ordering drift documented as
P25 risk surface (sub-phase plan § 9 R-LBM-4).
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from numpy.typing import NDArray

from .constants import C, CS2, VELOCITIES, W, WEIGHTS


def feq(rho: float, u: Sequence[float]) -> list[float]:
    """Return the 19 f_i^eq values at (rho, u).

    Per Qian et al. 1992 eq. (3a):
        f_i^eq = w_i ρ [1 + (c_i·u)/c_s² + (c_i·u)²/(2 c_s⁴) − u²/(2 c_s²)].

    Used at sim-init for every cell and at the golden gate-5 test.
    """
    ux, uy, uz = float(u[0]), float(u[1]), float(u[2])
    u_sq = ux * ux + uy * uy + uz * uz
    out: list[float] = []
    rho_f = float(rho)
    for c, w in zip(VELOCITIES, WEIGHTS, strict=True):
        cu = c[0] * ux + c[1] * uy + c[2] * uz
        out.append(
            w
            * rho_f
            * (1.0 + cu / CS2 + (cu * cu) / (2.0 * CS2 * CS2) - u_sq / (2.0 * CS2))
        )
    return out


def density_moment(f: Sequence[float]) -> float:
    """Sum-of-distributions; recovers ρ identically per algebraic.md § 4."""
    return float(sum(f))


def momentum_moment(f: Sequence[float]) -> list[float]:
    """Direction-weighted sum; recovers ρu per algebraic.md § 4."""
    mx, my, mz = 0.0, 0.0, 0.0
    for i, fi in enumerate(f):
        mx += VELOCITIES[i][0] * float(fi)
        my += VELOCITIES[i][1] * float(fi)
        mz += VELOCITIES[i][2] * float(fi)
    return [mx, my, mz]


def feq_field(rho: NDArray[np.float64], u: NDArray[np.float64]) -> NDArray[np.float64]:
    """Vectorized equilibrium evaluation on a (Nx, Ny, Nz) grid.

    Inputs:
        rho: shape ``(Nx, Ny, Nz)``.
        u:   shape ``(3, Nx, Ny, Nz)``.

    Returns:
        f_eq with shape ``(19, Nx, Ny, Nz)``.

    Determinism: the 19-direction loop iterates in lex order over
    :data:`C`; addition is associative-but-not-fp-associative, so the
    same iteration order is preserved across runs (P22 + P23
    inheritance — conventions doc § F clauses 1, 2).
    """
    f_eq = np.empty((19, *rho.shape), dtype=np.float64)
    u_sq = (u * u).sum(axis=0)
    inv_cs2 = 1.0 / CS2
    inv_two_cs4 = 1.0 / (2.0 * CS2 * CS2)
    inv_two_cs2 = 1.0 / (2.0 * CS2)
    for i in range(19):
        cu = C[i, 0] * u[0] + C[i, 1] * u[1] + C[i, 2] * u[2]
        f_eq[i] = (
            W[i]
            * rho
            * (1.0 + cu * inv_cs2 + cu * cu * inv_two_cs4 - u_sq * inv_two_cs2)
        )
    return f_eq


def density_field(f: NDArray[np.float64]) -> NDArray[np.float64]:
    """Sum-over-directions; returns shape ``(Nx, Ny, Nz)`` density field."""
    return f.sum(axis=0)


def momentum_field(f: NDArray[np.float64]) -> NDArray[np.float64]:
    """Direction-weighted sum; returns shape ``(3, Nx, Ny, Nz)`` momentum field.

    Determinism: 19-direction sum executed in lex order via
    :data:`C` matrix slicing; no Python-side iteration shuffle.
    """
    return np.einsum("id,iabc->dabc", C.astype(np.float64), f)


__all__ = [
    "density_field",
    "density_moment",
    "feq",
    "feq_field",
    "momentum_field",
    "momentum_moment",
]
