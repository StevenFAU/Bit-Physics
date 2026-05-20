"""Generator/verifier for the DFSPH density-evolution two-particle golden."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "particle-fluids"
    / "dfsph-density-evolution.json"
)


def _f(q: float) -> float:
    """Cubic-spline kernel function f(q) (3D Monaghan)."""
    if 0.0 <= q < 1.0:
        return 1.0 - 1.5 * q * q + 0.75 * q * q * q
    if 1.0 <= q < 2.0:
        s = 2.0 - q
        return 0.25 * s * s * s
    return 0.0


def _fprime(q: float) -> float:
    """First derivative f'(q)."""
    if 0.0 <= q < 1.0:
        return -3.0 * q + (9.0 / 4.0) * q * q
    if 1.0 <= q < 2.0:
        s = 2.0 - q
        return -0.75 * s * s
    return 0.0


def compute_canonical() -> dict[str, float]:
    """Compute rho_0 and drho_0/dt for the two-particle fixture."""
    sigma3 = 1.0 / math.pi  # 3D normalization
    h = 1.0
    # Density at particle 0 (self + neighbor at 0.5h)
    rho_0 = (sigma3 / h**3) * _f(0.0) + (sigma3 / h**3) * _f(0.5)
    # Density evolution: only j=1 contributes (self gradient is zero)
    # v_0 - v_1 = (-1, 0, 0); (r_0 - r_1)/|r_0 - r_1| = (-1, 0, 0); q = 0.5
    grad_W_x = (sigma3 / h**4) * _fprime(0.5) * (-1.0)  # = sigma3 * 0.9375
    drho_dt = 1.0 * (-1.0) * grad_W_x  # m_j * (v_0_x - v_1_x) * grad_W_x
    return {"rho_0": rho_0, "drho_dt_0": drho_dt}


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    expected = compute_canonical()
    tp = table["test_points"][0]
    failures: list[str] = []
    for key in ("rho_0", "drho_dt_0"):
        table_val = tp["expected"][key]
        sympy_val = expected[key]
        if abs(table_val - sympy_val) > 1e-15:
            failures.append(f"{key}: table={table_val} computed={sympy_val}")
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
