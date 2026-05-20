"""SymPy generator for the Mandelbulb distance-estimator sample golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json``
from the closed-form formulae in
``tools/testkit/golden/derivations/mandelbulb-de-samples.md``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.mandelbulb_de_samples --verify
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

P = sp.Integer(8)  # power of the mandelbulb map
ESCAPE = sp.Integer(2)  # escape radius

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "mandelbulb-de-samples.json"
)


def _zp_spherical(z: tuple[sp.Expr, sp.Expr, sp.Expr]) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
    """Compute z^p using the Quilez 2009 spherical-coord formula (exact)."""
    x, y, z3 = z
    r = sp.sqrt(x**2 + y**2 + z3**2)
    if r == 0:
        return (sp.Integer(0), sp.Integer(0), sp.Integer(0))
    theta = sp.acos(z3 / r)
    phi = sp.atan2(y, x)
    rp = r**P
    return (
        rp * sp.sin(P * theta) * sp.cos(P * phi),
        rp * sp.sin(P * theta) * sp.sin(P * phi),
        rp * sp.cos(P * theta),
    )


def _de_for(c: tuple[sp.Expr, sp.Expr, sp.Expr]) -> sp.Expr:
    """Mandelbulb DE evaluated at c with canonical (p=8, R=2, Nmax=16)."""
    if sp.simplify(sp.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)) == 0:
        return sp.Integer(0)  # in-set sentinel for the origin
    z = c
    dz = sp.Integer(1)
    for _ in range(16):
        zmag_sq = z[0] ** 2 + z[1] ** 2 + z[2] ** 2
        zmag = sp.sqrt(zmag_sq)
        if sp.simplify(zmag - ESCAPE) > 0:
            return sp.Rational(1, 2) * zmag * sp.log(zmag) / dz
        z_pow = _zp_spherical(z)
        dz = P * zmag ** (P - 1) * dz + 1
        z = (z_pow[0] + c[0], z_pow[1] + c[1], z_pow[2] + c[2])
    # Did not escape within Nmax — in-set sentinel.
    return sp.Integer(0)


def compute_canonical() -> dict[str, float]:
    """Return DE values at the three canonical anchor points."""
    de_origin = _de_for((sp.Integer(0), sp.Integer(0), sp.Integer(0)))
    de_one = _de_for((sp.Integer(1), sp.Integer(0), sp.Integer(0)))
    de_ten = _de_for((sp.Integer(10), sp.Integer(0), sp.Integer(0)))
    return {
        "origin": float(de_origin),
        "bounding_sphere_x_axis": float(sp.N(de_one, 30)),
        "far_field_x_axis_10": float(sp.N(de_ten, 30)),
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    """Verify the committed table matches SymPy's symbolic evaluation."""
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    expected = compute_canonical()

    failures: list[str] = []
    aliases = {
        "origin": "origin",
        "bounding_sphere_x_axis": "bounding-sphere-x-axis",
        "far_field_x_axis_10": "far-field-x-axis-10",
    }
    for sympy_key, table_key in aliases.items():
        tp = next(
            (p for p in table["test_points"] if p["inputs"]["name"] == table_key),
            None,
        )
        if tp is None:
            failures.append(f"missing test point {table_key!r} in table")
            continue
        table_val = tp["expected"]["DE"]
        sympy_val = expected[sympy_key]
        diff = abs(table_val - sympy_val)
        if diff > 1e-12:
            failures.append(
                f"{table_key}: table={table_val} sympy={sympy_val} diff={diff}",
            )

    if failures:
        print("FAIL — SymPy ≠ table:", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches SymPy at canonical (p=8, R=2).")
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
        help="Print computed DE anchor values to stdout.",
    )
    args = parser.parse_args()

    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0

    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
