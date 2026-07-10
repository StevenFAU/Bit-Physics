from __future__ import annotations

import numpy as np

from sph_multiphase.reference.kernels import (
    ind_sph_denominator,
    predict_number_density,
    pressure_velocity_delta,
)


def test_pressure_denominator_positive_and_impulse_conserves_momentum() -> None:
    x = np.array([[0.0, 0.0], [0.08, 0.0], [0.16, 0.02]])
    v = np.array([[0.2, 0.0], [-0.1, 0.1], [0.0, -0.1]])
    mass = np.array([1.0, 2.0, 1.0])
    den = ind_sph_denominator(x, mass, 0.12)
    assert np.all(den > 0)
    pred = predict_number_density(x, v, 0.12, 1e-3)
    assert np.isfinite(pred).all()
    dv = pressure_velocity_delta(x, mass, np.array([1.0, 2.0, 3.0]), 0.12, 1e-3)
    assert np.linalg.norm((mass[:, None] * dv).sum(axis=0)) < 1e-12


def test_finite_difference_number_density_rate() -> None:
    x = np.array([[0.0, 0.0], [0.08, 0.01], [0.16, -0.01]])
    v = np.array([[0.1, 0.0], [-0.02, 0.03], [0.0, -0.04]])
    dt = 1e-7
    pred = predict_number_density(x, v, 0.12, dt)
    from sph_multiphase.reference.kernels import number_density

    actual = number_density(x + dt * v, 0.12)
    assert np.max(np.abs(pred - actual)) < 2e-3
