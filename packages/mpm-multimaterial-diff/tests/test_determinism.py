"""Determinism (gate-10/11): forward + gradient are bit-identical across runs.

The tape gradient is a deterministic function of fixed inputs (single-thread CPU serialises
the P2G ``ti.atomic_add`` scatter; seed-pinned IC); MEASURE then declare per charter §2.2 (no
EFECT - no training-loss distribution). Registry rows:
``tools/testkit/determinism/registry.toml`` ``[hybrid-pg.mpm-multimaterial-diff.*]``.
"""

from __future__ import annotations

import numpy as np

from mpm_multimaterial_diff.forward import MpmDiffConfig, cluster_initial_positions
from mpm_multimaterial_diff.sim import MpmInitialVelocityID


def _forward_and_grad(cfg: MpmDiffConfig) -> tuple[np.ndarray, np.ndarray]:
    x0 = cluster_initial_positions(cfg)
    v0 = np.array([0.30, 0.10, -0.20])
    prob = MpmInitialVelocityID(cfg, x0)
    target = prob.final_positions(v0 * 1.05)
    prob.set_target(target)
    final = prob.final_positions(v0)
    _, grad = prob._loss_and_grad(prob.params_spec(), v0)
    return final, np.asarray(grad, dtype=np.float64)


def test_forward_bit_identical_across_runs() -> None:
    cfg = MpmDiffConfig()
    f1, _ = _forward_and_grad(cfg)
    f2, _ = _forward_and_grad(cfg)
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    cfg = MpmDiffConfig()
    _, g1 = _forward_and_grad(cfg)
    _, g2 = _forward_and_grad(cfg)
    assert np.array_equal(g1, g2)
