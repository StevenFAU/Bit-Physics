"""CLI: write the committed web gate assets.

``uv run --no-sync python -m fdtd_optics [--out packages/fdtd-optics/web/public]``
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .sim import write_gate_assets


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "web" / "public",
    )
    args = parser.parse_args()
    bin_path, json_path = write_gate_assets(args.out)
    print(bin_path)
    print(json_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
