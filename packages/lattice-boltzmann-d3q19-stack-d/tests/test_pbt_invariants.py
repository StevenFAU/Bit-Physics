"""PBT invariant tests (gate 12; spec 6.6), Stack-D.

Two equilibrium-algebra invariants port verbatim from the Phase-1 reference
(identical analytic property; the Stack-D reference's point-eval feq /
density_moment / momentum_moment satisfy them up to FP accumulation residual):

  - ``equilibrium_density_moment``  -- sum(f_i^eq) = rho for any (rho, u) in band.
  - ``equilibrium_momentum_moment`` -- sum(c_i * f_i^eq) = rho * u per component.

Both are Hypothesis-decorated callables defined in
``lattice_boltzmann_d3q19_stack_d.invariants``, which does NOT exist at the
failing-tests commit -- collection fails with ModuleNotFoundError cleanly until
Stage 1b implements it.
"""

from __future__ import annotations

from lattice_boltzmann_d3q19_stack_d.invariants import (  # type: ignore[import-not-found]
    equilibrium_density_moment,
    equilibrium_momentum_moment,
)


def test_equilibrium_density_moment_pbt() -> None:
    """sum(f_eq) = rho identically (within FP tolerance) for any (rho, u) in band."""
    equilibrium_density_moment()


def test_equilibrium_momentum_moment_pbt() -> None:
    """sum(c_i * f_eq) = rho * u per component (within FP tolerance) for any (rho, u)."""
    equilibrium_momentum_moment()
