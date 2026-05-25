"""Reference-sanity tests for the Stack-E D3Q19 Warp port (gate 5).

Exercise the Stack-E NVIDIA Warp reference module directly (its NumPy-marshalling
wrappers present the Phase-1 API verbatim), pinning the canonical D3Q19 constants
+ descriptors the Stack-E port MUST commit to (matching the Phase-1-frozen NumPy
reference: lex-ordered 19-velocity set, Gauss-Hermite weights, c_s^2 = 1/3, and
the two canonical capture descriptors). Mirrors the lattice-boltzmann-d3q19
Stack-D reference-sanity pattern (same sim; content-equivalent).

The Stack-E reference module ``lattice_boltzmann_d3q19_stack_e.reference`` does
NOT exist at the failing-tests commit (Stage 1a) -- collection fails with
ModuleNotFoundError cleanly until the Stage-1b implementation lands.
"""

from __future__ import annotations

from lattice_boltzmann_d3q19_stack_e.reference import (  # type: ignore[import-not-found]
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
    """Stack-E MUST commit to the Phase-1-frozen canonical descriptors (D4)."""
    assert CANONICAL_DESCRIPTOR_POISEUILLE == "poiseuille-64x32-seed42-step1000"
    assert CANONICAL_DESCRIPTOR_COUETTE == "couette-32x16-seed42-step500"
    assert int(CANONICAL_NZ) == 3
    assert int(CANONICAL_SEED) == 42
