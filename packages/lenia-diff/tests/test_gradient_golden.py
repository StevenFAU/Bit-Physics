"""Gate-4 gradient golden table — ≥3 independent anchors.

The golden table ``tools/testkit/golden/tables/lenia-diff-gradient.json`` stores the
autodiff gradient at canonical points, each verified against an independent reference:

* **A1** closed-form Quad4 growth-parameter analytic ``∂Loss/∂mu``, ``∂Loss/∂sigma`` (smooth
  interior; Chan 2019 + vendored Chakazul grep-cite).
* **A2** central finite-difference baseline (numerical baseline anchor).
* **A3** convolution-Jacobian + growth-deriv chain ``∂Loss/∂A₀`` (initial-field gradient
  through the Quad4 kernel — distinct physical term, parameter class, and method from A1).

The evaluator computes the sim's autodiff gradient per anchor; the verifier compares it
against the stored independent-reference (oracle) values.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from lenia_diff.forward import (
    LeniaDiffConfig,
    periodic_conv,
    quad4_growth,
    quad4_growth_dmu,
    quad4_growth_dsigma,
    quad4_growth_du,
    quad4_kernel_window,
)
from lenia_diff.sim import LeniaGrowthID, LeniaInitialFieldID, smooth_initial_condition

ALGORITHM = "lenia-diff-gradient"


def _cfg(inp: dict[str, Any]) -> LeniaDiffConfig:
    return LeniaDiffConfig(
        grid=inp["grid"],
        R=inp["R"],
        steps=inp["steps"],
        dt=inp["dt"],
        mu=inp["mu"],
        sigma=inp["sigma"],
    )


def _autodiff_growth_grad(inp: dict[str, Any]) -> dict[str, float]:
    """Autodiff (∂Loss/∂mu, ∂Loss/∂sigma) at (mu,sigma); target = forward at perturbed params."""
    cfg = _cfg(inp)
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    truth = LeniaGrowthID(cfg, a0)
    target = truth.final_field(cfg.mu * inp["target_factor"], cfg.sigma * inp["target_factor"])
    prob = LeniaGrowthID(cfg, a0)
    prob.set_target(target)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.mu, cfg.sigma]))
    return {"grad_mu": float(grad[0]), "grad_sigma": float(grad[1])}


def _autodiff_field_grad(inp: dict[str, Any]) -> dict[str, float]:
    """Autodiff ∂Loss/∂A₀ (center + corner cells); target = forward from a perturbed field."""
    cfg = _cfg(inp)
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    prob = LeniaInitialFieldID(cfg)
    target = _forward_field(cfg, a0 * inp["target_factor"])
    grad = prob.grad_wrt_field(a0, target)
    c = cfg.grid // 2
    return {"grad_A0_center": float(grad[c, c]), "grad_A0_corner": float(grad[0, 0])}


def _forward_field(cfg: LeniaDiffConfig, a0: np.ndarray) -> np.ndarray:
    """NumPy forward (oracle): one-step Quad4 conv + growth + clip, ``steps`` times."""
    K = quad4_kernel_window(cfg.R)
    f = np.array(a0, dtype=np.float64)
    for _ in range(cfg.steps):
        u = periodic_conv(f, K, cfg.R)
        f = np.clip(f + cfg.dt * quad4_growth(u, cfg.mu, cfg.sigma), 0.0, 1.0)
    return f


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's autodiff gradient."""
    anchor = inputs["anchor"]
    if anchor in ("a1-growth", "a2-fd-growth"):
        return _autodiff_growth_grad(inputs)
    if anchor == "a3-field-conv":
        return _autodiff_field_grad(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_growth_exact_closed_form() -> None:
    """A1 cross-check: autodiff (∂Loss/∂mu,∂Loss/∂sigma) == one-step Quad4-growth analytic."""
    cfg = LeniaDiffConfig(grid=16, R=3, steps=1, mu=0.30, sigma=0.15)
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    truth = LeniaGrowthID(cfg, a0)
    target = truth.final_field(cfg.mu * 1.05, cfg.sigma * 1.05)
    prob = LeniaGrowthID(cfg, a0)
    prob.set_target(target)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.mu, cfg.sigma]))

    K = quad4_kernel_window(cfg.R)
    u = periodic_conv(a0, K, cfg.R)
    a1 = a0 + cfg.dt * quad4_growth(u, cfg.mu, cfg.sigma)
    resid = 2.0 * (a1 - target)
    an_mu = float(np.sum(resid * cfg.dt * quad4_growth_dmu(u, cfg.mu, cfg.sigma)))
    an_sigma = float(np.sum(resid * cfg.dt * quad4_growth_dsigma(u, cfg.mu, cfg.sigma)))
    assert abs(float(grad[0]) - an_mu) <= 1e-12 + 1e-9 * abs(an_mu)
    assert abs(float(grad[1]) - an_sigma) <= 1e-12 + 1e-9 * abs(an_sigma)


def test_a3_field_conv_exact_closed_form() -> None:
    """A3 cross-check: autodiff ∂Loss/∂A₀ == convolution-Jacobian + growth-deriv adjoint."""
    cfg = LeniaDiffConfig(grid=16, R=3, steps=1, mu=0.30, sigma=0.15)
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    target = _forward_field(cfg, a0 * 1.05)
    prob = LeniaInitialFieldID(cfg)
    grad = prob.grad_wrt_field(a0, target)

    K = quad4_kernel_window(cfg.R)
    u = periodic_conv(a0, K, cfg.R)
    a1 = a0 + cfg.dt * quad4_growth(u, cfg.mu, cfg.sigma)
    resid = 2.0 * (a1 - target)  # dLoss/dA1
    gp = quad4_growth_du(u, cfg.mu, cfg.sigma)
    w = resid * cfg.dt * gp
    # adjoint of U=K*A0: accumulate w*K back into A0 (flip the roll)
    adj = np.zeros_like(a0)
    for di in range(-cfg.R, cfg.R + 1):
        for dj in range(-cfg.R, cfg.R + 1):
            adj += np.roll(np.roll(w, -di, 0), -dj, 1) * K[di + cfg.R, dj + cfg.R]
    analytic = resid + adj
    assert float(np.max(np.abs(grad - analytic))) <= 1e-11 + 1e-9 * float(np.max(np.abs(analytic)))


def test_gradient_matches_finite_difference_report() -> None:
    """A2 anchor mechanism: GradientCheckReport passes (autodiff vs central FD)."""
    cfg = LeniaDiffConfig(grid=16, R=3, steps=2, mu=0.30, sigma=0.15)
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    truth = LeniaGrowthID(cfg, a0)
    target = truth.final_field(cfg.mu * 1.05, cfg.sigma * 1.05)
    prob = LeniaGrowthID(cfg, a0)
    prob.set_target(target)
    report = prob.check_gradient(params={"mu": cfg.mu, "sigma": cfg.sigma}, eps=1e-5, rel_tol=1e-3)
    assert report.passed
    assert report.max_relative_error < 1e-3
