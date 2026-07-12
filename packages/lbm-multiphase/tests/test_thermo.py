"""Thermodynamics gates: convention negative controls + coexistence solvers
(spec docs/sim-specs/lattice/lbm-multiphase/spec-ref.md §§ 3.3, 4 B)."""

import numpy as np
import pytest

from lbm_multiphase.thermo import (
    CS_G,
    coexistence_maxwell,
    coexistence_mechanical,
    cs_critical_point,
    gc_analytic_sc94,
    gc_bisection,
    psi_cs,
    psi_exp,
    psi_sc94,
)


def test_gc_negative_control_sc94():
    """Spec § 3.3 / negative control (iv): G_c bisection must reproduce the
    analytic -4/rho0 in THIS package's convention. If this fails, someone
    changed the force/EOS convention — every golden is invalidated."""
    rho_c, g_c = gc_analytic_sc94(1.0)
    assert abs(rho_c - np.log(2.0)) < 1e-12
    assert abs(gc_bisection(psi_sc94(1.0)) - g_c) < 1e-6
    # rho0 scaling
    rho_c2, g_c2 = gc_analytic_sc94(2.0)
    assert abs(rho_c2 - 2.0 * np.log(2.0)) < 1e-12
    assert abs(gc_bisection(psi_sc94(2.0)) - g_c2) < 1e-6


def test_gc_exp_psi():
    """exp-psi critical coupling: G_c = -rho0 e^2 (derived in the spec's
    § 3.3 style; the Tier-A operating point G = -9 sits below it)."""
    assert abs(gc_bisection(psi_exp(1.0, 1.0)) - (-(np.e**2))) < 1e-6


def test_maxwell_equals_mechanical_eps0_for_exp_psi():
    """The Tier-A theorem (spec § 3.2, verifier re-derivation): for
    psi = exp(-rho0/rho), psi'/psi = rho0/rho^2 — the mechanical-stability
    integral with eps = 0 (Guo) IS the Maxwell equal-area rule."""
    for g in (-8.0, -9.0, -12.0):
        cm = coexistence_maxwell(g, psi_exp())
        ch = coexistence_mechanical(g, psi_exp(), 0.0)
        assert abs(cm.rho_v - ch.rho_v) < 1e-10
        assert abs(cm.rho_l - ch.rho_l) < 1e-10


def test_cs_critical_point_anchors():
    """Li-Luo-Li 2012 anchors: T_c = 0.0943, rho_c ~ 0.13044 [3-0]."""
    t_c, rho_c = cs_critical_point()
    assert abs(t_c - 0.0943) < 2e-4
    assert abs(rho_c - 0.13044) < 2e-4


def test_eps_weighted_diverges_from_maxwell_at_low_t():
    """Negative-control (iii) basis: at T/Tc = 0.7 the eps = 1.68 vapor
    target differs from raw Maxwell by > 3% — the two gates are genuinely
    distinguishable there (R3: never gate Tier B on raw Maxwell)."""
    t_c, _ = cs_critical_point()
    pcs = psi_cs(0.7 * t_c)
    ce = coexistence_mechanical(CS_G, pcs, 1.68, rho_lo=1e-3, rho_hi=0.44)
    cm = coexistence_maxwell(CS_G, pcs, rho_lo=1e-3, rho_hi=0.44)
    assert abs(cm.rho_v / ce.rho_v - 1.0) > 0.03
    # liquid branch is insensitive (published behavior)
    assert abs(cm.rho_l / ce.rho_l - 1.0) < 0.005


def test_psi_cs_raises_outside_envelope():
    with pytest.raises(ValueError):
        psi_cs(0.08).f(0.9)  # deep liquid beyond the envelope at low T
