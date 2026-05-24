"""Reference-sanity tests for the Stack-D D3Q19 port (gate 5).

Exercise the Stack-D Taichi-DSL reference module directly, pinning the canonical
D3Q19 constants + descriptors the Stack-D port MUST commit to (matching the
Phase-1-frozen NumPy reference: lex-ordered 19-velocity set, Gauss-Hermite
weights, c_s^2 = 1/3, and the two canonical capture descriptors). Mirrors the
Stack-B/Stack-D reference-sanity pattern.

The Stack-D reference module ``lattice_boltzmann_d3q19_stack_d.reference`` does
NOT exist at the failing-tests commit -- collection fails with
ModuleNotFoundError cleanly until Stage 1b implements it.
"""

from __future__ import annotations

from lattice_boltzmann_d3q19_stack_d.reference import (  # type: ignore[import-not-found]
    CANONICAL_DESCRIPTOR_COUETTE,
    CANONICAL_DESCRIPTOR_POISEUILLE,
    CANONICAL_NZ,
    CANONICAL_SEED,
    CS2,
    VELOCITIES,
    WEIGHTS,
    density_moment,
    feq,
)


def test_velocity_set_is_d3q19() -> None:
    """The lattice has exactly 19 velocity directions + 19 weights."""
    assert len(VELOCITIES) == 19
    assert len(WEIGHTS) == 19
    # Rest direction is the zero vector.
    assert tuple(VELOCITIES[0]) == (0, 0, 0)


def test_weights_normalised_and_sound_speed() -> None:
    """Sum of weights is 1; c_s^2 = 1/3 (Gauss-Hermite D3Q19 sub-lattice)."""
    assert sum(WEIGHTS) == 1.0
    assert CS2 == 1.0 / 3.0


def test_rest_equilibrium_recovers_weights() -> None:
    """At rest (rho=1, u=0), f_i^eq = w_i for every direction."""
    f = feq(rho=1.0, u=(0.0, 0.0, 0.0))
    for i, w in enumerate(WEIGHTS):
        assert f[i] == w
    # The f64 19-term reduction recovers rho=1 up to the accumulation residual
    # (~2e-16); the invariant is exact only in real arithmetic (cf. the gate-4a
    # golden test's abs=1e-14 density tolerance).
    assert abs(density_moment(f) - 1.0) <= 1e-14


def test_canonical_descriptors_lock() -> None:
    """Stack-D MUST commit to the Phase-1-frozen canonical descriptors (D4)."""
    assert CANONICAL_DESCRIPTOR_POISEUILLE == "poiseuille-64x32-seed42-step1000"
    assert CANONICAL_DESCRIPTOR_COUETTE == "couette-32x16-seed42-step500"
    assert int(CANONICAL_NZ) == 3
    assert int(CANONICAL_SEED) == 42
