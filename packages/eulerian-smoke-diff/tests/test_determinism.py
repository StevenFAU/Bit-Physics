"""Determinism (gate-10/11): forward + gradient are bit-identical across runs.

The tape gradient is a deterministic function of fixed inputs (Warp CPU single-thread serial
``wp.launch`` over the SL-advect gathers + the L2/adjoint ``wp.atomic_add`` reductions; seed-pinned
smooth IC); MEASURE then declare per charter § 2.2 (no EFECT — no training-loss distribution).
Registry rows ``tools/testkit/determinism/registry.toml``
``[volumetric-grid.eulerian-smoke-diff.*]``.
"""

from __future__ import annotations

import numpy as np

from eulerian_smoke_diff.forward import SmokeDiffConfig, smooth_initial_field
from eulerian_smoke_diff.sim import SmokeInitialFieldID


def _forward_and_grad(cfg: SmokeDiffConfig) -> tuple[np.ndarray, np.ndarray]:
    u0 = smooth_initial_field(cfg)
    prob = SmokeInitialFieldID(cfg)
    target = prob.final_field(u0 * 1.05)
    final = prob.final_field(u0)
    grad = prob.grad_wrt_u0(u0, target)
    return final, np.asarray(grad, dtype=np.float64)


def test_forward_bit_identical_across_runs() -> None:
    cfg = SmokeDiffConfig(grid_n=8, steps=2)
    f1, _ = _forward_and_grad(cfg)
    f2, _ = _forward_and_grad(cfg)
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    cfg = SmokeDiffConfig(grid_n=8, steps=2)
    _, g1 = _forward_and_grad(cfg)
    _, g2 = _forward_and_grad(cfg)
    assert np.array_equal(g1, g2)
