"""SymPy generator for the Thomas structural-invariants golden table.

Reproduces the values committed at
``tools/testkit/golden/tables/closed-form/thomas-structural.json``
from the canonical parameter ``b = 0.208186``.

Per spec § 2.4 (R9 amendment), the generator's role is to **verify**
that SymPy's algebraic evaluation (plus an mpmath 30-dps root for the
transcendental diagonal fixed point) agrees with the hand-derived
independent-reference anchor values committed in the table. The
derivation is at ``tools/testkit/golden/derivations/thomas-structural.md``.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.thomas_structural --verify

The sim-side cross-check lives at
``packages/strange-attractors/tests/test_family_structural_golden.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import mpmath
import sympy as sp

CANONICAL_B = sp.Rational(208186, 1000000)

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "closed-form"
    / "thomas-structural.json"
)

_X, _Y, _Z = sp.symbols("x y z", real=True)


def _field(b: sp.Expr) -> sp.Matrix:
    """Thomas vector field as a symbolic column."""
    return sp.Matrix(
        [
            sp.sin(_Y) - b * _X,
            sp.sin(_Z) - b * _Y,
            sp.sin(_X) - b * _Z,
        ]
    )


def _origin_eigenvalues(b: sp.Expr) -> dict[str, float]:
    """Eigenvalues of J(0) = -b*I + P via the cube-roots-of-unity closed form.

    Symbolically verifies that the characteristic polynomial factors as
    ``(lam - (1 - b)) * ((lam + b + 1/2)**2 + 3/4)`` — i.e. eigenvalues
    ``-b`` plus the cube roots of unity — before returning the float
    encodings used by the table.
    """
    lam = sp.Symbol("lambda")
    j0 = _field(b).jacobian(sp.Matrix([_X, _Y, _Z])).subs({_X: 0, _Y: 0, _Z: 0})
    charpoly = j0.charpoly(lam).as_expr()
    closed_form = (lam - (1 - b)) * ((lam - (-b - sp.Rational(1, 2))) ** 2 + sp.Rational(3, 4))
    if sp.expand(charpoly - closed_form) != 0:
        raise RuntimeError("origin charpoly does not match the cube-roots-of-unity closed form")
    return {
        "real_eigenvalue": float((1 - b).evalf(30)),
        "spiral_pair_re": float((-b - sp.Rational(1, 2)).evalf(30)),
        "spiral_pair_im_abs": float((sp.sqrt(3) / 2).evalf(30)),
    }


def _diagonal_u_star(b: sp.Rational) -> float:
    """The positive diagonal fixed-point coordinate: sin(u) = b*u on (pi/2, pi).

    The root is transcendental, so it is anchored numerically with
    mpmath at 30 decimal digits; the table carries the float64 rounding
    of the high-precision root.
    """
    with mpmath.workdps(30):
        b_mp = mpmath.mpf(int(b.p)) / mpmath.mpf(int(b.q))
        root = mpmath.findroot(lambda u: mpmath.sin(u) - b_mp * u, mpmath.mpf("2.5"))
        if not mpmath.pi / 2 < root < mpmath.pi:
            raise RuntimeError(f"diagonal root {root} escaped (pi/2, pi)")
        residual = mpmath.sin(root) - b_mp * root
        if abs(residual) > mpmath.mpf("1e-25"):
            raise RuntimeError(f"diagonal root residual too large: {residual}")
        return float(root)


def _divergence(b: sp.Expr) -> float:
    """div f = tr J = -3*b, verified symbolically against the trace."""
    trace = _field(b).jacobian(sp.Matrix([_X, _Y, _Z])).trace()
    if sp.simplify(trace - (-3 * b)) != 0:
        raise RuntimeError(f"SymPy trace is {trace}, expected exactly -3*b")
    return float((-3 * b).evalf(30))


def _cyclic_residual(b: sp.Expr) -> sp.Matrix:
    """Symbolic residual of the cyclic symmetry (x, y, z) -> (y, z, x).

    residual = f(C s) - C f(s) with C the cyclic permutation matrix;
    must be the exact zero matrix.
    """
    field = _field(b)
    rotation = sp.Matrix([[0, 1, 0], [0, 0, 1], [1, 0, 0]])
    transformed = field.subs({_X: _Y, _Y: _Z, _Z: _X}, simultaneous=True)
    return sp.expand(transformed - rotation * field)


def compute_canonical() -> dict[str, object]:
    """Return the canonical structural-invariant set at b = 0.208186."""
    b = CANONICAL_B
    residual = _cyclic_residual(b)
    if not residual.is_zero_matrix:
        raise RuntimeError(f"cyclic residual is not exactly zero: {residual.T}")
    return {
        "origin_jacobian_eigenvalues": _origin_eigenvalues(b),
        "u_star": _diagonal_u_star(b),
        "divergence": _divergence(b),
        "cyclic_symmetry_residual": 0.0,
    }


def _close(got: float, want: float, tol: dict[str, float]) -> bool:
    diff = abs(got - want)
    return diff <= tol["absolute"] or diff <= tol["relative"] * abs(want)


def verify(table_path: Path = TABLE_PATH) -> int:
    """Verify the committed table matches SymPy/mpmath evaluation."""
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    tol = table["tolerance"]
    anchor = compute_canonical()

    failures: list[str] = []

    def check_eigenvalues(expected: dict[str, object], label: str) -> None:
        anchor_block = anchor["origin_jacobian_eigenvalues"]
        for key in ("real_eigenvalue", "spiral_pair_re", "spiral_pair_im_abs"):
            if key not in expected:
                continue
            if not _close(anchor_block[key], expected[key], tol):
                failures.append(
                    f"{label} {key}: table={expected[key]} sympy={anchor_block[key]}",
                )

    def check_diagonal(expected: dict[str, object], label: str) -> None:
        if not _close(anchor["u_star"], expected["u_star"], tol):
            failures.append(
                f"{label} u_star: table={expected['u_star']} mpmath={anchor['u_star']}",
            )

    def check_div_and_symmetry(expected: dict[str, object], label: str) -> None:
        for key, anchor_key in (
            ("divergence", "divergence"),
            ("cyclic_symmetry_residual", "cyclic_symmetry_residual"),
        ):
            if key not in expected:
                continue
            if not _close(anchor[anchor_key], expected[key], tol):
                failures.append(
                    f"{label} {key}: table={expected[key]} sympy={anchor[anchor_key]}",
                )

    checkers = {
        "origin_jacobian_eigenvalues": check_eigenvalues,
        "diagonal_fixed_points": check_diagonal,
        "divergence_and_cyclic_symmetry": check_div_and_symmetry,
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
        print("FAIL — SymPy/mpmath ≠ table:", file=sys.stderr)
        for msg in failures:
            print(f"  {msg}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches SymPy/mpmath at canonical b.")
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
