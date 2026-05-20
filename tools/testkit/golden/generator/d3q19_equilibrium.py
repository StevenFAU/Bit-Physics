"""Generator/verifier for the D3Q19 equilibrium-distribution golden."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2] / "golden" / "tables" / "lattice" / "d3q19-equilibrium.json"
)

VELOCITIES: list[tuple[int, int, int]] = [
    (0, 0, 0),
    (1, 0, 0),
    (-1, 0, 0),
    (0, 1, 0),
    (0, -1, 0),
    (0, 0, 1),
    (0, 0, -1),
    (1, 1, 0),
    (-1, -1, 0),
    (1, -1, 0),
    (-1, 1, 0),
    (1, 0, 1),
    (-1, 0, -1),
    (1, 0, -1),
    (-1, 0, 1),
    (0, 1, 1),
    (0, -1, -1),
    (0, 1, -1),
    (0, -1, 1),
]
WEIGHTS: list[float] = [1.0 / 3.0] + [1.0 / 18.0] * 6 + [1.0 / 36.0] * 12
assert len(VELOCITIES) == 19 and len(WEIGHTS) == 19
CS2 = 1.0 / 3.0


def feq(rho: float, u: tuple[float, float, float]) -> list[float]:
    """Return the 19 f_i^eq values at (rho, u)."""
    ux, uy, uz = u
    u_sq = ux * ux + uy * uy + uz * uz
    out: list[float] = []
    for c, w in zip(VELOCITIES, WEIGHTS, strict=True):
        cu = c[0] * ux + c[1] * uy + c[2] * uz
        out.append(w * rho * (1.0 + cu / CS2 + (cu * cu) / (2.0 * CS2 * CS2) - u_sq / (2.0 * CS2)))
    return out


def compute_canonical() -> dict[str, object]:
    rho = 1.0
    u = (0.1, 0.0, 0.0)
    f = feq(rho, u)
    return {
        "rho_in": rho,
        "u_in": list(u),
        "f_eq": f,
        "density_moment": sum(f),
        "momentum_x": sum(VELOCITIES[i][0] * f[i] for i in range(19)),
        "momentum_y": sum(VELOCITIES[i][1] * f[i] for i in range(19)),
        "momentum_z": sum(VELOCITIES[i][2] * f[i] for i in range(19)),
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
    for i in range(19):
        if abs(tp["expected"]["f_eq"][i] - expected["f_eq"][i]) > 1e-15:
            failures.append(
                f"f_eq[{i}]: table={tp['expected']['f_eq'][i]} computed={expected['f_eq'][i]}"
            )
    for key in ("density_moment", "momentum_x", "momentum_y", "momentum_z"):
        if abs(tp["expected"][key] - expected[key]) > 1e-14:  # type: ignore[arg-type]
            failures.append(f"{key}: table={tp['expected'][key]} computed={expected[key]}")
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
