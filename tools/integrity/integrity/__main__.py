"""CLI entry point for the integrity toolkit.

Usage:
    python -m integrity [--cat N | --all] [--mode strict|advisory]
                        [--staged-only] [files...]

Default behavior (no flags): runs every Cat 1-5 + Cat-X check across the
whole repo, exits 1 on any HARD_FAIL.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .common.repo import find_repo_root, staged_files
from .runner import emit, run


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="python -m integrity")
    parser.add_argument(
        "--cat",
        metavar="N",
        default=None,
        help=(
            "Run only the named category. Numeric (1..5), 'x' / "
            "'tolerance-budget', or a literal check ID."
        ),
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run every category (default when no --cat is supplied).",
    )
    parser.add_argument(
        "--mode",
        choices=("strict", "advisory"),
        default="strict",
        help="strict: exit 1 on HARD_FAIL (default). advisory: always exit 0.",
    )
    parser.add_argument(
        "--staged-only",
        action="store_true",
        help="Restrict to files currently staged for commit.",
    )
    parser.add_argument(
        "files",
        nargs="*",
        type=Path,
        help="Optional file restrictions (overrides --staged-only).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(list(argv) if argv is not None else sys.argv[1:])
    if args.cat is not None and args.all:
        print("error: --cat and --all are mutually exclusive", file=sys.stderr)
        return 2
    root = find_repo_root()
    files: list[Path] | None
    if args.files:
        files = list(args.files)
    elif args.staged_only:
        files = staged_files(root)
    else:
        files = None
    result = run(args.cat, files, repo_root=root)
    return emit(result, mode=args.mode)


if __name__ == "__main__":
    raise SystemExit(main())
