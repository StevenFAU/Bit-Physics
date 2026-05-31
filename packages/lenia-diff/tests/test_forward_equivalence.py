"""WU-F forward-equivalence (differentiable axis): diff.forward == lenia reference step.

The differentiable variant re-implements the Quad4-Lenia forward with time-indexed
``needs_grad`` fields (``ti.static``-unrolled convolution); its forward output must match
the landed ``lenia`` reference within the WU-F ``differentiable`` axis tolerance
(relative ≤ 1e-3, cap 1e-2). Both run the identical Quad4 conv (di-outer/dj-inner tap
order) + Quad4 polynomial growth + clip-Euler, so the only divergence is float op-ordering
— measured bit-exact here.
"""

from __future__ import annotations

import numpy as np
from lenia import LeniaConfig, LeniaSim

from lenia_diff.forward import LeniaDiffConfig
from lenia_diff.sim import LeniaGrowthID

# WU-F differentiable-axis default (tools/testkit/equivalence/variant/tolerance.py)
WU_F_DIFFERENTIABLE_REL = 1e-3


def _reference_run(cfg: LeniaDiffConfig) -> tuple[np.ndarray, np.ndarray]:
    """Run the landed lenia reference at ``cfg``; return (initial field, final field)."""
    ref_cfg = LeniaConfig(
        grid=cfg.grid, R=cfg.R, mu=cfg.mu, sigma=cfg.sigma, dt=cfg.dt, steps=cfg.steps
    )
    sim = LeniaSim(ref_cfg)
    sim._taichi_initialized = True  # share the conftest deterministic runtime
    a0 = sim.field()
    for _ in range(cfg.steps):
        sim.step()
    return a0, sim.field()


def test_diff_forward_matches_reference_final_field() -> None:
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    a0, ref_final = _reference_run(cfg)

    prob = LeniaGrowthID(cfg, a0)
    diff_final = prob.final_field(cfg.mu, cfg.sigma)

    assert np.allclose(diff_final, ref_final, rtol=WU_F_DIFFERENTIABLE_REL, atol=0.0)


def test_diff_forward_matches_reference_bit_close() -> None:
    """Same physics + f64 + same tap order => agreement is bit-exact, not merely 1e-3."""
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    a0, ref_final = _reference_run(cfg)
    prob = LeniaGrowthID(cfg, a0)
    diff_final = prob.final_field(cfg.mu, cfg.sigma)
    assert float(np.max(np.abs(diff_final - ref_final))) < 1e-12
