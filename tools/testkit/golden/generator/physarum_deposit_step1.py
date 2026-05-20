"""Generator/verifier for the physarum 4-agent single-step deposit golden."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "agent-based"
    / "physarum-deposit-step1.json"
)


def compute_canonical() -> dict[str, object]:
    """Re-derive the post-deposit grid cells for the 4-agent zero-trail fixture."""
    agents = [
        {"p": (4, 4), "h": (1, 0)},
        {"p": (11, 4), "h": (-1, 0)},
        {"p": (4, 11), "h": (0, 1)},
        {"p": (11, 11), "h": (0, -1)},
    ]
    L_m = 1
    deposit = 5.0
    deposits: list[dict[str, object]] = []
    for a in agents:
        nx = a["p"][0] + L_m * a["h"][0]
        ny = a["p"][1] + L_m * a["h"][1]
        deposits.append({"x": nx, "y": ny, "value": deposit})
    return {
        "deposits": deposits,
        "total_mass_before_decay": deposit * len(agents),
        "total_mass_after_decay": deposit * len(agents) * (1.0 - 0.1),
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    expected = compute_canonical()
    tp = table["test_points"][0]
    failures: list[str] = []
    for i, dep_anchor in enumerate(expected["deposits"]):  # type: ignore[arg-type]
        dep_table = tp["expected"]["deposits"][i]
        if (
            dep_anchor["x"] != dep_table["x"]
            or dep_anchor["y"] != dep_table["y"]
            or abs(dep_anchor["value"] - dep_table["value"]) > 1e-15
        ):
            failures.append(f"deposit[{i}]: table={dep_table} anchor={dep_anchor}")
    if (
        abs(expected["total_mass_after_decay"] - tp["expected"]["total_mass_after_decay"])  # type: ignore[operator]
        > 1e-12
    ):
        failures.append("total_mass_after_decay mismatch")
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
