from __future__ import annotations

import math

from sph_multiphase.reference.kernels import (
    capillary_dt,
    capillary_wave_omega,
    laplace_pressure,
    taylor_deformation,
)


def test_laplace_circle_and_sphere() -> None:
    assert laplace_pressure(0.072, 0.01, 2) == 7.199999999999999
    assert laplace_pressure(0.072, 0.01, 3) == 14.399999999999999


def test_capillary_dispersion_and_timestep_scaling() -> None:
    w = capillary_wave_omega(4.0, 0.05, 1000.0, 800.0)
    assert math.isclose(w * w, 0.05 * 4**3 / 1800.0)
    a = capillary_dt(1000, 800, 0.01, 0.05)
    b = capillary_dt(1000, 800, 0.005, 0.05)
    assert math.isclose(b / a, (0.5) ** 1.5)


def test_taylor_small_deformation_limit() -> None:
    assert math.isclose(taylor_deformation(0.01, 1.0), 0.0109375)
