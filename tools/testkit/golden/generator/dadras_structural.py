"""SymPy generator for the Dadras structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/dadras-structural.json``
from the canonical parameters ``(p, o, r, c, e) = (3, 2.7, 1.7, 2, 9)``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/dadras-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.dadras_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

CANONICAL_P = sp.Integer(3)
CANONICAL_O = sp.Rational(27, 10)
CANONICAL_R = sp.Rational(17, 10)
CANONICAL_C = sp.Integer(2)
CANONICAL_E = sp.Integer(9)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "dadras-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field(p: sp.Expr, o: sp.Expr, r: sp.Expr, c: sp.Expr, e: sp.Expr) -> sp.Matrix:
    """Dadras-Momeni vector field as a symbolic column."""
    return sp.Matrix(
        [
            _Y - p * _X + o * _Y * _Z,
            r * _Y - _X * _Z + _Z,
            c * _X * _Y - e * _Z,
        ]
    )


def _origin_eigenvalues(p: sp.Expr, o: sp.Expr, r: sp.Expr, c: sp.Expr, e: sp.Expr) -> list[float]:
    """Ascending eigenvalues of the upper-triangular J(0): (-p, r, -e).

    Asserts the sub-diagonal entries of J(0) vanish (triangularity) and
    symbolically verifies the characteristic polynomial factors as
    ``(lam + p) * (lam - r) * (lam + e)`` before returning the floats.
    """
    lam = sp.Symbol("lambda")
    j0 = _field(p, o, r, c, e).jacobian(sp.Matrix([_X, _Y, _Z])).subs({_X: 0, _Y: 0, _Z: 0})
    for row, col in ((1, 0), (2, 0), (2, 1)):
        if j0[row, col] != 0:
            raise RuntimeError(f"J(0)[{row},{col}] = {j0[row, col]} breaks triangularity")
    charpoly = j0.charpoly(lam).as_expr()
    closed_form = (lam + p) * (lam - r) * (lam + e)
    if sp.expand(charpoly - closed_form) != 0:
        raise RuntimeError("origin charpoly does not match the triangular closed form")
    return sorted([float((-p).evalf(30)), float(r.evalf(30)), float((-e).evalf(30))])


def _divergence(p: sp.Expr, o: sp.Expr, r: sp.Expr, c: sp.Expr, e: sp.Expr) -> float:
    """div f = tr J = -p + r - e, verified symbolically against the trace."""
    trace = _field(p, o, r, c, e).jacobian(sp.Matrix([_X, _Y, _Z])).trace()
    if sp.simplify(trace - (-p + r - e)) != 0:
        raise RuntimeError(f"SymPy trace is {trace}, expected exactly -p + r - e")
    return float((-p + r - e).evalf(30))


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set for canonical params."""
    p, o, r, c, e = CANONICAL_P, CANONICAL_O, CANONICAL_R, CANONICAL_C, CANONICAL_E
    origin_field = _field(p, o, r, c, e).subs({_X: 0, _Y: 0, _Z: 0})
    if not origin_field.is_zero_matrix:
        raise RuntimeError(f"field at origin is not exactly zero: {origin_field.T}")
    return {
        "eigenvalues_ascending": _origin_eigenvalues(p, o, r, c, e),
        "divergence": _divergence(p, o, r, c, e),
        "field_at_origin": [0.0, 0.0, 0.0],
    }


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

    def check_eigenvalues(expected: dict[str, object], label: str) -> None:
        for i, (a_v, t_v) in enumerate(
            zip(anchor["eigenvalues_ascending"], expected["eigenvalues_ascending"], strict=True),
        ):
            if not _close(a_v, t_v, tol):
                failures.append(f"{label} eigenvalues_ascending[{i}]: table={t_v} sympy={a_v}")

    def check_divergence(expected: dict[str, object], label: str) -> None:
        if not _close(anchor["divergence"], expected["divergence"], tol):
            failures.append(
                f"{label} divergence: table={expected['divergence']} sympy={anchor['divergence']}",
            )

    def check_origin_probe(expected: dict[str, object], label: str) -> None:
        for axis, (a_v, t_v) in enumerate(
            zip(anchor["field_at_origin"], expected["field_at_origin"], strict=True),
        ):
            if not _close(a_v, t_v, tol):
                failures.append(f"{label} field_at_origin[{axis}]: table={t_v} sympy={a_v}")

    checkers = {
        "origin_jacobian_eigenvalues": check_eigenvalues,
        "divergence": check_divergence,
        "origin_field_probe": check_origin_probe,
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
        for msg in failures:
            print(f"  {msg}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches SymPy at canonical parameters.")
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
