"""CLI: run the canonical coupled 3dgs-mpm sim -> capture + golden frames (spec-ref § 3.2.6).

Scaffolded at Stage 1a (argparse shell; the run path lands at Stage 1b).
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    """Entry point. ``python -m gs_mpm run --out <dir>`` runs the canonical sim."""
    parser = argparse.ArgumentParser(prog="gs_mpm", description="3dgs-mpm coupled sim")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="run the canonical coupled sim")
    run.add_argument("--out", type=Path, required=True, help="output directory")
    run.add_argument("--seed", type=int, default=0)
    run.add_argument("--steps", type=int, default=64)
    args = parser.parse_args(argv)
    if args.command == "run":
        raise NotImplementedError("Stage 1b")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
