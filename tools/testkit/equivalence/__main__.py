"""Equivalence-harness CLI entry point (D-HARNESS-CLI Stage-1a lean (a)).

`docs/phases/phase-3-plan.md:384-394` invocation:

    python -m equivalence \\
      --mode render-similarity \\
      --left  <capture-dir-or-image-sequence> \\
      --right <capture-dir-or-image-sequence> \\
      --tolerance-key <e.g., continuous-ca.neural-ca>

The CLI is additive — `compare_captures` programmatic surface (used by the
existing equivalence consumers; `tools/testkit/equivalence/__init__.py`) is
unchanged. The `--mode` dispatch keeps a single CLI surface per §3.2.2 while
each mode owns its own implementation module under `tools/testkit/`.

Stage 1a: argparse shell + dispatch table. Modes raise `NotImplementedError`
(render-similarity at Stage 1b; future modes added here as they land). The
default behaviour (no `--mode`) prints usage; do NOT invoke `compare_captures`
implicitly — its programmatic surface is the contract, not the CLI.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m equivalence",
        description=(
            "Cross-stack equivalence harness CLI. The default programmatic surface "
            "(`compare_captures`) is unchanged; this CLI adds mode-dispatch for "
            "render-similarity (Phase 3) and any future modes."
        ),
    )
    parser.add_argument(
        "--mode",
        choices=("render-similarity",),
        required=True,
        help="Which harness mode to invoke.",
    )
    parser.add_argument(
        "--left",
        type=Path,
        required=True,
        help="Left capture directory or image sequence.",
    )
    parser.add_argument(
        "--right",
        type=Path,
        required=True,
        help="Right capture directory or image sequence.",
    )
    parser.add_argument(
        "--tolerance-key",
        required=True,
        help="Tolerance-table key (e.g. 'continuous-ca.neural-ca').",
    )
    parser.add_argument(
        "--tolerance-table",
        type=Path,
        default=None,
        help=("Path to tolerance.toml. Defaults to tools/testkit/equivalence/tolerance.toml."),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.mode == "render-similarity":
        # Local import — keeps the equivalence package free of a render_similarity
        # hard dependency at module-load time (the render_similarity package adds
        # lpips/scikit-image/torch at Stage 1b).
        from render_similarity.harness_mode import run

        return run(
            left=args.left,
            right=args.right,
            tolerance_key=args.tolerance_key,
            tolerance_table_path=args.tolerance_table,
        )

    parser.error(f"unknown mode: {args.mode!r}")
    return 2  # unreachable; argparse.error exits with 2


if __name__ == "__main__":
    sys.exit(main())
