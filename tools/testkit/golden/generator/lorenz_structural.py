"""SymPy generator for the Lorenz structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/lorenz-structural.json``
from the canonical parameters ``(sigma, rho, beta) = (10, 28, 8/3)``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/lorenz-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.lorenz_structural --verify

Phase 1 Stage 2 ships this generator; Phase 2+ implementation of the
strange-attractors sim adds the sim-side cross-check at
``packages/strange-attractors/tests/test_lorenz_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

CANONICAL_SIGMA = sp.Integer(10)
CANONICAL_RHO = sp.Integer(28)
CANONICAL_BETA = sp.Rational(8, 3)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "lorenz-structural.json"
)


def _lorenz_fixed_points(
    sigma: sp.Expr, rho: sp.Expr, beta: sp.Expr
) -> list[tuple[sp.Expr, sp.Expr, sp.Expr]]:
    """Symbolic fixed points of the Lorenz system at (sigma, rho, beta)."""
    r = sp.sqrt(beta * (rho - 1))
    return [
        (sp.Integer(0), sp.Integer(0), sp.Integer(0)),
        (r, r, rho - 1),
        (-r, -r, rho - 1),
    ]


def _origin_jacobian_eigenvalues(sigma: sp.Expr, rho: sp.Expr, beta: sp.Expr) -> list[sp.Expr]:
    """Symbolic eigenvalues of J(P_0) for the Lorenz system."""
    discriminant = (sigma + 1) ** 2 + 4 * sigma * (rho - 1)
    lam_plus = (-(sigma + 1) + sp.sqrt(discriminant)) / 2
    lam_minus = (-(sigma + 1) - sp.sqrt(discriminant)) / 2
    lam_z = -beta
    return [lam_plus, lam_minus, lam_z]


def _divergence(sigma: sp.Expr, rho: sp.Expr, beta: sp.Expr) -> sp.Expr:
    """Lorenz vector field divergence (constant in x).

    ``rho`` is part of the signature for symmetry with the other helpers and
    to keep call sites uniform; the divergence itself depends only on
    ``sigma`` and ``beta``.
    """
    _ = rho
    return -sigma - 1 - beta


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set for canonical params."""
    s, r, b = CANONICAL_SIGMA, CANONICAL_RHO, CANONICAL_BETA
    p0, cp, cm = _lorenz_fixed_points(s, r, b)
    lam1, lam2, lam3 = _origin_jacobian_eigenvalues(s, r, b)
    div = _divergence(s, r, b)
    return {
        "fixed_points": {
            "P0": [float(p0[0]), float(p0[1]), float(p0[2])],
            "C_plus": [float(cp[0]), float(cp[1]), float(cp[2])],
            "C_minus": [float(cm[0]), float(cm[1]), float(cm[2])],
        },
        "origin_jacobian_eigenvalues": sorted(
            [float(lam1), float(lam2), float(lam3)],
        ),
        "divergence": float(div),
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
    # Three test points, one per structural quantity.
    for tp in table["test_points"]:
        name = tp["inputs"]["quantity"]
        got_expected = tp["expected"]
        if name == "fixed_points":
            for key in ("P0", "C_plus", "C_minus"):
                for axis, anchor_val in enumerate(expected["fixed_points"][key]):
                    table_val = got_expected[key][axis]
                    if abs(anchor_val - table_val) > 1e-10:
                        failures.append(
                            f"fixed_points.{key}[{axis}]: table={table_val} sympy={anchor_val}",
                        )
        elif name == "origin_jacobian_eigenvalues":
            anchor = expected["origin_jacobian_eigenvalues"]
            table_eigs = sorted(got_expected["eigenvalues"])
            for i, (a, t) in enumerate(zip(anchor, table_eigs, strict=True)):
                if abs(a - t) > 1e-9:
                    failures.append(
                        f"origin_jacobian_eigenvalues[{i}]: table={t} sympy={a}",
                    )
        elif name == "divergence":
            anchor = expected["divergence"]
            table_val = got_expected["divergence"]
            if abs(anchor - table_val) > 1e-12:
                failures.append(
                    f"divergence: table={table_val} sympy={anchor}",
                )
        else:
            failures.append(f"unknown quantity in test_points: {name!r}")

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
