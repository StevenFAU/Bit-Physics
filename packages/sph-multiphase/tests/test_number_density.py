from __future__ import annotations

import numpy as np

from sph_multiphase.reference.kernels import mass_density_from_number, number_density


def test_equal_volume_density_discontinuity_does_not_change_compression() -> None:
    x = np.array([[-0.1, 0.0], [0.0, 0.0], [0.1, 0.0], [0.2, 0.0]])
    delta = number_density(x, 0.12)
    masses = np.array([1.0, 1.0, 8.0, 8.0])
    rho = mass_density_from_number(delta, masses)
    assert np.array_equal(rho / masses, delta)
    assert rho[2] > rho[1]
