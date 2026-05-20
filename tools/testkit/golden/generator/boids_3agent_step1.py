"""Generator/verifier for the 3-agent boids step-1 golden table.

Re-derives the table at
``tools/testkit/golden/tables/agent-based/boids-3agent-step1.json``
from the closed-form formulae in
``tools/testkit/golden/derivations/boids-3agent-step1.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.boids_3agent_step1 --verify
"""

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
    / "agent-based"
    / "boids-3agent-step1.json"
)

W_S = 1.5
W_A = 1.0
W_C = 1.0
DT = 0.05
V_MAX = 3.0
PERC = 5.0


def _step_one_agent(
    p_self: tuple[float, float, float],
    v_self: tuple[float, float, float],
    others: list[tuple[tuple[float, float, float], tuple[float, float, float]]],
) -> tuple[list[float], list[float]]:
    """Reynolds-1987 update for one agent under fixed canonical parameters."""
    f_sep = [0.0, 0.0, 0.0]
    f_align = [0.0, 0.0, 0.0]
    f_coh = [0.0, 0.0, 0.0]
    n = 0
    for pj, vj in others:
        d = [p_self[i] - pj[i] for i in range(3)]
        dist2 = sum(x * x for x in d)
        if math.sqrt(dist2) > PERC:
            continue
        n += 1
        for i in range(3):
            f_sep[i] += d[i] / dist2
            f_align[i] += vj[i]
            f_coh[i] += pj[i]
    if n > 0:
        for i in range(3):
            f_align[i] = f_align[i] / n - v_self[i]
            f_coh[i] = f_coh[i] / n - p_self[i]
    total = [W_S * f_sep[i] + W_A * f_align[i] + W_C * f_coh[i] for i in range(3)]
    v_new = [v_self[i] + DT * total[i] for i in range(3)]
    speed = math.sqrt(sum(x * x for x in v_new))
    if speed > V_MAX:
        v_new = [v_new[i] * V_MAX / speed for i in range(3)]
    p_new = [p_self[i] + DT * v_new[i] for i in range(3)]
    return v_new, p_new


def compute_canonical() -> dict[str, dict[str, list[float]]]:
    """Compute v^{n+1} and p^{n+1} for the canonical 3-agent fixture."""
    agents = {
        "A": ((0.0, 0.0, 0.0), (1.0, 0.0, 0.0)),
        "B": ((1.0, 0.0, 0.0), (-1.0, 0.0, 0.0)),
        "C": ((0.0, 1.0, 0.0), (0.0, 0.0, 1.0)),
    }
    out: dict[str, dict[str, list[float]]] = {}
    for name in ("A", "B", "C"):
        p, v = agents[name]
        others = [agents[k] for k in agents if k != name]
        v_new, p_new = _step_one_agent(p, v, others)
        out[name] = {"v_new": v_new, "p_new": p_new}
    return out


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    expected = compute_canonical()
    failures: list[str] = []
    tp = table["test_points"][0]
    for name in ("A", "B", "C"):
        for field in ("v_new", "p_new"):
            anchor = expected[name][field]
            table_val = tp["expected"][name][field]
            for axis in range(3):
                if abs(anchor[axis] - table_val[axis]) > 1e-12:
                    failures.append(
                        f"{name}.{field}[{axis}]: table={table_val[axis]} computed={anchor[axis]}",
                    )
    if failures:
        print("FAIL — recomputed ≠ table:", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
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
