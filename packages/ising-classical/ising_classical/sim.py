"""SimRunner adapters wiring the NumPy Ising reference into testkit protocols.

Stack-B strategy (mirrors ``packages/reaction-diffusion-2d/reaction_diffusion_2d/sim.py``):
the Python NumPy reference is the load-bearing CI oracle, and the
Stack-B WebGPU implementation lives at ``packages/ising-classical/src/``
for local-with-GPU validation (spec § 7.8 -- CI runners have no GPU).
The acceptance tests under ``packages/ising-classical/tests/`` drive
THIS module, not the TypeScript code; the canonical capture
``captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}``
is produced by ``sim_runner_seeded(seed=42, ...)`` here.

Spin fields are stored in the capture as ``f64`` (``+/-1.0``, exactly
representable -- so two seeded runs are byte-identical, preserving the
``bit-exact-same-hw`` claim, while honouring the capture-v1 dtype enum
which admits only ``f32``/``f64``).
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.ising_numpy import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_STEP_COUNT,
    IsingParams,
    canonical_params,
    energy_per_spin,
    evolve,
    magnetization_per_spin,
)

# Capture cadence: 11 frames over 10000 steps (step 0 + every 1000).
_CAPTURE_INTERVAL_SEEDED = 1000
_CAPTURE_INTERVAL_PBT = 5
_PBT_STEPS = 10
_PBT_GRID = 32  # 32x32 is fast and still resolves the bipartite sublattice


def _manifest(
    p: IsingParams,
    payload_name: str,
    seed: int,
    step_count: int,
    capture_interval: int,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "ising-classical", "category": "lattice-spin", "variant": "metropolis"},
        stack={"name": "numpy-reference", "version": "0.0.1", "build_id": "phase-3"},
        config={
            "tier": "reference",
            "dims": [p.n, p.n],
            "dtype": "f64",
            "seed": seed,
            "params": {"J": p.J, "h": p.h, "T": p.T},
        },
        run={
            "step_count": step_count,
            "capture_interval": capture_interval,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-28T00:00:00Z",
        },
        payload={"format": "hdf5", "path": payload_name, "checksum": "sha256:" + "0" * 64},
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _evolve_to_states(
    p: IsingParams,
    seed: int,
    n_steps: int,
    capture_interval: int,
) -> Iterable[StepState]:
    """Evolve the reference and yield ``StepState``s at the capture cadence.

    Spins are stored as ``f64`` (``+/-1.0``); per-step diagnostics carry
    the magnetization per spin and energy per spin.
    """
    for step_idx, spins in evolve(p, seed, n_steps, capture_interval=capture_interval):
        yield StepState(
            step=step_idx,
            state={"spins": spins.astype(np.float64)},
            diagnostics={
                "magnetization": magnetization_per_spin(spins),
                "energy_per_spin": energy_per_spin(spins, p),
            },
        )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """testkit ``SimRunner`` -- produce the canonical-descriptor Ising capture.

    Runs the locked canonical parameters (n=128, J=1, h=0, T=2.27,
    10000 sweeps); only ``seed`` and ``out_dir`` vary. The
    ``determinism.run_twice_and_diff`` harness invokes this twice at the
    same seed and asserts content-equivalence.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    p = canonical_params()
    payload_name = f"{CANONICAL_DESCRIPTOR}.h5"
    manifest = _manifest(
        p,
        payload_name=payload_name,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=_CAPTURE_INTERVAL_SEEDED,
    )
    manifest_path: Path = write_capture(
        _evolve_to_states(p, seed, CANONICAL_STEP_COUNT, _CAPTURE_INTERVAL_SEEDED),
        manifest,
        out_dir,
    )
    return manifest_path


def sim_runner_pbt(initial_condition_sample: Any, out_dir: Path) -> Path:
    """testkit ``SimRunnerPBT`` -- run a tiny Ising sim from a PBT-sampled seed.

    The Hypothesis ``random_seed()`` strategy yields an int seed; the
    temperature is derived deterministically from that seed across
    ``[1.0, 4.0]`` (so different examples probe different temperatures
    while staying reproducible). PBT runs are short (10 sweeps, 32x32)
    so the property harness can afford ``n_examples = 20`` without
    burning CI budget. The canonical capture (10000 sweeps, 128x128) is
    produced exclusively by ``sim_runner_seeded``.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    seed = int(initial_condition_sample)
    temperature = float(np.random.default_rng(seed).uniform(1.0, 4.0))
    p = IsingParams(n=_PBT_GRID, J=1.0, h=0.0, T=temperature)
    payload_name = "ising-classical-pbt.h5"
    manifest = _manifest(
        p,
        payload_name=payload_name,
        seed=seed,
        step_count=_PBT_STEPS,
        capture_interval=_CAPTURE_INTERVAL_PBT,
    )
    manifest_path: Path = write_capture(
        _evolve_to_states(p, seed, _PBT_STEPS, _CAPTURE_INTERVAL_PBT),
        manifest,
        out_dir,
    )
    return manifest_path
