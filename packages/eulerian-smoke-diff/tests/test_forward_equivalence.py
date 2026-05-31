"""WU-F forward-equivalence (differentiable axis): diff primitives == smoke-E reference.

The differentiable variant re-implements the smoke step's two load-bearing primitives — the
bilinear semi-Lagrangian advect gather and the explicit 5-point diffusion — as on-device
``requires_grad`` ``wp.Tape`` kernels (the reference's NumPy-marshalling wrappers sever the tape).
Their forward output must match the landed ``eulerian-smoke-stack-e`` reference primitives within
the WU-F ``differentiable`` axis tolerance (relative ≤ 1e-3, cap 1e-2). Both replicate the same
``np.roll``/``np.mod`` op-order, so agreement is bit-exact.
"""

from __future__ import annotations

import numpy as np
from eulerian_smoke_stack_e.reference.stable_fluids_warp import (
    _laplacian_5point_periodic,
    semi_lagrangian_advect_2d,
)

from eulerian_smoke_diff.forward import (
    SmokeDiffConfig,
    constant_velocity_fields,
    smooth_initial_field,
)
from eulerian_smoke_diff.sim import SmokeInitialFieldID

WU_F_DIFFERENTIABLE_REL = 1e-3


def test_diff_advect_matches_reference() -> None:
    """One diff advect step == the reference ``semi_lagrangian_advect_2d`` (WU-F diff axis)."""
    cfg = SmokeDiffConfig(grid_n=16, steps=1)
    u, v = constant_velocity_fields(cfg)
    u0 = smooth_initial_field(cfg)
    prob = SmokeInitialFieldID(cfg)
    diff = prob.final_field(u0)
    ref = semi_lagrangian_advect_2d(u0, u, v, cfg.dt, cfg.dx)
    assert np.allclose(diff, ref, rtol=WU_F_DIFFERENTIABLE_REL, atol=1e-12)


def test_diff_advect_matches_reference_bit_exact() -> None:
    """Same op-order, f64, single-thread Warp CPU ⇒ agreement is bit-exact."""
    cfg = SmokeDiffConfig(grid_n=16, steps=1)
    u, v = constant_velocity_fields(cfg)
    u0 = smooth_initial_field(cfg)
    prob = SmokeInitialFieldID(cfg)
    diff = prob.final_field(u0)
    ref = semi_lagrangian_advect_2d(u0, u, v, cfg.dt, cfg.dx)
    assert float(np.max(np.abs(diff - ref))) == 0.0


def test_diff_diffusion_matches_reference_laplacian() -> None:
    """The diff explicit-diffusion update == ``u + dt·nu·`` reference 5-point Laplacian."""
    import warp as wp

    from eulerian_smoke_diff._kernels import diffuse_2d

    cfg = SmokeDiffConfig(grid_n=16)
    u0 = smooth_initial_field(cfg)
    nu = cfg.nu
    # reference: field + dt*nu*lap5(field)
    ref_lap = _laplacian_5point_periodic(u0, cfg.inv_dx2)
    ref = u0 + cfg.dt * nu * ref_lap
    # diff: one diffuse_2d kernel launch
    n = cfg.grid_n
    field = wp.array(u0, dtype=wp.float64, device="cpu")
    nu_arr = wp.array([nu], dtype=wp.float64, device="cpu")
    out = wp.zeros((n, n), dtype=wp.float64, device="cpu")
    wp.launch(
        diffuse_2d,
        dim=(n, n),
        inputs=[
            field,
            nu_arr,
            wp.float64(cfg.dt),
            wp.float64(cfg.inv_dx2),
            wp.int32(n),
            wp.int32(n),
            out,
        ],
        device="cpu",
    )
    diff = out.numpy()
    assert float(np.max(np.abs(diff - ref))) == 0.0
