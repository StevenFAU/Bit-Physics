"""Determinism (gate-10/11): forward + gradient are bit-identical across runs.

The tape gradient is a deterministic function of fixed inputs (single-thread CPU serialises
the loss/density ``+=`` accumulations; seed-pinned IC); MEASURE then declare. Registry rows:
``tools/testkit/determinism/registry.toml`` ``[particle-fluids.sph-water-diff.*]``.
"""

from __future__ import annotations

import numpy as np

from sph_water_diff.forward import SphDiffConfig, cloud_initial_positions
from sph_water_diff.sim import SphInitialVelocityControl


def _forward_and_grad(cfg: SphDiffConfig) -> tuple[np.ndarray, float]:
    x0 = cloud_initial_positions(cfg)
    v0z = 0.30
    prob = SphInitialVelocityControl(cfg, x0)
    target = prob.final_positions(v0z * 1.05)
    prob.set_target(target)
    final = prob.final_positions(v0z)
    _, grad = prob._loss_and_grad(prob.params_spec(), np.asarray([v0z], dtype=np.float64))
    return final, float(np.asarray(grad).ravel()[0])


def test_forward_bit_identical_across_runs() -> None:
    cfg = SphDiffConfig()
    f1, _ = _forward_and_grad(cfg)
    f2, _ = _forward_and_grad(cfg)
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    cfg = SphDiffConfig()
    _, g1 = _forward_and_grad(cfg)
    _, g2 = _forward_and_grad(cfg)
    assert g1 == g2
