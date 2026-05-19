"""Drafter-runs-before-commit re-verification of backtick-fenced citations.

Mirror of Cat 4 grammar (a), but invoked standalone so a drafter can
sweep an unfinished audit/spec before requesting review. Reads the file
list from argv (or stdin if none supplied) and emits one line per
finding to stderr; exits 0 only if every citation resolves.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ..cat4_draft_time.path_line_assertions import run_cat4_path_line_assertions
from ..common.repo import find_repo_root


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m integrity.scripts.audit_prose_freshness")
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="Files to scan; if omitted, reads paths from stdin.",
    )
    args = parser.parse_args(list(argv) if argv is not None else sys.argv[1:])
    paths: list[Path]
    if args.paths:
        paths = list(args.paths)
    else:
        paths = [Path(line.strip()) for line in sys.stdin if line.strip()]
    root = find_repo_root()
    findings = run_cat4_path_line_assertions(root, paths or None)
    for f in findings:
        line_part = f":{f.line}" if f.line is not None else ""
        print(f"  {f.severity.value}  {f.path}{line_part}  {f.message}", file=sys.stderr)
    print(f"summary: {len(findings)} finding(s)")
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
