"""PBT invariant tests (gate 12; spec § 6.6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the lattice-boltzmann-d3q19 sub-phase Stage 1 fills in the bodies
(S1 pattern; conventions doc § M.2 inheritance). The imported
invariants are Hypothesis-decorated callables defined in
:mod:`lattice_boltzmann_d3q19.invariants`.
"""

from __future__ import annotations

from lattice_boltzmann_d3q19.invariants import (  # type: ignore[import-not-found]
    equilibrium_density_moment,
    equilibrium_momentum_moment,
)


def test_equilibrium_density_moment_pbt() -> None:
    """sum(f_eq) = ρ identically (within FP tolerance) for any (ρ, u) in band."""
    equilibrium_density_moment()


def test_equilibrium_momentum_moment_pbt() -> None:
    """sum(c_i · f_eq) = ρ·u per component (within FP tolerance) for any (ρ, u)."""
    equilibrium_momentum_moment()
