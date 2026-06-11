"""Gate-4 gradient golden table - >=3 independent anchors.

The golden table ``tools/testkit/golden/tables/sph-water-diff-gradient.json`` stores the
autodiff gradient at canonical points, each verified against an independent reference:

* **A1** free-fall control gradient ``dLoss/dv0z = 2N(dt*T)^2(v0z - v0z*)`` (exactly linear
  map - gravity and IC cancel; hand-derived kinematics).
* **A2** central finite-difference baseline on the kernel-width loss gradient ``dLoss/dh``
  (numerical baseline anchor; multi-particle cloud, no closed form - distinct method).
* **A3** kernel-width pair-density derivative ``d(rho)/dh = -(m*sigma_3/h^4)(3(1+f(q)) +
  q f'(q))`` (distinct physical term - kernel calculus - distinct parameter - h - hand-derived
  from the Monaghan cubic spline).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from golden import verify_against_table

from sph_water_diff.forward import (
    SphDiffConfig,
    analytic_drho_dh_pair,
    cloud_initial_positions,
    freefall_dloss_dv0z,
)
from sph_water_diff.sim import (
    SphInitialVelocityControl,
    SphKernelWidthID,
    autodiff_drho_dh_pair,
)

ALGORITHM = "sph-water-diff-gradient"


def _autodiff_v0z_grad(inp: dict[str, Any]) -> dict[str, float]:
    """Autodiff ``dLoss/dv0z``; target = forward at the planted ``v0z_target``."""
    cfg = SphDiffConfig(n_particles=inp["n_particles"], steps=inp["steps"], dt=inp["dt"])
    x0 = cloud_initial_positions(cfg)
    prob = SphInitialVelocityControl(cfg, x0)
    target = prob.final_positions(float(inp["v0z_target"]))
    grad = prob.grad_wrt_v0z(float(inp["v0z"]), target)
    return {"grad_v0z": float(grad)}


def _autodiff_h_grad(inp: dict[str, Any]) -> dict[str, float]:
    """Autodiff ``dLoss/dh``; target = densities at the planted ``h_target``."""
    cfg = SphDiffConfig(n_particles=inp["n_particles"])
    x0 = cloud_initial_positions(cfg)
    prob = SphKernelWidthID(cfg, x0)
    target = prob.densities(float(inp["h_target"]))
    grad = prob.grad_wrt_h(float(inp["h"]), target)
    return {"grad_h": float(grad)}


def _autodiff_pair_drho_dh(inp: dict[str, Any]) -> dict[str, float]:
    return {
        "drho_dh": float(
            autodiff_drho_dh_pair(float(inp["r"]), float(inp["h"]), float(inp["mass"]))
        )
    }


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's autodiff gradient."""
    anchor = inputs["anchor"]
    if anchor == "a1-freefall":
        return _autodiff_v0z_grad(inputs)
    if anchor == "a2-fd-kernel-width":
        return _autodiff_h_grad(inputs)
    if anchor == "a3-pair-drho-dh":
        return _autodiff_pair_drho_dh(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_freefall_exact_closed_form() -> None:
    """A1 cross-check: autodiff dLoss/dv0z == 2N(dt*T)^2(v0z - v0z*) exactly (linear map)."""
    cfg = SphDiffConfig()
    x0 = cloud_initial_positions(cfg)
    v0z, v0zt = 0.30, 0.10
    prob = SphInitialVelocityControl(cfg, x0)
    target = prob.final_positions(v0zt)
    grad = prob.grad_wrt_v0z(v0z, target)
    analytic = freefall_dloss_dv0z(cfg.n_particles, cfg.steps, cfg.dt, v0z, v0zt)
    assert abs(grad - analytic) <= 1e-12 + 1e-9 * abs(analytic)


def test_a3_pair_drho_dh_exact_closed_form() -> None:
    """A3 cross-check: autodiff d(rho)/dh == the Monaghan-spline analytic, both branches."""
    for r in (0.025, 0.07):  # q = 0.5 (inner branch) and q = 1.4 (outer branch) at h=0.05
        ad = autodiff_drho_dh_pair(r, 0.05, 1.0e-3)
        analytic = analytic_drho_dh_pair(r, 0.05, 1.0e-3)
        assert abs(ad - analytic) <= 1e-12 + 1e-9 * abs(analytic), f"r={r}"


def test_a2_gradient_matches_finite_difference_report() -> None:
    """A2 anchor mechanism: GradientCheckReport passes for BOTH problems (autodiff vs FD)."""
    cfg = SphDiffConfig()
    x0 = cloud_initial_positions(cfg)

    prob_v = SphInitialVelocityControl(cfg, x0)
    target_pos = prob_v.final_positions(0.30 * 1.05)
    prob_v.set_target(target_pos)
    report_v = prob_v.check_gradient(params={"v0z": 0.30}, eps=1e-6, rel_tol=1e-3)
    assert report_v.passed
    assert report_v.max_relative_error < 1e-3

    prob_h = SphKernelWidthID(cfg, x0)
    target_rho = prob_h.densities(0.05 * 1.10)
    prob_h.set_target(target_rho)
    report_h = prob_h.check_gradient(params={"h": 0.05}, eps=1e-7, rel_tol=1e-3)
    assert report_h.passed
    assert report_h.max_relative_error < 1e-3


def test_density_matches_parent_golden_surface() -> None:
    """The pair-density forward agrees with the parent's pure-Python golden W surface."""
    from sph_water_stack_d.reference.dfsph_taichi import W

    from sph_water_diff.forward import pair_density

    r, h, m = 0.04, 0.05, 1.0e-3
    expected = m * (W(0.0, h) + W(r / h, h))
    assert abs(pair_density(r, h, m) - expected) <= 1e-15
