"""SymPy generator for the four-wing structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/fourwing-structural.json``
from the canonical parameters
``(a, b, c, d, e, f) = (0.2, -0.01, 1, -0.4, -1, -1)``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at
``tools/testkit/golden/derivations/fourwing-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.fourwing_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

CANONICAL_A = sp.Rational(1, 5)
CANONICAL_B = sp.Rational(-1, 100)
CANONICAL_C = sp.Integer(1)
CANONICAL_D = sp.Rational(-2, 5)
CANONICAL_E = sp.Integer(-1)
CANONICAL_F = sp.Integer(-1)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "fourwing-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field(a: sp.Expr, b: sp.Expr, c: sp.Expr, d: sp.Expr, e: sp.Expr, f: sp.Expr) -> sp.Matrix:
    """Four-wing vector field as a symbolic column."""
    return sp.Matrix(
        [
            a * _X + c * _Y * _Z,
            b * _X + d * _Y - _X * _Z,
            e * _Z + f * _X * _Y,
        ]
    )


def _origin_eigenvalues(
    a: sp.Expr, b: sp.Expr, c: sp.Expr, d: sp.Expr, e: sp.Expr, f: sp.Expr
) -> list[float]:
    """Ascending eigenvalues of the lower-triangular J(0): (a, d, e).

    Asserts the super-diagonal entries of J(0) vanish (triangularity;
    the b entry below the diagonal shifts eigenvectors only) and
    symbolically verifies the characteristic polynomial factors as
    ``(lam - a) * (lam - d) * (lam - e)`` before returning the floats.
    """
    lam = sp.Symbol("lambda")
    j0 = _field(a, b, c, d, e, f).jacobian(sp.Matrix([_X, _Y, _Z])).subs({_X: 0, _Y: 0, _Z: 0})
    for row, col in ((0, 1), (0, 2), (1, 2)):
        if j0[row, col] != 0:
            raise RuntimeError(f"J(0)[{row},{col}] = {j0[row, col]} breaks triangularity")
    charpoly = j0.charpoly(lam).as_expr()
    closed_form = (lam - a) * (lam - d) * (lam - e)
    if sp.expand(charpoly - closed_form) != 0:
        raise RuntimeError("origin charpoly does not match the triangular closed form")
    return sorted([float(a.evalf(30)), float(d.evalf(30)), float(e.evalf(30))])


def _divergence(a: sp.Expr, b: sp.Expr, c: sp.Expr, d: sp.Expr, e: sp.Expr, f: sp.Expr) -> float:
    """div f = tr J = a + d + e, verified symbolically against the trace."""
    trace = _field(a, b, c, d, e, f).jacobian(sp.Matrix([_X, _Y, _Z])).trace()
    if sp.simplify(trace - (a + d + e)) != 0:
        raise RuntimeError(f"SymPy trace is {trace}, expected exactly a + d + e")
    return float((a + d + e).evalf(30))


def _parity_residual(
    a: sp.Expr, b: sp.Expr, c: sp.Expr, d: sp.Expr, e: sp.Expr, f: sp.Expr
) -> sp.Matrix:
    """Symbolic residual of the (x, y, z) -> (-x, -y, z) parity symmetry.

    residual = f(P s) - P f(s) with P = diag(-1, -1, 1); must be the
    exact zero matrix.
    """
    field = _field(a, b, c, d, e, f)
    parity = sp.diag(-1, -1, 1)
    transformed = field.subs({_X: -_X, _Y: -_Y}, simultaneous=True)
    return sp.expand(transformed - parity * field)


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set for canonical params."""
    params = (
        CANONICAL_A,
        CANONICAL_B,
        CANONICAL_C,
        CANONICAL_D,
        CANONICAL_E,
        CANONICAL_F,
    )
    residual = _parity_residual(*params)
    if not residual.is_zero_matrix:
        raise RuntimeError(f"parity residual is not exactly zero: {residual.T}")
    return {
        "eigenvalues_ascending": _origin_eigenvalues(*params),
        "divergence": _divergence(*params),
        "parity_residual_max_abs": 0.0,
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

    def check_parity(expected: dict[str, object], label: str) -> None:
        if not _close(anchor["parity_residual_max_abs"], expected["residual"], tol):
            failures.append(
                f"{label} residual: table={expected['residual']} "
                f"sympy={anchor['parity_residual_max_abs']}",
            )

    checkers = {
        "origin_jacobian_eigenvalues": check_eigenvalues,
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
