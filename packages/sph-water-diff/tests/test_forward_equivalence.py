"""WU-F forward-equivalence (differentiable axis): diff.forward == parent free-fall.

The differentiable variant re-implements the landed ``sph-water-stack-d`` canonical forward
(semi-implicit-Euler gravity free-fall + cubic-spline SPH density, R-S3/S6) with
time-indexed ``needs_grad`` Taichi fields; its final particle positions must match the
parent's ``_evolve`` within the WU-F ``differentiable`` axis tolerance (relative <= 1e-3,
cap 1e-2). Both run identical per-component arithmetic (``v_z += g*dt`` then
``x += dt*v_new``) in f64, so the only candidate divergence is float op-ordering.

Runtime-ordering contract (the mpm-diff Stage-1b precedent): the diff is evaluated BEFORE
the parent in every test - the parent's first call goes through ``_ensure_taichi`` ->
``set_taichi_deterministic``, which re-inits Taichi WITHOUT ``default_fp=ti.f64``; the
parent is f64-robust via f64-typed ndarray args, the diff's fields are allocated under the
conftest's f64 runtime.
"""

from __future__ import annotations

import numpy as np
from sph_water_stack_d.reference.dfsph_taichi import canonical_params
from sph_water_stack_d.sim import _evolve, _seeded_initial_state

from sph_water_diff.forward import SphDiffConfig
from sph_water_diff.sim import SphInitialVelocityControl, SphKernelWidthID

WU_F_DIFFERENTIABLE_REL = 1e-3

_N = 64
_STEPS = 8


def _parent_rollout() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Parent trajectory at the diagnostic tier; returns (x0, final_pos, final_rho)."""
    params = canonical_params()
    x0, _v0, _m = _seeded_initial_state(42, _N)
    p_hist, _v_hist, rho_hist, _steps, _info = _evolve(
        seed=42,
        n_particles=_N,
        n_steps=_STEPS,
        h=float(params["h"]),
        capture_interval=_STEPS,
    )
    return x0, p_hist[-1], rho_hist[-1]


def test_diff_forward_matches_parent_final_positions() -> None:
    cfg = SphDiffConfig(n_particles=_N, steps=_STEPS)
    params = canonical_params()
    assert cfg.dt == float(params["dt"]) and cfg.g_z == float(params["g_z"])

    # Diff FIRST (f64 runtime), parent second (its _ensure_taichi re-init).
    x0, _v0, _m = _seeded_initial_state(42, _N)
    prob = SphInitialVelocityControl(cfg, x0)
    diff_final = prob.final_positions(0.0)  # parent IC is at rest

    _x0p, parent_final, _parent_rho = _parent_rollout()
    assert np.allclose(diff_final, parent_final, rtol=WU_F_DIFFERENTIABLE_REL, atol=1e-12)


def test_diff_forward_matches_parent_bit_close() -> None:
    """Same per-component arithmetic, f64, single-thread => near-bit-exact agreement."""
    cfg = SphDiffConfig(n_particles=_N, steps=_STEPS)
    x0, _v0, _m = _seeded_initial_state(42, _N)
    prob = SphInitialVelocityControl(cfg, x0)
    diff_final = prob.final_positions(0.0)

    _x0p, parent_final, _parent_rho = _parent_rollout()
    assert float(np.max(np.abs(diff_final - parent_final))) < 1e-12


def test_diff_density_matches_parent_spatial_hash() -> None:
    """The ti.static pair-sum density == the parent's 27-cell spatial-hash density.

    Same cubic-spline arithmetic per pair; the only difference is neighbor ACCUMULATION
    ORDER (id-order unrolled pairs vs hash-cell traversal), so agreement is f64-reorder
    tight (<= 1e-12 relative), far inside the sph category tolerance (1e-4)."""
    import taichi as ti

    params = canonical_params()
    h = float(params["h"])

    # Parent first here (its outputs are needed as the diff's input), then an EXPLICIT
    # fresh f64 runtime for the diff fields - the parent's _ensure_taichi may have re-inited
    # Taichi without default_fp=f64 on its first in-process touch (kernel literals would
    # otherwise compute f32; the mpm-diff Stage-1b mechanism).
    _x0p, parent_final, parent_rho = _parent_rollout()
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)
    cfg = SphDiffConfig(n_particles=_N, h=h)
    prob = SphKernelWidthID(cfg, parent_final)
    diff_rho = prob.densities(h)

    rel = np.max(np.abs(diff_rho - parent_rho) / np.maximum(np.abs(parent_rho), 1e-300))
    assert float(rel) <= 1e-12
