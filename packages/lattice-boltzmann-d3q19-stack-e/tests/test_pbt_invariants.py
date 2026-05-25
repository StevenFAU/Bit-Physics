"""PBT invariant tests (gate 11; spec § 6.6), Stack-E.

Two equilibrium-algebra invariants port verbatim from the Phase-1 reference
(identical analytic property; the Stack-E Warp reference's point-eval feq /
density_moment / momentum_moment satisfy them up to FP accumulation residual):

  - ``equilibrium_density_moment``  -- sum(f_i^eq) = rho for any (rho, u) in band.
  - ``equilibrium_momentum_moment`` -- sum(c_i * f_i^eq) = rho * u per component.

Both are Hypothesis-decorated callables (>= 50 examples each per gate-11) defined
in ``lattice_boltzmann_d3q19_stack_e.invariants``, which does NOT exist at the
failing-tests commit (Stage 1a) -- collection fails with ModuleNotFoundError
cleanly until Stage 1b implements it.
"""

from __future__ import annotations

from lattice_boltzmann_d3q19_stack_e.invariants import (  # type: ignore[import-not-found]
    equilibrium_density_moment,
    equilibrium_momentum_moment,
)


def test_equilibrium_density_moment_pbt() -> None:
    """sum(f_eq) = rho identically (within FP tolerance) for any (rho, u) in band."""
    equilibrium_density_moment()


def test_equilibrium_momentum_moment_pbt() -> None:
    """sum(c_i * f_eq) = rho * u per component (within FP tolerance) for any (rho, u)."""
    equilibrium_momentum_moment()
