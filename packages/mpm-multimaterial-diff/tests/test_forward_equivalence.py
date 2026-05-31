"""WU-F forward-equivalence (differentiable axis): diff.forward == mpm reference rollout.

The differentiable variant re-implements the 3D APIC neo-Hookean MLS-MPM forward with
time-indexed ``needs_grad`` Taichi fields (explicit-scalar, ``ti.static``-unrolled 27-cell
stencil); its final particle positions must match the landed ``mpm-multimaterial-stack-d``
reference rollout within the WU-F ``differentiable`` axis tolerance (relative <= 1e-3, cap
1e-2). Both run identical APIC + neo-Hookean arithmetic on an interior small-strain config
(no boundary clamp activates), so the only divergence is float op-ordering.
"""

from __future__ import annotations

import numpy as np
from mpm_multimaterial_stack_d.reference import (
    advect_particles,
    compute_particle_stresses,
    deformation_update,
    g2p,
    grid_update,
    mls_mpm_taichi,
    p2g_with_stress,
)

from mpm_multimaterial_diff.forward import MpmDiffConfig, cluster_initial_positions
from mpm_multimaterial_diff.sim import MpmInitialVelocityID

WU_F_DIFFERENTIABLE_REL = 1e-3

# Share the conftest's deterministic f64 single-thread runtime with the reference (the
# lenia-diff precedent). The reference's ``_ensure_taichi`` otherwise calls
# ``set_taichi_deterministic``, which re-inits Taichi WITHOUT ``default_fp=ti.f64`` - the
# reference is written f32-default-robust (explicit ``ti.f64(...)`` seeds), but the diff
# kernels' literal constants would then compute in f32 and diverge ~0.5% over the horizon.
# Pinning the flag makes ``_ensure_taichi`` a no-op so BOTH run under conftest's f64 runtime
# -> bit-exact agreement (the divergence is purely a default_fp artefact, not a physics gap).
mls_mpm_taichi._TAICHI_INITIALIZED = True


def _reference_rollout(cfg: MpmDiffConfig, x0: np.ndarray, v0: np.ndarray) -> np.ndarray:
    """Run the landed reference's per-kernel wrappers for the diff config; return final pos."""
    P, N = cfg.n_particles, cfg.grid_n
    dx, dt = cfg.dx, cfg.dt
    pos = np.ascontiguousarray(x0, dtype=np.float64)
    vel = np.ascontiguousarray(np.tile(np.asarray(v0, dtype=np.float64), (P, 1)))
    mass = np.full(P, cfg.mass, dtype=np.float64)
    volume_p = np.full(P, cfg.volume, dtype=np.float64)
    material_id = np.zeros(P, dtype=np.int32)
    affine_c = np.zeros((P, 3, 3), dtype=np.float64)
    F = np.tile(np.eye(3), (P, 1, 1)).astype(np.float64)
    stress = np.zeros((P, 3, 3), dtype=np.float64)
    grid_mass = np.zeros((N, N, N), dtype=np.float64)
    grid_mom = np.zeros((N, N, N, 3), dtype=np.float64)
    vel_new = np.zeros_like(vel)
    affine_c_new = np.zeros_like(affine_c)
    for _ in range(cfg.steps):
        compute_particle_stresses(F, material_id, cfg.mu, cfg.lam, stress)
        grid_mass.fill(0.0)
        grid_mom.fill(0.0)
        p2g_with_stress(pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, dx, dt)
        grid_update(grid_mass, grid_mom, cfg.gravity_z, dt, cfg.floor_z_index)
        g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, dx)
        vel[:] = vel_new
        affine_c[:] = affine_c_new
        deformation_update(F, affine_c, dt)
        advect_particles(pos, vel, dt, N, dx)
    return np.asarray(pos, dtype=np.float64)


# IMPORTANT (runtime-ordering, Stage-1b MEASURED): the diff is evaluated BEFORE the reference
# rollout in every test below. The diff must run under the conftest's f64 runtime; the
# reference's first kernel call goes through ``_ensure_taichi`` -> ``set_taichi_deterministic``,
# which re-inits Taichi WITHOUT ``default_fp=ti.f64`` (the reference is f32-default-robust via
# explicit ``ti.f64(...)`` seeds; the diff's literal constants are NOT, so under f32-default they
# diverge ~0.5% over the horizon). Computing the diff first captures its f64 result into NumPy
# before that re-init; the reference then computes its own (f32-robust, correct) result. With
# both correct, agreement is bit-exact. (Setting ``mls_mpm_taichi._TAICHI_INITIALIZED`` at import
# is kept as best-effort defense but is NOT load-bearing — pytest's collection/runtime ordering
# does not reliably honor it across the autouse re-init, so the diff-first order is the contract.)


def test_diff_forward_matches_reference_final_positions() -> None:
    cfg = MpmDiffConfig()
    x0 = cluster_initial_positions(cfg)
    v0 = np.array([0.30, 0.10, -0.20])
    prob = MpmInitialVelocityID(cfg, x0)
    diff = prob.final_positions(v0)  # diff FIRST (f64), before the reference re-init
    ref = _reference_rollout(cfg, x0, v0)
    assert np.allclose(diff, ref, rtol=WU_F_DIFFERENTIABLE_REL, atol=1e-12)


def test_diff_forward_matches_reference_bit_close() -> None:
    """Same APIC + neo-Hookean arithmetic, f64, single-thread => agreement is near-bit-exact."""
    cfg = MpmDiffConfig()
    x0 = cluster_initial_positions(cfg)
    v0 = np.array([0.30, 0.10, -0.20])
    prob = MpmInitialVelocityID(cfg, x0)
    diff = prob.final_positions(v0)  # diff FIRST (f64), before the reference re-init
    ref = _reference_rollout(cfg, x0, v0)
    assert float(np.max(np.abs(diff - ref))) < 1e-9
