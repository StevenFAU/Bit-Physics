"""Gate-4 gradient golden table — ≥3 independent anchors.

The golden table ``tools/testkit/golden/tables/eulerian-smoke-diff-gradient.json`` stores the
``wp.Tape`` autodiff gradient at canonical points, each verified against an independent reference:

* **A1** linear-advection-operator analytic ``∂Loss/∂u₀ = 2 (Mᵏ)ᵀ(Mᵏ u₀ - target)`` (the bilinear
  SL-advect map is the exact linear operator ``M`` for a constant velocity; Stam 1999); the NumPy
  ``M`` mirror is bit-faithful to the Warp engine → autodiff == analytic to ~4e-15.
* **A2** central finite-difference baseline (numerical baseline anchor).
* **A3** discrete-diffusion analytic ``∂Loss/∂nu = 2(u' - target)·(dt·∇²u)`` (distinct physical
  term — diffusion, not advection — distinct parameter ``nu``, and distinct method); autodiff ==
  analytic EXACT (0.0).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from eulerian_smoke_diff.forward import (
    SmokeDiffConfig,
    advect_loss_grad_analytic,
    constant_velocity_fields,
    diffusion_dloss_dnu_analytic,
)
from eulerian_smoke_diff.sim import SmokeInitialFieldID, autodiff_dloss_dnu

ALGORITHM = "eulerian-smoke-diff-gradient"

# Named cells (i, j) at which the field gradient is sampled (6x6 grid).
CELLS: dict[str, tuple[int, int]] = {
    "grad_00": (0, 0),
    "grad_22": (2, 2),
    "grad_13": (1, 3),
    "grad_55": (5, 5),
}


def _u0_from_seed(n: int, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal((n, n)).astype(np.float64)


def _autodiff_advect_cells(inp: dict[str, Any]) -> dict[str, float]:
    cfg = SmokeDiffConfig(grid_n=inp["grid_n"], steps=inp["steps"])
    u0 = _u0_from_seed(cfg.grid_n, inp["seed"])
    prob = SmokeInitialFieldID(cfg)
    target = prob.final_field(u0 * inp["target_factor"])
    grad = prob.grad_wrt_u0(u0, target)
    return {k: float(grad[ij]) for k, ij in CELLS.items()}


def _autodiff_nu(inp: dict[str, Any]) -> dict[str, float]:
    cfg = SmokeDiffConfig(grid_n=inp["grid_n"])
    u0 = _u0_from_seed(cfg.grid_n, inp["seed"])
    target = _u0_from_seed(cfg.grid_n, inp["target_seed"])
    return {"dLoss_dnu": float(autodiff_dloss_dnu(cfg, u0, target, inp["nu"]))}


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's autodiff gradient."""
    anchor = inputs["anchor"]
    if anchor in ("a1-advection", "a2-fd"):
        return _autodiff_advect_cells(inputs)
    if anchor == "a3-diffusion":
        return _autodiff_nu(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_advection_operator_exact() -> None:
    """A1 cross-check: autodiff ∂Loss/∂u₀ == the analytic linear operator 2 Mᵀ(M u₀ - t)."""
    cfg = SmokeDiffConfig(grid_n=6, steps=1)
    u, v = constant_velocity_fields(cfg)
    u0 = _u0_from_seed(6, 11)
    prob = SmokeInitialFieldID(cfg)
    target = prob.final_field(u0 * 1.05)
    grad = prob.grad_wrt_u0(u0, target)
    analytic = advect_loss_grad_analytic(cfg, u0, target, u, v)
    rel = np.max(np.abs(grad - analytic)) / max(np.max(np.abs(analytic)), 1e-12)
    assert rel < 1e-8


def test_a3_diffusion_dloss_dnu_exact() -> None:
    """A3 cross-check: autodiff ∂Loss/∂nu == the analytic 2(u'-t)·(dt·∇²u) (EXACT)."""
    cfg = SmokeDiffConfig(grid_n=6)
    u0 = _u0_from_seed(6, 71)
    target = _u0_from_seed(6, 72)
    ad = autodiff_dloss_dnu(cfg, u0, target, 0.05)
    analytic = diffusion_dloss_dnu_analytic(cfg, u0, target, 0.05)
    assert abs(ad - analytic) <= 1e-9 + 1e-12 * abs(analytic)


def test_a2_gradient_matches_finite_difference_report() -> None:
    """A2 anchor mechanism: GradientCheckReport passes (autodiff vs central FD)."""
    cfg = SmokeDiffConfig(grid_n=6, steps=1)
    u0 = _u0_from_seed(6, 41)
    prob = SmokeInitialFieldID(cfg)
    target = prob.final_field(u0 * 1.07)
    prob.set_target(target)
    report = prob.check_gradient(params={"u0": u0.ravel()}, eps=1e-6, rel_tol=1e-3)
    assert report.passed
    assert report.max_relative_error < 1e-3
