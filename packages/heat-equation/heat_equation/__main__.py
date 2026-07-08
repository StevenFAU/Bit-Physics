"""CLI runner: ``uv run --no-sync python -m heat_equation --out captures/heat-equation``."""

from __future__ import annotations

import argparse
from pathlib import Path

from .sim import CANONICAL_SEED, sim_runner_diagnostic, sim_runner_seeded


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("captures/heat-equation"))
    parser.add_argument("--seed", type=int, default=CANONICAL_SEED)
    parser.add_argument(
        "--tier", choices=("test", "diagnostic"), default="test", help="capture tier"
    )
    args = parser.parse_args()
    runner = sim_runner_seeded if args.tier == "test" else sim_runner_diagnostic
    manifest = runner(args.seed, args.out)
    print(manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
