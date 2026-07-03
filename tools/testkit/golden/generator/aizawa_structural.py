"""SymPy generator for the Aizawa structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/aizawa-structural.json``
from the canonical parameters
``(a, b, c, d, e, f) = (0.95, 0.7, 0.6, 3.5, 0.25, 0.1)``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/aizawa-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.aizawa_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

CANONICAL_A = sp.Rational(19, 20)
CANONICAL_B = sp.Rational(7, 10)
CANONICAL_C = sp.Rational(3, 5)
CANONICAL_D = sp.Rational(7, 2)
CANONICAL_E = sp.Rational(1, 4)
CANONICAL_F = sp.Rational(1, 10)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "aizawa-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field(a: sp.Expr, b: sp.Expr, c: sp.Expr, d: sp.Expr, e: sp.Expr, f: sp.Expr) -> sp.Matrix:
    """Aizawa vector field (algebraic.md § 4 form) as a symbolic column."""
    x, y, z = _X, _Y, _Z
    return sp.Matrix(
        [
            (z - b) * x - d * y,
            d * x + (z - b) * y,
            c + a * z - z**3 / 3 - (x**2 + y**2) * (1 + e * z) + f * z * x**3,
        ]
    )


def _axis_roots(a: sp.Expr, c: sp.Expr) -> list[sp.Expr]:
    """Ascending real roots of the on-axis cubic z**3 - 3*a*z - 3*c = 0.

    On the z-axis (x = y = 0) the x- and y-equations vanish identically
    and the z-equation reduces to c + a*z - z**3/3 = 0.
    """
    poly = sp.Poly(_Z**3 - 3 * a * _Z - 3 * c, _Z)
    roots = poly.real_roots()
    if len(roots) != 3:
        raise RuntimeError(f"expected 3 real on-axis roots, got {len(roots)}")
    return sorted(roots, key=lambda r: float(r.evalf(30)))


def _verify_axis_charpoly_factorization(
    a: sp.Expr, b: sp.Expr, c: sp.Expr, d: sp.Expr, e: sp.Expr, f: sp.Expr
) -> None:
    """Symbolically verify the on-axis block-diagonal eigenstructure.

    At (0, 0, z) the Jacobian's characteristic polynomial factors as
    ((lam - (z - b))**2 + d**2) * (lam - (a - z**2)), i.e. eigenvalues
    (z - b) ± d*i and a - z**2 for symbolic z.
    """
    lam = sp.Symbol("lambda")
    jac = _field(a, b, c, d, e, f).jacobian(sp.Matrix([_X, _Y, _Z]))
    axis_jac = jac.subs({_X: 0, _Y: 0})
    charpoly = axis_jac.charpoly(lam).as_expr()
    closed_form = ((lam - (_Z - b)) ** 2 + d**2) * (lam - (a - _Z**2))
    if sp.expand(charpoly - closed_form) != 0:
        raise RuntimeError("on-axis charpoly does not match the block-diagonal closed form")


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set for canonical params."""
    a, b, c, d, e, f = (
        CANONICAL_A,
        CANONICAL_B,
        CANONICAL_C,
        CANONICAL_D,
        CANONICAL_E,
        CANONICAL_F,
    )
    _verify_axis_charpoly_factorization(a, b, c, d, e, f)
    roots = _axis_roots(a, c)
    per_root = []
    for root in roots:
        per_root.append(
            {
                "z": float(root.evalf(30)),
                "spiral_pair_re": float((root - b).evalf(30)),
                "spiral_pair_im_abs": float(d),
                "real_eigenvalue": float((a - root**2).evalf(30)),
            }
        )

    field = _field(a, b, c, d, e, f)
    trace = field.jacobian(sp.Matrix([_X, _Y, _Z])).trace()
    closed_div = 2 * (_Z - b) + a - _Z**2 - e * (_X**2 + _Y**2) + f * _X**3
    if sp.simplify(trace - closed_div) != 0:
        raise RuntimeError("SymPy trace disagrees with the closed-form divergence")
    origin = {_X: 0, _Y: 0, _Z: 0}
    return {
        "axis_fixed_points": [float(r.evalf(30)) for r in roots],
        "axis_jacobian_eigenvalues": per_root,
        "divergence_at_origin": float(trace.subs(origin)),
        "field_at_origin": [float(v) for v in field.subs(origin)],
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

    def check_axis_fixed_points(expected: dict[str, object], label: str) -> None:
        for i, (a_v, t_v) in enumerate(
            zip(anchor["axis_fixed_points"], expected["z_roots_ascending"], strict=True),
        ):
            if not _close(a_v, t_v, tol):
                failures.append(f"{label} z_roots_ascending[{i}]: table={t_v} sympy={a_v}")

    def check_axis_eigenvalues(expected: dict[str, object], label: str) -> None:
        for key, table_block in expected["per_root"].items():
            key_z = float(key.removeprefix("z="))
            match = min(anchor["axis_jacobian_eigenvalues"], key=lambda r: abs(r["z"] - key_z))
            if abs(match["z"] - key_z) > 1e-9:
                failures.append(f"{label} per_root[{key}]: no SymPy root near z={key_z}")
                continue
            for field_key in ("spiral_pair_re", "spiral_pair_im_abs", "real_eigenvalue"):
                a_v, t_v = match[field_key], table_block[field_key]
                if not _close(a_v, t_v, tol):
                    failures.append(
                        f"{label} per_root[{key}].{field_key}: table={t_v} sympy={a_v}",
                    )

    def check_divergence(expected: dict[str, object], label: str) -> None:
        a_v, t_v = anchor["divergence_at_origin"], expected["divergence_at_origin"]
        if not _close(a_v, t_v, tol):
            failures.append(f"{label} divergence_at_origin: table={t_v} sympy={a_v}")
        for axis, (a_c, t_c) in enumerate(
            zip(anchor["field_at_origin"], expected["field_at_origin"], strict=True),
        ):
            if not _close(a_c, t_c, tol):
                failures.append(f"{label} field_at_origin[{axis}]: table={t_c} sympy={a_c}")

    checkers = {
        "axis_fixed_points": check_axis_fixed_points,
        "axis_jacobian_eigenvalues": check_axis_eigenvalues,
        "divergence_and_origin_probe": check_divergence,
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
