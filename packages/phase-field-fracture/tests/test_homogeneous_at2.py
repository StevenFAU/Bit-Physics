"""Homogeneous-state fixed point: BOTH damage updates (gradient flow and
converged elliptic) must relax a uniform block to the analytic AT2
equilibrium d = 2H/(1 + 2H) — the closed-form anchor of the whole damage
kernel (spec-ref.md § 7.G)."""

from __future__ import annotations

import numpy as np
from phase_field_fracture.reference import (
    at2_homogeneous_damage,
    elliptic_damage_solve,
    gradient_flow_damage,
)


def test_gradient_flow_relaxes_to_homogeneous_equilibrium() -> None:
    h_vals = (0.05, 0.1875, 0.5, 2.0)  # spans below/above H_crit(AT1)=3/16
    for h_val in h_vals:
        h_field = np.full((16, 16), h_val)
        d = np.zeros((16, 16))
        for _ in range(4000):
            d = gradient_flow_damage(d, h_field, m=1.0, h=0.5)
        want = at2_homogeneous_damage(np.asarray(h_val))
        assert abs(float(d.max()) - float(want)) <= 1e-6, (h_val, d.max(), want)
        assert abs(float(d.min()) - float(want)) <= 1e-6


def test_elliptic_solve_hits_homogeneous_equilibrium() -> None:
    for h_val in (0.05, 0.5, 2.0):
        h_field = np.full((16, 16), h_val)
        d0 = np.zeros((16, 16))
        d, iters = elliptic_damage_solve(d0, h_field, h=0.5)
        want = float(at2_homogeneous_damage(np.asarray(h_val)))
        assert abs(float(d.max()) - want) <= 1e-9, (h_val, d.max(), want)
        assert iters < 400


def test_gradient_flow_infinite_mobility_is_jacobi_sweep() -> None:
    """As m -> inf the fused update approaches one damped-Jacobi sweep of
    the elliptic optimality system: iterating it must converge to the SAME
    fixed point as CG (the § 3.5 structural identity)."""
    rng_free = np.linspace(0.0, 3.0, 64).reshape(8, 8)  # deterministic field
    h_field = rng_free
    d_jac = np.zeros((8, 8))
    for _ in range(6000):
        d_jac = gradient_flow_damage(d_jac, h_field, m=1e9, h=0.5)
    d_cg, _ = elliptic_damage_solve(np.zeros((8, 8)), h_field, h=0.5, rel_tol=1e-13)
    assert float(np.max(np.abs(d_jac - d_cg))) <= 1e-6
