"""CLI for the neural-ca reference sim (§ 3.2.6 conventions).

Subcommands:

- ``train``  — train to a target emoji; write ``neural-ca-emoji-{name}.safetensors``.
- ``infer``  — roll the frozen checkpoint forward; write the D-inference capture
  ``growing-emoji-64sq-seed42-step1000.{h5,json}``.
- ``convert`` — ``.safetensors`` -> WGSL-loadable ``(buffer.bin, layout.json)``.

The Stack-B WGSL inference runs locally on a GPU host (spec § 7.8) via
``../typescript/`` (deploy path) or the wgpu-py harness
(``neural_ca.wgsl_harness``); CI reads the committed captures.
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="neural_ca")
    sub = parser.add_subparsers(dest="command", required=True)

    p_train = sub.add_parser("train", help="train to a target emoji")
    p_train.add_argument("--emoji", default="lizard")
    p_train.add_argument("--grid", type=int, default=64)
    p_train.add_argument("--steps", type=int, default=8000)
    p_train.add_argument("--seed", type=int, default=42)
    p_train.add_argument("--out", type=Path, required=True)

    p_infer = sub.add_parser("infer", help="roll a checkpoint forward to a capture")
    p_infer.add_argument("--checkpoint", type=Path, required=True)
    p_infer.add_argument("--grid", type=int, default=64)
    p_infer.add_argument("--steps", type=int, default=1000)
    p_infer.add_argument("--seed", type=int, default=42)
    p_infer.add_argument("--capture-every", type=int, default=50)
    p_infer.add_argument("--out", type=Path, required=True)

    p_conv = sub.add_parser("convert", help="safetensors -> WGSL-loadable artifact")
    p_conv.add_argument("--checkpoint", type=Path, required=True)
    p_conv.add_argument("--out", type=Path, required=True)

    args = parser.parse_args(argv)

    if args.command == "train":
        from .cli_impl import cli_train

        cli_train(args)
    elif args.command == "infer":
        from .cli_impl import cli_infer

        cli_infer(args)
    elif args.command == "convert":
        from .convert_checkpoint import convert_checkpoint

        convert_checkpoint(args.checkpoint, args.out)


if __name__ == "__main__":
    main()
