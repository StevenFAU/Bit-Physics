"""CLI command implementations (file-writing glue around the core functions).

Separated from ``__main__`` so the argparse wiring stays import-light.
``cli_train`` trains to the procedural emoji target and writes the
``.safetensors`` checkpoint; ``cli_infer`` rolls the frozen checkpoint forward
and writes the D-inference capture (``common_py.capture`` format, RGBA field
per captured step).
"""

from __future__ import annotations

import argparse
import time

import numpy as np
import torch
from safetensors.torch import load_file, save_file

from .infer import run_inference
from .model import NCAConfig, NCAModel
from .target import make_emoji_target
from .train import TrainConfig, train_to_target


def cli_train(args: argparse.Namespace) -> None:
    """Train to the procedural emoji target; write the ``.safetensors`` checkpoint."""
    target = torch.from_numpy(make_emoji_target(args.grid))
    config = NCAConfig(grid_size=args.grid, target_emoji=args.emoji)
    result = train_to_target(
        target,
        config=config,
        train_config=TrainConfig(steps=args.steps, seed=args.seed, use_pool=True),
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    save_file(result.model.state_dict(), str(args.out))
    print(f"trained {args.steps} steps; final L2 {result.final_loss:.6f}; wrote {args.out}")


def cli_infer(args: argparse.Namespace) -> None:
    """Roll the checkpoint forward; write the D-inference capture."""
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

    config = NCAConfig(grid_size=args.grid)
    model = NCAModel(config)
    model.load_state_dict(load_file(str(args.checkpoint)))

    frames = run_inference(
        model,
        grid_size=args.grid,
        steps=args.steps,
        seed=args.seed,
        capture_every=args.capture_every,
    )

    descriptor = f"growing-emoji-{args.grid}sq-seed{args.seed}-step{args.steps}"
    args.out.mkdir(parents=True, exist_ok=True)
    manifest_path = args.out / f"{descriptor}.json"
    payload_path = args.out / f"{descriptor}.h5"

    manifest = Manifest(
        schema_version="1.0.0",
        sim=SimMeta(name="neural-ca", category="continuous-ca", variant="growing-neural-ca"),
        stack=StackMeta(name="pytorch", version=torch.__version__, build_id="cpu"),
        config=ConfigMeta(
            tier="reference",
            dims=[args.grid, args.grid],
            dtype="f32",
            seed=int(args.seed),
            params={
                "channel_n": config.channel_n,
                "fire_rate": config.fire_rate,
                "steps": int(args.steps),
                "capture_every": int(args.capture_every),
                "target_emoji": config.target_emoji,
            },
        ),
        run=RunMeta(
            step_count=int(args.steps),
            capture_interval=int(args.capture_every),
            wall_clock_seconds=0.0,
            start_utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        ),
        payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
        determinism=DeterminismMeta(
            claimed="bit-exact-same-hw", atomic_ops=False, subgroup_ops=False
        ),
    )

    writer = Writer(manifest_path, manifest)
    for i, frame in enumerate(frames):
        step_idx = i * args.capture_every
        writer.write_step(step_idx, StepData(fields={"rgba": np.asarray(frame, dtype=np.float32)}))
    writer.finalize()
    print(f"wrote {len(frames)} frames -> {payload_path}")
