"""Generator/verifier for the MLS-MPM quadratic B-spline golden table."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "hybrid-pg"
    / "mls-mpm-shape-functions.json"
)


def N(x: float) -> float:
    """MLS-MPM quadratic B-spline shape function (1D)."""
    ax = abs(x)
    if ax < 0.5:
        return 0.75 - x * x
    if ax < 1.5:
        return 0.5 * (1.5 - ax) ** 2
    return 0.0


def compute_canonical() -> dict[str, object]:
    sample_x = [0.0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 0.25, -0.25, 0.3]
    sample = {f"x={x:+.4f}": N(x) for x in sample_x}
    # Partition-of-unity tests at three particle positions.
    # MLS-MPM convention: base node = floor(p + 0.5) - 1; particle interacts
    # with base, base+1, base+2.
    import math

    pou = {}
    for p in (0.0, 0.3, -0.7):
        base = math.floor(p + 0.5) - 1
        pou[f"p={p:+.2f}"] = sum(N(p - (base + k)) for k in (0, 1, 2))
    return {"samples": sample, "partition_of_unity": pou}


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    expected = compute_canonical()
    tp = table["test_points"][0]
    failures: list[str] = []
    for key, val in expected["samples"].items():  # type: ignore[union-attr]
        table_val = tp["expected"]["samples"][key]
        if abs(table_val - val) > 1e-15:
            failures.append(f"samples[{key}]: table={table_val} computed={val}")
    for key, val in expected["partition_of_unity"].items():  # type: ignore[union-attr]
        table_val = tp["expected"]["partition_of_unity"][key]
        if abs(table_val - val) > 1e-15:
            failures.append(f"partition_of_unity[{key}]: table={table_val} computed={val}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches closed-form recomputation.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print", action="store_true")
    args = parser.parse_args()
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
