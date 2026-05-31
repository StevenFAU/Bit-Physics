"""Determinism (gate-10/11): forward + gradient are bit-identical across runs.

The tape gradient is a deterministic function of fixed inputs (single-thread CPU,
seed-pinned IC); MEASURE then declare per charter §2.2 (no EFECT — there is no
training-loss distribution). Registry row:
``tools/testkit/determinism/registry.toml`` ``[continuous-ca.reaction-diffusion-2d-diff]``.
"""

from __future__ import annotations

import numpy as np

from reaction_diffusion_2d_diff.forward import RD2DDiffConfig
from reaction_diffusion_2d_diff.sim import RD2DDiffusionID, smooth_initial_condition


def _forward_and_grad(cfg: RD2DDiffConfig) -> tuple[np.ndarray, float]:
    u0, v0 = smooth_initial_condition(cfg.n)
    truth = RD2DDiffusionID(cfg, u0, v0)
    target = truth.final_u(cfg.Du * 1.05)
    prob = RD2DDiffusionID(cfg, u0, v0)
    prob.set_target(target)
    final = prob.final_u(cfg.Du)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.Du]))
    return final, float(grad[0])


def test_forward_bit_identical_across_runs() -> None:
    cfg = RD2DDiffConfig(n=16, steps=8)
    f1, _ = _forward_and_grad(cfg)
    f2, _ = _forward_and_grad(cfg)
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    cfg = RD2DDiffConfig(n=16, steps=8)
    _, g1 = _forward_and_grad(cfg)
    _, g2 = _forward_and_grad(cfg)
    assert g1 == g2
