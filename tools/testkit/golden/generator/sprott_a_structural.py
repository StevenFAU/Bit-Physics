"""SymPy generator for the Sprott-A structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/sprott-a-structural.json``.
The Sprott-A system is parameter-free (Sprott 1994 case A):
``dx/dt = y, dy/dt = -x + y*z, dz/dt = 1 - y**2``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/sprott-a-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.sprott_a_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

import sympy as sp

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "sprott-a-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field() -> sp.Matrix:
    """Sprott-A vector field as a symbolic column."""
    return sp.Matrix([_Y, -_X + _Y * _Z, 1 - _Y**2])


def _equilibrium_solutions() -> list[object]:
    """SymPy solve of f = 0 — the defining structural fact is that it is empty."""
    return sp.solve(list(_field()), [_X, _Y, _Z], dict=True)


def _trace() -> sp.Expr:
    """Symbolic trace of the Jacobian; must be exactly z."""
    return _field().jacobian(sp.Matrix([_X, _Y, _Z])).trace()


def _parity_residual() -> sp.Matrix:
    """Symbolic residual of the (x, y, z) -> (-x, -y, z) parity symmetry.

    residual = f(P s) - P f(s) with P = diag(-1, -1, 1); must be the
    exact zero matrix.
    """
    field = _field()
    parity = sp.diag(-1, -1, 1)
    transformed = field.subs({_X: -_X, _Y: -_Y}, simultaneous=True)
    return sp.expand(transformed - parity * field)


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set (parameter-free)."""
    solutions = _equilibrium_solutions()
    trace = _trace()
    if sp.simplify(trace - _Z) != 0:
        raise RuntimeError(f"SymPy trace is {trace}, expected exactly z")
    residual = _parity_residual()
    if not residual.is_zero_matrix:
        raise RuntimeError(f"parity residual is not exactly zero: {residual.T}")
    return {
        "equilibrium_count": len(solutions),
        "divergence_trace": str(trace),
        "parity_residual_max_abs": 0.0,
    }


def _divergence_at(point: tuple[float, float, float]) -> float:
    trace = _trace()
    return float(trace.subs({_X: point[0], _Y: point[1], _Z: point[2]}))


def _close(got: float, want: float, tol: dict[str, float]) -> bool:
    diff = abs(got - want)
    return diff <= tol["absolute"] or diff <= tol["relative"] * abs(want)


def verify(table_path: Path = TABLE_PATH) -> int:
    """Verify the committed table matches SymPy's symbolic evaluation."""
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    tol = table["tolerance"]
    anchor = compute_canonical()

    failures: list[str] = []

    def check_equilibria(expected: dict[str, object], label: str) -> None:
        if anchor["equilibrium_count"] != expected["count"]:
            failures.append(
                f"{label} count: table={expected['count']} sympy={anchor['equilibrium_count']}",
            )

    def check_divergence(expected: dict[str, object], label: str) -> None:
        for point_key, table_val in expected["at_probe_points"].items():
            point = ast.literal_eval(point_key)
            got = _divergence_at(point)
            if not _close(got, table_val, tol):
                failures.append(
                    f"{label} at_probe_points[{point_key}]: table={table_val} sympy={got}",
                )

    def check_parity(expected: dict[str, object], label: str) -> None:
        # compute_canonical() already asserted the symbolic residual matrix
        # is exactly zero; here we compare against the table's encoding.
        if not _close(anchor["parity_residual_max_abs"], expected["residual"], tol):
            failures.append(
                f"{label} residual: table={expected['residual']} "
                f"sympy={anchor['parity_residual_max_abs']}",
            )

    checkers = {
        "equilibrium_count": check_equilibria,
        "divergence": check_divergence,
        "parity_symmetry": check_parity,
    }
    for tp in table["test_points"]:
        name = tp["inputs"]["quantity"]
        checker = checkers.get(name)
        if checker is None:
            failures.append(f"unknown quantity in test_points: {name!r}")
            continue
        checker(tp["expected"], name)
        checker(tp["independent_reference"]["expected"], f"{name} (independent_reference)")

    if failures:
        print("FAIL — SymPy ≠ table:", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches SymPy (parameter-free case A).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Re-verify the committed table; non-zero exit on mismatch.",
    )
    parser.add_argument(
        "--print",
        action="store_true",
        help="Print computed canonical values to stdout.",
    )
    args = parser.parse_args()

    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0

    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
