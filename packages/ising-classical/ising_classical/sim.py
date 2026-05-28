"""SimRunner adapters wiring the NumPy Ising reference into testkit protocols.

Stack-B strategy (mirrors ``packages/reaction-diffusion-2d/reaction_diffusion_2d/sim.py``):
the Python NumPy reference is the load-bearing CI oracle, and the
Stack-B WebGPU implementation lives at ``packages/ising-classical/src/``
for local-with-GPU validation (spec §7.8 — CI runners have no GPU). The
acceptance tests under ``packages/ising-classical/tests/`` drive THIS
module, not the TypeScript code; the canonical capture
``captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}``
is produced by ``sim_runner_seeded(seed=42, …)`` here.

Exports:
    sim_runner_seeded(seed, out_dir) -> Path
        SimRunner protocol (testkit determinism harness).
    sim_runner_pbt(initial_condition_sample, out_dir) -> Path
        SimRunnerPBT protocol (testkit property harness).

**Stage 1a posture:** both runners raise ``NotImplementedError("Stage
1b")``; the RED tests collect cleanly and fail with that error until
Stage 1b lands the Metropolis evolution + capture I/O.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

# Capture cadence: 11 frames over 10000 steps (step 0 + every 1000).
_CAPTURE_INTERVAL_SEEDED = 1000
_CAPTURE_INTERVAL_PBT = 5
_PBT_STEPS = 10
_PBT_GRID = 32  # 32x32 is fast and still resolves the bipartite sublattice


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """testkit ``SimRunner`` — produce the canonical-descriptor Ising capture.

    Runs the locked canonical parameters (n=128, J=1, h=0, T=2.27,
    10000 sweeps); only ``seed`` and ``out_dir`` vary. The
    ``determinism.run_twice_and_diff`` harness invokes this twice at the
    same seed and asserts content-equivalence.
    """
    raise NotImplementedError("Stage 1b")


def sim_runner_pbt(initial_condition_sample: Any, out_dir: Path) -> Path:
    """testkit ``SimRunnerPBT`` — run a tiny Ising sim from a PBT-sampled seed.

    PBT runs are short (10 sweeps, 32x32) so the property harness can
    afford ``n_examples = 20`` without burning CI budget. The canonical
    capture (10000 sweeps, 128x128) is produced exclusively by
    ``sim_runner_seeded``.
    """
    raise NotImplementedError("Stage 1b")
