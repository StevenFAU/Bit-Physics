"""SymPy generator for the Chen structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/chen-structural.json``
from the canonical parameters ``(a, b, c) = (35, 3, 28)``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/chen-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.chen_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

CANONICAL_A = sp.Integer(35)
CANONICAL_B = sp.Integer(3)
CANONICAL_C = sp.Integer(28)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "chen-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field(a: sp.Expr, b: sp.Expr, c: sp.Expr) -> sp.Matrix:
    """Chen vector field as a symbolic column."""
    return sp.Matrix(
        [
            a * (_Y - _X),
            (c - a) * _X - _X * _Z + c * _Y,
            _X * _Y - b * _Z,
        ]
    )


def _fixed_points(a: sp.Expr, b: sp.Expr, c: sp.Expr) -> dict[str, list[float]]:
    """SymPy solve of f = 0: the origin plus the Lorenz-sibling pair C±.

    Cross-asserts the hand closed form on each nontrivial solution:
    y = x, z = 2c - a, x**2 = b*(2c - a).
    """
    solutions = sp.solve(list(_field(a, b, c)), [_X, _Y, _Z], dict=True)
    if len(solutions) != 3:
        raise RuntimeError(f"expected 3 fixed points, got {len(solutions)}")
    named: dict[str, dict[sp.Symbol, sp.Expr]] = {}
    for sol in solutions:
        x = sol[_X]
        if x == 0:
            named["P0"] = sol
        else:
            if sp.simplify(sol[_Y] - x) != 0 or sp.simplify(sol[_Z] - (2 * c - a)) != 0:
                raise RuntimeError(f"solution {sol} breaks the closed form y=x, z=2c-a")
            if sp.simplify(x**2 - b * (2 * c - a)) != 0:
                raise RuntimeError(f"solution {sol} breaks x**2 = b*(2c - a)")
            named["C_plus" if x.is_positive else "C_minus"] = sol
    if set(named) != {"P0", "C_plus", "C_minus"}:
        raise RuntimeError(f"unexpected fixed-point set: {sorted(named)}")
    return {key: [float(sol[sym].evalf(30)) for sym in (_X, _Y, _Z)] for key, sol in named.items()}


def _origin_eigenvalues(a: sp.Expr, b: sp.Expr, c: sp.Expr) -> list[float]:
    """Ascending eigenvalues of the block-triangular J(0).

    Symbolically verifies the characteristic polynomial factors as
    ``(lam + b) * (lam**2 + (a - c)*lam - a*(2c - a))`` before returning
    -b plus the quadratic-pair roots as floats.
    """
    lam = sp.Symbol("lambda")
    j0 = _field(a, b, c).jacobian(sp.Matrix([_X, _Y, _Z])).subs({_X: 0, _Y: 0, _Z: 0})
    charpoly = j0.charpoly(lam).as_expr()
    closed_form = (lam + b) * (lam**2 + (a - c) * lam - a * (2 * c - a))
    if sp.expand(charpoly - closed_form) != 0:
        raise RuntimeError("origin charpoly does not match the block-triangular closed form")
    disc = sp.sqrt((a - c) ** 2 + 4 * a * (2 * c - a))
    lam_plus = (-(a - c) + disc) / 2
    lam_minus = (-(a - c) - disc) / 2
    return sorted(
        [
            float(lam_minus.evalf(30)),
            float((-b).evalf(30)),
            float(lam_plus.evalf(30)),
        ]
    )


def _divergence(a: sp.Expr, b: sp.Expr, c: sp.Expr) -> float:
    """div f = tr J = c - a - b, verified symbolically against the trace."""
    trace = _field(a, b, c).jacobian(sp.Matrix([_X, _Y, _Z])).trace()
    if sp.simplify(trace - (c - a - b)) != 0:
        raise RuntimeError(f"SymPy trace is {trace}, expected exactly c - a - b")
    return float((c - a - b).evalf(30))


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set for canonical params."""
    a, b, c = CANONICAL_A, CANONICAL_B, CANONICAL_C
    return {
        "fixed_points": _fixed_points(a, b, c),
        "eigenvalues_ascending": _origin_eigenvalues(a, b, c),
        "divergence": _divergence(a, b, c),
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

    def check_fixed_points(expected: dict[str, object], label: str) -> None:
        for key in ("P0", "C_plus", "C_minus"):
            if key not in expected:
                continue
            for axis, a_v in enumerate(anchor["fixed_points"][key]):
                t_v = expected[key][axis]
                if not _close(a_v, t_v, tol):
                    failures.append(
                        f"{label} fixed_points.{key}[{axis}]: table={t_v} sympy={a_v}",
                    )

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

    checkers = {
        "fixed_points": check_fixed_points,
        "origin_jacobian_eigenvalues": check_eigenvalues,
        "divergence": check_divergence,
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
