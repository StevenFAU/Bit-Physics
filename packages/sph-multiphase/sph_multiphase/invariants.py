"""Property invariants for the two-fluid discretization."""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from .reference.kernels import (
    brute_neighbors,
    cubic_grad,
    grid_neighbors,
    number_density,
    surface_forces,
    viscosity_forces,
)


@given(st.integers(0, 2**31 - 1), st.integers(2, 24))
@settings(max_examples=20, deadline=None)
def number_density_independent_of_phase_mass(seed: int, n: int) -> None:
    rng = np.random.default_rng(seed)
    x = rng.uniform(0, 1, (n, 3))
    # Force both material masses to occur; the property is about changing the
    # material labelling while leaving the sampling geometry untouched.
    phase = np.arange(n, dtype=np.uint32) & 1
    d0 = number_density(x, 0.2)
    masses = np.where(phase == 0, 1.0, 10.0)
    assert np.array_equal(d0, number_density(x, 0.2))
    assert not np.array_equal(d0 * masses, d0)


@given(st.integers(0, 2**31 - 1), st.integers(2, 32))
@settings(max_examples=20, deadline=None)
def hash_matches_brute(seed: int, n: int) -> None:
    x = np.random.default_rng(seed).uniform(-1, 1, (n, 3))
    assert grid_neighbors(x, 0.19) == brute_neighbors(x, 0.19)


def pairwise_momentum_is_conserved() -> None:
    x = np.array([[0.0, 0.0], [0.08, 0.01], [0.15, -0.02], [0.05, 0.12]])
    v = np.array([[0.2, 0.1], [-0.1, 0.0], [0.0, -0.2], [0.1, 0.05]])
    ph = np.array([0, 1, 0, 1], dtype=np.uint32)
    mass = np.array([1.0, 2.0, 1.0, 2.0])
    fs = surface_forces(x, ph, mass, 0.12, 0.04)
    fv = viscosity_forces(x, v, ph, mass, (0.2, 1.1), 0.12)
    assert np.linalg.norm(fs.sum(axis=0)) < 1e-12
    assert np.linalg.norm(fv.sum(axis=0)) < 1e-12


def gradients_are_antisymmetric() -> None:
    r = np.array([0.07, -0.11, 0.03])
    assert np.array_equal(cubic_grad(r, 0.2), -cubic_grad(-r, 0.2))
