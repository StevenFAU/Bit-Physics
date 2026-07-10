from __future__ import annotations

import math

import numpy as np
import pytest

from sph_multiphase.reference.kernels import (
    contact_angle_from_cap,
    grid_neighbors,
    interface_curvature,
    rayleigh_lamb_omega,
    sessile_cap_geometry,
    two_layer_poiseuille,
)


@pytest.mark.parametrize("radius", [0.14, 0.20, 0.27])
def test_circle_curvature_laplace_calibration_across_resolutions(radius: float) -> None:
    estimates = []
    for side in (20, 28, 36):
        spacing = 1.0 / side
        axis = np.arange(0.5 * spacing, 1.0, spacing)
        pos = np.stack(np.meshgrid(axis, axis, indexing="ij"), -1).reshape(-1, 2)
        phase = (np.linalg.norm(pos - 0.5, axis=1) < radius).astype(np.uint32)
        h = 1.25 * spacing
        curvature, weight = interface_curvature(pos, phase, h, grid_neighbors(pos, h))
        mask = weight > 0.5 * weight.max()
        # The reproducing divergence is signed. Particle-scale alternating
        # curvature noise cancels in the pressure jump; taking mean(abs(.))
        # would incorrectly convert that noise into positive curvature.
        estimates.append(abs(float(np.mean(curvature[mask]))))
    expected = 1.0 / radius
    assert abs(estimates[-1] - expected) / expected < 0.12
    assert abs(np.mean(estimates) - expected) / expected < 0.15


def test_sphere_curvature_laplace_calibration_across_resolutions() -> None:
    radius = 0.22
    estimates = []
    for side in (12, 16, 20):
        spacing = 1.0 / side
        axis = np.arange(0.5 * spacing, 1.0, spacing)
        pos = np.stack(np.meshgrid(axis, axis, axis, indexing="ij"), -1).reshape(-1, 3)
        phase = (np.linalg.norm(pos - 0.5, axis=1) < radius).astype(np.uint32)
        h = 1.25 * spacing
        curvature, weight = interface_curvature(pos, phase, h, grid_neighbors(pos, h))
        mask = weight > 0.5 * weight.max()
        estimates.append(abs(float(np.mean(curvature[mask]))))
    expected = 2.0 / radius
    assert abs(estimates[-1] - expected) / expected < 0.12
    assert abs(np.mean(estimates) - expected) / expected < 0.12


def test_two_layer_poiseuille_velocity_and_shear_are_continuous() -> None:
    eps = 1e-7
    y = np.array([-0.4, -eps, 0.0, eps, 0.6])
    u = two_layer_poiseuille(
        y, half_a=0.4, half_b=0.6, mu_a=0.2, mu_b=1.1, pressure_gradient=2.0
    )
    assert abs(u[0]) < 1e-14 and abs(u[-1]) < 1e-14
    assert abs(u[1] - u[3]) < 2e-6
    du_a = (u[2] - u[1]) / eps
    du_b = (u[3] - u[2]) / eps
    assert abs(0.2 * du_a - 1.1 * du_b) < 2e-6


def test_rayleigh_lamb_quadrupole_scaling() -> None:
    a = rayleigh_lamb_omega(2, 0.1, 0.07, 1000.0, 800.0)
    b = rayleigh_lamb_omega(2, 0.2, 0.07, 1000.0, 800.0)
    assert math.isclose(b / a, (0.5) ** 1.5)


@pytest.mark.parametrize("theta", [30.0, 60.0, 90.0, 120.0, 150.0])
def test_sessile_drop_contact_angle_geometry(theta: float) -> None:
    _, base, height = sessile_cap_geometry(0.01, theta)
    assert math.isclose(contact_angle_from_cap(base, height), theta, abs_tol=1e-12)
