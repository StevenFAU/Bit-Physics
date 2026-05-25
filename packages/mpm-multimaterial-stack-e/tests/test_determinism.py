"""Gate 10 — determinism (IC-13/IC-14) + the Stage-0 R-A1 anchor (D5 / banked #8).

Three witnesses:

1. ``test_run_twice_content_equivalent`` — the testkit ``run_twice_and_diff``
   content-equivalence gate on the production ``sim_runner_diagnostic`` (the
   stack-uniform IC-14 surface; bit-exact-same-hw, D4/D14).
2. ``test_warp_harness_assert_deterministic_run`` — the common-warp §1.9.1 W-2
   mechanism (``assert_deterministic_run``, ``tolerance=0.0``) on the P2G
   atomic-scatter surface.
3. ``test_r_a1_anchor_reproduces_stage0_p2g_digest`` — the production P2G kernel
   reproduces the Stage-0 Task-0.6 verification digest ``a8f6e654…07ff1fe1``
   EXACTLY on the identical Stage-0 IC, proving the production kernel preserves
   the Stage-0 determinism contract bit-for-bit (R-A1 anchor; Match: YES).
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import common_warp
import numpy as np
from common_warp.warp_harness import (
    assert_deterministic_run,
    deterministic_context,
    set_warp_deterministic,
)
from determinism import run_twice_and_diff

from mpm_multimaterial_stack_e.reference import mls_mpm_warp as R
from mpm_multimaterial_stack_e.sim import sim_runner_diagnostic

# Stage-0 Task 0.6 P2G atomic-scatter determinism baseline (6/6 bit-identical).
_R_A1_DIGEST = "a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1"
_GN = 16
_N = 5000
_SEED = 42


def _stage0_p2g_scatter() -> list[np.ndarray]:
    """Reconstruct the EXACT Stage-0 Task-0.6 scenario and run the production P2G.

    IC: uniform-in-CUBE (not the sim's sphere-rejection IC), seed 42, vz=-2.0,
    mass 1/N, on a 16^3 grid; a single mass+momentum P2G scatter (zero affine).
    Returns ``[grid_mass, grid_mom]`` for digesting.
    """
    rng = np.random.default_rng(_SEED)
    c, r = 0.5, 0.15
    pos = rng.uniform(c - r, c + r, size=(_N, 3))
    lo, hi = 2.0 / _GN, (_GN - 2) / _GN
    np.clip(pos, lo, hi, out=pos)
    pos = np.ascontiguousarray(pos, dtype=np.float64)
    vel = np.zeros_like(pos)
    vel[:, 2] = -2.0
    mass = np.full(_N, 1.0 / _N, dtype=np.float64)
    affine = np.zeros((_N, 3, 3), dtype=np.float64)
    grid_mass = np.zeros((_GN, _GN, _GN), dtype=np.float64)
    grid_mom = np.zeros((_GN, _GN, _GN, 3), dtype=np.float64)
    R.p2g(pos, vel, mass, affine, grid_mass, grid_mom, 1.0 / _GN)
    return [np.ascontiguousarray(grid_mass), np.ascontiguousarray(grid_mom)]


def test_run_twice_content_equivalent(tmp_path: Path) -> None:
    """IC-14 — the diagnostic capture is content-equivalent under fixed seed."""
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail


def test_warp_harness_assert_deterministic_run() -> None:
    """W-2 (§1.9.1) — the P2G atomic-scatter surface is bit-exact run-to-run."""
    common_warp.init("cpu", deterministic=True)
    set_warp_deterministic(_SEED, device="cpu")
    with deterministic_context():
        digest = assert_deterministic_run(_stage0_p2g_scatter, runs=2, tolerance=0.0)
    assert isinstance(digest, str) and len(digest) == 64


def test_r_a1_anchor_reproduces_stage0_p2g_digest() -> None:
    """R-A1 — the production P2G kernel reproduces the Stage-0 digest exactly."""
    common_warp.init("cpu", deterministic=True)
    set_warp_deterministic(_SEED, device="cpu")
    with deterministic_context():
        gm, gmom = _stage0_p2g_scatter()
    h = hashlib.sha256()
    h.update(gm.tobytes())
    h.update(gmom.tobytes())
    assert h.hexdigest() == _R_A1_DIGEST, "production P2G diverged from Stage-0 R-A1 anchor"
