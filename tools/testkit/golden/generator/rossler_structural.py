"""SymPy generator for the Rössler structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/rossler-structural.json``
from the canonical parameters ``(a, b, c) = (0.2, 0.2, 5.7)``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/rossler-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.rossler_structural --verify

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
CANONICAL_B = sp.Rational(1, 5)
CANONICAL_C = sp.Rational(57, 10)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "rossler-structural.json"
)


def _fixed_points(
    a: sp.Expr, b: sp.Expr, c: sp.Expr
) -> dict[str, tuple[sp.Expr, sp.Expr, sp.Expr]]:
    """Symbolic fixed points of the Rössler system at (a, b, c).

    From dx/dt = 0: y = -z; from dy/dt = 0: x = -a*y = a*z; substituting
    into dz/dt = 0 gives a*z**2 - c*z + b = 0, so
    z_± = (c ± sqrt(c**2 - 4*a*b)) / (2*a) with x = a*z, y = -z.
    """
    disc = c**2 - 4 * a * b
    z_in = (c - sp.sqrt(disc)) / (2 * a)
    z_out = (c + sp.sqrt(disc)) / (2 * a)
    return {
        "P_in": (a * z_in, -z_in, z_in),
        "P_out": (a * z_out, -z_out, z_out),
    }


def _jacobian(point: tuple[sp.Expr, sp.Expr, sp.Expr], a: sp.Expr, c: sp.Expr) -> sp.Matrix:
    """Symbolic Jacobian of the Rössler field at ``point``.

    Derived from f = (-y - z, x + a*y, b + z*(x - c)) via SymPy's
    ``Matrix.jacobian`` so no row is hand-transcribed.
    """
    x, y, z = sp.symbols("x y z", real=True)
    field = sp.Matrix([-y - z, x + a * y, sp.Symbol("b_param") + z * (x - c)])
    jac = field.jacobian(sp.Matrix([x, y, z]))
    return jac.subs({x: point[0], y: point[1], z: point[2]})


def _inner_eigenvalue_pairs(a: sp.Expr, b: sp.Expr, c: sp.Expr) -> list[tuple[float, float]]:
    """Eigenvalues of J(P_in) as sorted (re, im) pairs."""
    p_in = _fixed_points(a, b, c)["P_in"]
    jac = _jacobian(p_in, a, c)
    lam = sp.Symbol("lambda")
    charpoly = jac.charpoly(lam).as_expr()
    roots = sp.solve(sp.Eq(charpoly, 0), lam)
    if len(roots) != 3:
        raise RuntimeError(f"expected 3 eigenvalues, got {len(roots)}")
    pairs = [(float(sp.re(root.evalf(30))), float(sp.im(root.evalf(30)))) for root in roots]
    return sorted(pairs)


def _divergence(point: tuple[sp.Expr, sp.Expr, sp.Expr], a: sp.Expr, c: sp.Expr) -> sp.Expr:
    """div f = tr J = a + (x - c), verified symbolically against the trace."""
    x = sp.Symbol("x", real=True)
    generic_trace = _jacobian((x, sp.Integer(0), sp.Integer(0)), a, c).trace()
    if sp.simplify(generic_trace - (a + x - c)) != 0:
        raise RuntimeError("SymPy trace disagrees with the closed form a + (x - c)")
    return a + point[0] - c


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set for canonical params."""
    a, b, c = CANONICAL_A, CANONICAL_B, CANONICAL_C
    fps = _fixed_points(a, b, c)
    return {
        "fixed_points": {
            key: [float(coord.evalf(30)) for coord in fps[key]] for key in ("P_in", "P_out")
        },
        "inner_fixed_point_jacobian_eigenvalues": [
            list(pair) for pair in _inner_eigenvalue_pairs(a, b, c)
        ],
        "divergence": {
            "at_inner_fixed_point": float(_divergence(fps["P_in"], a, c).evalf(30)),
            "at_origin": float(_divergence((sp.Integer(0),) * 3, a, c).evalf(30)),
        },
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
        for key in ("P_in", "P_out"):
            if key not in expected:
                continue
            for axis, anchor_val in enumerate(anchor["fixed_points"][key]):
                table_val = expected[key][axis]
                if not _close(anchor_val, table_val, tol):
                    failures.append(
                        f"{label} fixed_points.{key}[{axis}]: table={table_val} sympy={anchor_val}",
                    )

    def check_eigenvalues(expected: dict[str, object], label: str) -> None:
        table_pairs = sorted(tuple(pair) for pair in expected["eigenvalues_re_im_sorted"])
        anchor_pairs = anchor["inner_fixed_point_jacobian_eigenvalues"]
        for i, (a_pair, t_pair) in enumerate(zip(anchor_pairs, table_pairs, strict=True)):
            for part, (a_v, t_v) in zip(
                ("re", "im"), zip(a_pair, t_pair, strict=True), strict=True
            ):
                if not _close(a_v, t_v, tol):
                    failures.append(
                        f"{label} inner_fp_eigenvalues[{i}].{part}: table={t_v} sympy={a_v}",
                    )

    def check_divergence(expected: dict[str, object], label: str) -> None:
        for key in ("at_inner_fixed_point", "at_origin"):
            if key not in expected:
                continue
            anchor_val = anchor["divergence"][key]
            table_val = expected[key]
            if not _close(anchor_val, table_val, tol):
                failures.append(
                    f"{label} divergence.{key}: table={table_val} sympy={anchor_val}",
                )

    checkers = {
        "fixed_points": check_fixed_points,
        "inner_fixed_point_jacobian_eigenvalues": check_eigenvalues,
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
