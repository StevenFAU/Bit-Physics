"""``python -m pinn_poisson`` CLI (per ``docs/phases/phase-3-plan.md`` § 3.2.6).

Two subcommands:

- ``train``  — train the soft-constraint PINN on an anchor problem; emit a
  safetensors checkpoint (LFS-tracked).
- ``infer``  — load a checkpoint and write the canonical inference capture via
  the torch->wp->Capture bridge.

Standard flags (§ 3.2.6): ``--seed`` (default 42), ``--grid`` (default 64),
``--out`` (default ``captures/pinn-poisson/``). Stage 1a: argparse wiring only;
the dispatch bodies raise ``NotImplementedError`` until Stage 1b-PINN.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .model import PINNConfig
from .problems import CANONICAL_PROBLEM, anchor_by_name


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="pinn_poisson",
        description="PINN solving the 2D Poisson equation (Stack E + PyTorch, CPU).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_train = sub.add_parser("train", help="train the PINN and emit a checkpoint")
    p_train.add_argument("--seed", type=int, default=42)
    p_train.add_argument("--anchor", type=str, default=CANONICAL_PROBLEM.name)
    p_train.add_argument("--iterations", type=int, default=5000)
    p_train.add_argument("--out", type=Path, default=Path("checkpoints/pinn-poisson"))

    p_infer = sub.add_parser("infer", help="write the canonical inference capture")
    p_infer.add_argument("--seed", type=int, default=42)
    p_infer.add_argument("--grid", type=int, default=64)
    p_infer.add_argument("--anchor", type=str, default=CANONICAL_PROBLEM.name)
    p_infer.add_argument("--checkpoint", type=Path, required=True)
    p_infer.add_argument("--out", type=Path, default=Path("captures/pinn-poisson"))

    args = parser.parse_args(argv)

    if args.command == "train":
        from .train import train_pinn

        problem = anchor_by_name(args.anchor)
        config = PINNConfig(seed=args.seed, iterations=args.iterations)
        train_pinn(problem, config)
        return 0

    if args.command == "infer":
        from .infer import load_checkpoint, write_inference_capture

        problem = anchor_by_name(args.anchor)
        model = load_checkpoint(args.checkpoint)
        write_inference_capture(model, problem, args.grid, args.out)
        return 0

    return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
