"""PBT sim-runner adapter for the testkit property harness.

Loads the trained canonical checkpoint and rolls it forward for a short
inference run at the sampled fire-mask seed, writing a capture whose per-step
``state`` field is the RAW (unclamped, full 16-channel) cell state — so the
``field_values_bounded`` invariant can check full-state finiteness and the
clamped-RGBA regime. The NCA update is fully convolutional, so the
64²-trained checkpoint runs at the small PBT grid unchanged.
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np
import torch
from safetensors.torch import load_file

from .model import NCAConfig, NCAModel, seed_state

# Repo root: packages/neural-ca/python/neural_ca -> up 4.
_REPO_ROOT = Path(__file__).resolve().parents[4]
CANONICAL_CHECKPOINT = (
    _REPO_ROOT / "tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors"
)

_PBT_GRID = 28
_PBT_STEPS = 32

_MODEL: NCAModel | None = None


def _load_model() -> NCAModel:
    global _MODEL
    if _MODEL is None:
        model = NCAModel(NCAConfig(grid_size=_PBT_GRID))
        model.load_state_dict(load_file(str(CANONICAL_CHECKPOINT)))
        model.eval()
        _MODEL = model
    return _MODEL


def sim_runner_pbt(seed: int, run_dir: Path) -> Path:
    """Run a short rollout at ``seed`` and write a capture with the raw full
    state per step; return the manifest path (testkit harness contract)."""
    from common_py.capture import (
        ConfigMeta,
        DeterminismMeta,
        Manifest,
        PayloadMeta,
        RunMeta,
        SimMeta,
        StackMeta,
        StepData,
        Writer,
    )

    model = _load_model()
    torch.manual_seed(int(seed))
    x = seed_state(_PBT_GRID, model.config.channel_n)

    run_dir = Path(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = run_dir / f"pbt-seed{seed}.json"
    payload_path = run_dir / f"pbt-seed{seed}.h5"

    manifest = Manifest(
        schema_version="1.0.0",
        sim=SimMeta(name="neural-ca", category="continuous-ca", variant="growing-neural-ca"),
        stack=StackMeta(name="pytorch", version=torch.__version__, build_id="cpu"),
        config=ConfigMeta(
            tier="reference",
            dims=[_PBT_GRID, _PBT_GRID],
            dtype="f32",
            seed=int(seed),
            params={"channel_n": model.config.channel_n},
        ),
        run=RunMeta(
            step_count=_PBT_STEPS,
            capture_interval=1,
            wall_clock_seconds=0.0,
            start_utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        ),
        payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
        determinism=DeterminismMeta(
            claimed="bit-exact-same-hw", atomic_ops=False, subgroup_ops=False
        ),
    )

    writer = Writer(manifest_path, manifest)

    def raw_state(state: torch.Tensor) -> np.ndarray:
        return state[0].detach().numpy().astype(np.float32)  # (C, H, W) raw

    writer.write_step(0, StepData(fields={"state": raw_state(x)}))
    with torch.no_grad():
        for s in range(1, _PBT_STEPS + 1):
            x = model(x)
            writer.write_step(s, StepData(fields={"state": raw_state(x)}))
    writer.finalize()
    return manifest_path
