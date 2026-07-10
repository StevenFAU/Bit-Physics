from sph_multiphase.invariants import (
    gradients_are_antisymmetric,
    number_density_independent_of_phase_mass,
)


def test_number_density_mass_independence() -> None:
    number_density_independent_of_phase_mass()


def test_gradient_antisymmetry() -> None:
    gradients_are_antisymmetric()
