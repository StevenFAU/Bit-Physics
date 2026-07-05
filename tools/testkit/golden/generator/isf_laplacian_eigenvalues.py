"""Generator/verifier for the ISF two-spectra eigenvalue golden (table E).

THE porting trap (spec-ref.md § 3, review catch #1): the free Schrödinger
step uses the CONTINUOUS Laplacian eigenvalues (paper Eq. 18)

    lambda(k) = -(2*pi)^2 * (kx^2 + ky^2 + kz^2)          (unit box)

while the pressure projection uses the DISCRETE 7-point-stencil eigenvalues
(paper Eq. 17)

    lambda_tilde(k) = -(4/dx^2) * sum_i sin^2(pi * k_i / N_i).

Mixing them leaves the divergence gate at an O(h^2) floor while everything
else looks right. The table commits paired values over (N, k) so BOTH stacks
(f64 reference, WGSL port, pure-JS build spine) recompute and pin the
convention. The FD symbol identity -(2 - 2*cos(k*dx))/dx^2 =
-(4/dx^2)*sin^2(k*dx/2) is asserted as an internal cross-check.

Derivation: tools/testkit/golden/derivations/isf-laplacian-eigenvalues.md
Usage: --verify / --print.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/schrodinger-smoke"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "volumetric-grid"
    / "isf-laplacian-eigenvalues.json"
)

CASES: list[tuple[int, tuple[int, int, int]]] = [
    (32, (1, 0, 0)),
    (32, (5, 3, 2)),
    (32, (16, 0, 0)),  # Nyquist axis mode — largest spectra separation
    (64, (1, 1, 1)),
    (64, (10, 20, 30)),
    (128, (7, 7, 7)),
]


def closed_form(n: int, mode: tuple[int, int, int]) -> dict[str, float]:
    lam_cont = -((2.0 * math.pi) ** 2) * float(sum(m * m for m in mode))
    dx = 1.0 / n
    lam_disc = -(4.0 / dx**2) * float(sum(math.sin(math.pi * m / n) ** 2 for m in mode))
    # FD symbol trig identity cross-check
    lam_fd = sum(-(2.0 - 2.0 * math.cos(2.0 * math.pi * m / n)) / dx**2 for m in mode)
    assert abs(lam_fd - lam_disc) <= 1e-6 * max(1.0, abs(lam_disc)), (lam_fd, lam_disc)
    return {"lambda_continuous": lam_cont, "lambda_discrete": lam_disc}


def solver_values(n: int, mode: tuple[int, int, int]) -> dict[str, float]:
    from schrodinger_smoke.reference.isf import (
        continuous_laplacian_eigenvalues,
        discrete_laplacian_eigenvalues,
    )

    shape = (n, n, n)
    return {
        "lambda_continuous": float(continuous_laplacian_eigenvalues(shape, 1.0 / n)[mode]),
        "lambda_discrete": float(discrete_laplacian_eigenvalues(shape, 1.0 / n)[mode]),
    }


def compute_canonical() -> list[dict[str, object]]:
    return [{"n": n, "mode": list(mode), **closed_form(n, mode)} for n, mode in CASES]


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    rel = float(table["tolerance"]["relative"])
    failures: list[str] = []
    for tp, (n, mode) in zip(table["test_points"], CASES, strict=False):
        cf = closed_form(n, mode)
        sv = solver_values(n, mode)
        for key in ("lambda_continuous", "lambda_discrete"):
            want = float(tp["expected"][key])
            scale = max(1.0, abs(want))
            if abs(cf[key] - want) > rel * scale:
                failures.append(f"closed form {key}={cf[key]} != table {want} at N={n} {mode}")
            if abs(sv[key] - want) > rel * scale:
                failures.append(f"solver {key}={sv[key]} != table {want} at N={n} {mode}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} two-spectra convention pinned (closed form + solver).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print", action="store_true")
    args = parser.parse_args()
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
