"""Gate-4 gradient golden table — ≥3 independent anchors.

The golden table ``tools/testkit/golden/tables/reaction-diffusion-2d-diff-gradient.json``
stores the autodiff gradient ``∂Loss/∂param`` at canonical points, each verified
against an independent reference:

* **A1** discrete-Fourier-eigenmode analytic ``∂Loss/∂D_u`` (exact for the discrete
  periodic Laplacian — Strauss *PDE* 2e §4.1 + Ch. 5).
* **A2** central finite-difference baseline (the numerical baseline anchor).
* **A3** reaction-ODE-limit analytic ``∂Loss/∂F`` (well-mixed; independent of A1 in
  physical term, parameter, and method).

The evaluator below computes the sim's autodiff gradient per anchor; the verifier
compares it against the stored independent-reference values.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from reaction_diffusion_2d_diff.forward import (
    RD2DDiffConfig,
    discrete_laplacian_eigenvalue,
    fourier_eigenmode,
)
from reaction_diffusion_2d_diff.sim import (
    RD2DDiffusionID,
    WellMixedFID,
    uniform_initial_condition,
)

ALGORITHM = "reaction-diffusion-2d-diff-gradient"


def _grad_du_eigenmode(inp: dict[str, Any]) -> float:
    """Autodiff ∂Loss/∂D_u in the pure-diffusion eigenmode regime (target ≡ 0)."""
    cfg = RD2DDiffConfig(
        n=inp["n"],
        steps=inp["steps"],
        dt=inp["dt"],
        dx=inp["dx"],
        Du=inp["Du"],
        reaction=False,
    )
    phi = fourier_eigenmode(inp["mx"], inp["my"], cfg.n)
    v0 = np.zeros((cfg.n, cfg.n), dtype=np.float64)
    prob = RD2DDiffusionID(cfg, phi, v0)
    prob.set_target(np.zeros((cfg.n, cfg.n), dtype=np.float64))
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.Du]))
    return float(grad[0])


def _grad_du_full_gs(inp: dict[str, Any]) -> float:
    """Autodiff ∂Loss/∂D_u in the full Gray-Scott regime (target = forward at Du·f)."""
    from reaction_diffusion_2d_diff.sim import smooth_initial_condition

    cfg = RD2DDiffConfig(n=inp["n"], steps=inp["steps"], dt=inp["dt"], dx=inp["dx"], Du=inp["Du"])
    u0, v0 = smooth_initial_condition(cfg.n)
    truth = RD2DDiffusionID(cfg, u0, v0)
    target = truth.final_u(cfg.Du * inp["target_factor"])
    prob = RD2DDiffusionID(cfg, u0, v0)
    prob.set_target(target)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.Du]))
    return float(grad[0])


def _grad_f_wellmixed(inp: dict[str, Any]) -> float:
    """Autodiff ∂Loss/∂F in the well-mixed (uniform) reaction regime."""
    cfg = RD2DDiffConfig(n=inp["n"], steps=inp["steps"], dt=inp["dt"], F=inp["F"], k=inp["k"])
    u0, v0 = uniform_initial_condition(cfg.n, inp["u_val"], inp["v_val"])
    truth = WellMixedFID(cfg, u0, v0)
    spec = truth.params_spec()
    spec.pack({"F": cfg.F * inp["target_factor"]})
    truth.forward(spec.flat, None)
    target = truth.u.to_numpy()[cfg.steps].copy()
    prob = WellMixedFID(cfg, u0, v0)
    prob.set_target(target)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.F]))
    return float(grad[0])


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's autodiff gradient."""
    anchor = inputs["anchor"]
    if anchor == "a1-eigenmode-diffusion":
        return {"grad_Du": _grad_du_eigenmode(inputs)}
    if anchor == "a2-fd-full-gs":
        return {"grad_Du": _grad_du_full_gs(inputs)}
    if anchor == "a3-wellmixed-reaction":
        return {"grad_F": _grad_f_wellmixed(inputs)}
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_eigenmode_exact_closed_form() -> None:
    """A1 cross-check: autodiff == closed-form discrete-eigenmode gradient (exact)."""
    cfg = RD2DDiffConfig(n=16, steps=8, dt=0.25, dx=1.0, Du=0.16, reaction=False)
    mx, my = 1, 2
    phi = fourier_eigenmode(mx, my, cfg.n)
    lam = discrete_laplacian_eigenvalue(mx, my, cfg.n, cfg.dx)
    prob = RD2DDiffusionID(cfg, phi, np.zeros((cfg.n, cfg.n)))
    prob.set_target(np.zeros((cfg.n, cfg.n)))
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.Du]))
    amp = 1.0 + cfg.dt * cfg.Du * lam
    analytic = 2 * cfg.steps * amp ** (2 * cfg.steps - 1) * (cfg.dt * lam) * float(np.sum(phi**2))
    assert abs(float(grad[0]) - analytic) / abs(analytic) < 1e-10


def test_a3_wellmixed_exact_closed_form() -> None:
    """A3 cross-check: autodiff == closed-form reaction-ODE gradient (exact)."""
    cfg = RD2DDiffConfig(n=8, steps=1, dt=0.25, F=0.0367, k=0.0649)
    u_val, v_val = 0.5, 0.25
    u0, v0 = uniform_initial_condition(cfg.n, u_val, v_val)
    truth = WellMixedFID(cfg, u0, v0)
    spec = truth.params_spec()
    spec.pack({"F": cfg.F * 1.1})
    truth.forward(spec.flat, None)
    target = truth.u.to_numpy()[cfg.steps].copy()
    prob = WellMixedFID(cfg, u0, v0)
    prob.set_target(target)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.F]))
    uvv = u_val * v_val * v_val
    u1 = u_val + cfg.dt * (-uvv + cfg.F * (1.0 - u_val))
    analytic = cfg.n**2 * 2 * (u1 - float(target[0, 0])) * cfg.dt * (1.0 - u_val)
    assert abs(float(grad[0]) - analytic) <= 1e-12 + 1e-9 * abs(analytic)


def test_gradient_matches_finite_difference_report() -> None:
    """A2 anchor mechanism: GradientCheckReport passes (autodiff vs central FD)."""
    cfg = RD2DDiffConfig(n=16, steps=8)
    from reaction_diffusion_2d_diff.sim import smooth_initial_condition

    u0, v0 = smooth_initial_condition(cfg.n)
    truth = RD2DDiffusionID(cfg, u0, v0)
    target = truth.final_u(cfg.Du * 1.05)
    prob = RD2DDiffusionID(cfg, u0, v0)
    prob.set_target(target)
    report = prob.check_gradient(params={"Du": cfg.Du}, eps=1e-5, rel_tol=1e-3)
    assert report.passed
    assert report.max_relative_error < 1e-3
