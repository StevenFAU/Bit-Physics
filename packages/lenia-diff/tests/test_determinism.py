"""Determinism (gate-10/11): forward + gradient are bit-identical across runs.

The tape gradient is a deterministic function of fixed inputs (single-thread CPU,
seed-pinned IC); MEASURE then declare per charter §2.2 (no EFECT — no training-loss
distribution). Registry row: ``tools/testkit/determinism/registry.toml``
``[continuous-ca.lenia-diff]``.
"""

from __future__ import annotations

import numpy as np

from lenia_diff.forward import LeniaDiffConfig
from lenia_diff.sim import LeniaGrowthID, smooth_initial_condition


def _forward_and_grad(cfg: LeniaDiffConfig) -> tuple[np.ndarray, np.ndarray]:
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    truth = LeniaGrowthID(cfg, a0)
    target = truth.final_field(cfg.mu * 1.05, cfg.sigma * 1.05)
    prob = LeniaGrowthID(cfg, a0)
    prob.set_target(target)
    final = prob.final_field(cfg.mu, cfg.sigma)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.array([cfg.mu, cfg.sigma]))
    return final, np.asarray(grad, dtype=np.float64)


def test_forward_bit_identical_across_runs() -> None:
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    f1, _ = _forward_and_grad(cfg)
    f2, _ = _forward_and_grad(cfg)
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    _, g1 = _forward_and_grad(cfg)
    _, g2 = _forward_and_grad(cfg)
    assert np.array_equal(g1, g2)
