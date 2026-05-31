"""WU-F forward-equivalence (differentiable axis): diff.forward == reference.step.

The differentiable variant re-implements the Gray-Scott forward with time-indexed
``needs_grad`` fields; its forward output must match the landed
``reaction-diffusion-2d-stack-d`` reference within the WU-F ``differentiable`` axis
tolerance (relative ≤ 1e-3, cap 1e-2). Both run the identical 5-point periodic
Laplacian + forward-Euler update, so the only divergence is float op-ordering.
"""

from __future__ import annotations

import numpy as np
import reaction_diffusion_2d_stack_d.reference.gray_scott_taichi as ref

from reaction_diffusion_2d_diff.forward import RD2DDiffConfig
from reaction_diffusion_2d_diff.sim import RD2DDiffusionID, smooth_initial_condition

# WU-F differentiable-axis default (tools/testkit/equivalence/variant/tolerance.py)
WU_F_DIFFERENTIABLE_REL = 1e-3


def test_diff_forward_matches_reference_final_field() -> None:
    cfg = RD2DDiffConfig(n=16, steps=8)
    u0, v0 = smooth_initial_condition(cfg.n)

    # diff forward (fields allocated before any field-materialising launch)
    prob = RD2DDiffusionID(cfg, u0, v0)
    diff_u = prob.final_u(cfg.Du)
    diff_v = prob.v.to_numpy()[cfg.steps]

    # reference forward: iterate the landed reference's single-step kernel
    p = ref.GrayScottParams(n=cfg.n, Du=cfg.Du, Dv=cfg.Dv, F=cfg.F, k=cfg.k, dx=cfg.dx, dt=cfg.dt)
    u, v = np.ascontiguousarray(u0), np.ascontiguousarray(v0)
    for _ in range(cfg.steps):
        u, v = ref.step(u, v, p)

    # forward-equivalence on the differentiable axis (relative ≤ 1e-3)
    assert np.allclose(diff_u, u, rtol=WU_F_DIFFERENTIABLE_REL, atol=0.0)
    assert np.allclose(diff_v, v, rtol=WU_F_DIFFERENTIABLE_REL, atol=0.0)


def test_diff_forward_matches_reference_bit_close() -> None:
    """Same physics + f64 => agreement is near machine precision, not merely 1e-3."""
    cfg = RD2DDiffConfig(n=16, steps=8)
    u0, v0 = smooth_initial_condition(cfg.n)
    prob = RD2DDiffusionID(cfg, u0, v0)
    diff_u = prob.final_u(cfg.Du)
    p = ref.GrayScottParams(n=cfg.n, Du=cfg.Du, Dv=cfg.Dv, F=cfg.F, k=cfg.k, dx=cfg.dx, dt=cfg.dt)
    u, v = np.ascontiguousarray(u0), np.ascontiguousarray(v0)
    for _ in range(cfg.steps):
        u, v = ref.step(u, v, p)
    assert float(np.max(np.abs(diff_u - u))) < 1e-12
