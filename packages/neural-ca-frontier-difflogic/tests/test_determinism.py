"""Determinism (gate-10/11): hard trajectory, soft forward, and gradient bit-identical.

No EFECT (frozen gates, no training). Registry rows:
``tools/testkit/determinism/registry.toml``
``[continuous-ca.neural-ca-frontier-difflogic.*]``.
"""

from __future__ import annotations

import numpy as np

from neural_ca_frontier_difflogic.forward import DiffLogicConfig, glider_initial_state
from neural_ca_frontier_difflogic.sim import SoftExcitationID, run_hard_trajectory


def test_hard_trajectory_bit_identical_across_runs() -> None:
    cfg = DiffLogicConfig()
    t1 = run_hard_trajectory(cfg, glider_initial_state(cfg), steps=16)
    t2 = run_hard_trajectory(cfg, glider_initial_state(cfg), steps=16)
    assert np.array_equal(t1, t2)


def _soft_and_grad(cfg: DiffLogicConfig) -> tuple[np.ndarray, float]:
    prob = SoftExcitationID(cfg)
    target = prob.final_state(0.75)
    prob.set_target(target)
    final = prob.final_state(0.40)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.asarray([0.40], dtype=np.float64))
    return final, float(np.asarray(grad).ravel()[0])


def test_soft_forward_bit_identical_across_runs() -> None:
    cfg = DiffLogicConfig()
    f1, _ = _soft_and_grad(cfg)
    f2, _ = _soft_and_grad(cfg)
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    cfg = DiffLogicConfig()
    _, g1 = _soft_and_grad(cfg)
    _, g2 = _soft_and_grad(cfg)
    assert g1 == g2
