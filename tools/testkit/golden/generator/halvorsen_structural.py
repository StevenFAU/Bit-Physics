"""SymPy generator for the Halvorsen structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/halvorsen-structural.json``
from the canonical parameter ``a = 1.4``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at
``tools/testkit/golden/derivations/halvorsen-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.halvorsen_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

CANONICAL_A = sp.Rational(7, 5)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "halvorsen-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field(a: sp.Expr) -> sp.Matrix:
    """Halvorsen vector field as a symbolic column."""
    return sp.Matrix(
        [
            -a * _X - 4 * _Y - 4 * _Z - _Y**2,
            -a * _Y - 4 * _Z - 4 * _X - _Z**2,
            -a * _Z - 4 * _X - 4 * _Y - _X**2,
        ]
    )


def _origin_eigenvalues(a: sp.Expr) -> list[float]:
    """Ascending eigenvalues of the symmetric circulant J(0).

    Symbolically verifies the characteristic polynomial factors as
    ``(lam + a + 8) * (lam + a - 4)**2`` — the circulant eigenstructure
    with -a-8 on the diagonal direction and -a+4 (twice) on its
    complement — before returning the float encodings.
    """
    lam = sp.Symbol("lambda")
    j0 = _field(a).jacobian(sp.Matrix([_X, _Y, _Z])).subs({_X: 0, _Y: 0, _Z: 0})
    charpoly = j0.charpoly(lam).as_expr()
    closed_form = (lam - (-a - 8)) * (lam - (-a + 4)) ** 2
    if sp.expand(charpoly - closed_form) != 0:
        raise RuntimeError("origin charpoly does not match the circulant closed form")
    return sorted([float((-a - 8).evalf(30)), float((-a + 4).evalf(30)), float((-a + 4).evalf(30))])


def _divergence(a: sp.Expr) -> float:
    """div f = tr J = -3*a, verified symbolically against the trace."""
    trace = _field(a).jacobian(sp.Matrix([_X, _Y, _Z])).trace()
    if sp.simplify(trace - (-3 * a)) != 0:
        raise RuntimeError(f"SymPy trace is {trace}, expected exactly -3*a")
    return float((-3 * a).evalf(30))


def _cyclic_residual(a: sp.Expr) -> sp.Matrix:
    """Symbolic residual of the cyclic symmetry (x, y, z) -> (y, z, x).

    residual = f(C s) - C f(s) with C the cyclic permutation matrix;
    must be the exact zero matrix.
    """
    field = _field(a)
    rotation = sp.Matrix([[0, 1, 0], [0, 0, 1], [1, 0, 0]])
    transformed = field.subs({_X: _Y, _Y: _Z, _Z: _X}, simultaneous=True)
    return sp.expand(transformed - rotation * field)


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set at a = 1.4."""
    a = CANONICAL_A
    residual = _cyclic_residual(a)
    if not residual.is_zero_matrix:
        raise RuntimeError(f"cyclic residual is not exactly zero: {residual.T}")
    return {
        "eigenvalues_ascending": _origin_eigenvalues(a),
        "divergence": _divergence(a),
        "cyclic_residual": 0.0,
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

    def check_symmetry(expected: dict[str, object], label: str) -> None:
        if not _close(anchor["cyclic_residual"], expected["residual"], tol):
            failures.append(
                f"{label} residual: table={expected['residual']} sympy={anchor['cyclic_residual']}",
            )

    checkers = {
        "origin_jacobian_eigenvalues": check_eigenvalues,
        "divergence": check_divergence,
        "cyclic_symmetry": check_symmetry,
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
    print(f"OK — {table_path} matches SymPy at canonical a.")
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
