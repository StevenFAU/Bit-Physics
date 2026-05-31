"""Gate-4 gradient golden table - >=3 independent anchors.

The golden table ``tools/testkit/golden/tables/mpm-multimaterial-diff-gradient.json`` stores
the autodiff gradient at canonical points, each verified against an independent reference:

* **A1** ballistic kinematic limit ``dLoss/dv0 = 2(dt*STEPS)^2(v0-v0t)`` (single particle,
  ``F=I``, ``C=0`` => stress == 0, APIC first-moment == 0 => pure free-flight); hand-derived.
* **A2** central finite-difference baseline (numerical baseline anchor; multi-particle,
  grid-coupled).
* **A3** neo-Hookean small-strain constitutive ``d(sigma00)/deps = 2mu+lam`` (distinct
  physical term, parameter class, and method from A1/A2); hand-derived (Stomakhin 2013).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from mpm_multimaterial_diff.forward import (
    MpmDiffConfig,
    cluster_initial_positions,
    neohookean_dstress00_dstrain,
)
from mpm_multimaterial_diff.sim import (
    MpmInitialVelocityID,
    autodiff_dstress00_dstrain,
)

ALGORITHM = "mpm-multimaterial-diff-gradient"


def _cfg(inp: dict[str, Any]) -> MpmDiffConfig:
    return MpmDiffConfig(
        grid_n=inp["grid_n"],
        n_particles=inp["n_particles"],
        steps=inp["steps"],
        dt=inp["dt"],
        youngs_modulus=inp["E"],
        poisson_ratio=inp["nu"],
    )


def _initial_positions(cfg: MpmDiffConfig) -> np.ndarray:
    if cfg.n_particles == 1:
        return np.array([[0.5, 0.5, 0.5]], dtype=np.float64)
    return cluster_initial_positions(cfg)


def _autodiff_v0_grad(inp: dict[str, Any]) -> dict[str, float]:
    """Autodiff ``dLoss/dv0``; target = forward at the perturbed ``v0_target``."""
    cfg = _cfg(inp)
    x0 = _initial_positions(cfg)
    v0 = np.asarray(inp["v0"], dtype=np.float64)
    v0t = np.asarray(inp["v0_target"], dtype=np.float64)
    prob = MpmInitialVelocityID(cfg, x0)
    target = prob.final_positions(v0t)
    grad = prob.grad_wrt_v0(v0, target)
    return {"grad_vx": float(grad[0]), "grad_vy": float(grad[1]), "grad_vz": float(grad[2])}


def _autodiff_stress(inp: dict[str, Any]) -> dict[str, float]:
    cfg = _cfg(inp)
    return {"dstress00_dstrain": float(autodiff_dstress00_dstrain(cfg))}


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's autodiff gradient."""
    anchor = inputs["anchor"]
    if anchor in ("a1-ballistic", "a2-fd"):
        return _autodiff_v0_grad(inputs)
    if anchor == "a3-neohookean":
        return _autodiff_stress(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_ballistic_exact_closed_form() -> None:
    """A1 cross-check: autodiff dLoss/dv0 == 2(dt*STEPS)^2(v0-v0t) for a single particle."""
    cfg = MpmDiffConfig(n_particles=1, steps=8, dt=5e-3)
    x0 = np.array([[0.5, 0.5, 0.5]])
    v0 = np.array([0.40, -0.30, 0.20])
    v0t = np.array([0.50, -0.20, 0.10])
    prob = MpmInitialVelocityID(cfg, x0)
    target = prob.final_positions(v0t)
    grad = prob.grad_wrt_v0(v0, target)
    analytic = 2.0 * (cfg.dt * cfg.steps) ** 2 * (v0 - v0t)
    assert np.max(np.abs(grad - analytic)) <= 1e-12 + 1e-9 * np.max(np.abs(analytic))


def test_a3_neohookean_exact_closed_form() -> None:
    """A3 cross-check: autodiff d(sigma00)/deps == 2mu+lam (neo-Hookean linearization)."""
    cfg = MpmDiffConfig()
    ad = autodiff_dstress00_dstrain(cfg)
    analytic = neohookean_dstress00_dstrain(cfg.mu, cfg.lam)
    assert abs(ad - analytic) <= 1e-9 + 1e-12 * abs(analytic)


def test_a2_gradient_matches_finite_difference_report() -> None:
    """A2 anchor mechanism: GradientCheckReport passes (autodiff vs central FD)."""
    cfg = MpmDiffConfig()
    x0 = cluster_initial_positions(cfg)
    v0 = np.array([0.30, 0.10, -0.20])
    prob = MpmInitialVelocityID(cfg, x0)
    target = prob.final_positions(v0 * 1.05)
    prob.set_target(target)
    report = prob.check_gradient(params={"v0": v0}, eps=1e-6, rel_tol=1e-3)
    assert report.passed
    assert report.max_relative_error < 1e-3
