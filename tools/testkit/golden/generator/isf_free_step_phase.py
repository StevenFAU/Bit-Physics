"""Generator/verifier for the ISF per-mode phase golden (table B).

The free step diagonalizes exactly in Fourier: a single seeded mode k
advances by exactly delta_arg = -(hbar*dt/2)*|k|^2 (wrapped to the
principal branch), with |k|^2 = (2*pi)^2 * (kx^2 + ky^2 + kz^2) on the
unit box — the CONTINUOUS Laplacian eigenvalues (paper Eq. 18). The table
commits the closed-form wrapped phases; --verify recomputes them from the
closed form AND measures them through the live solver (seed mode -> one
free step -> arg ratio), failing on either mismatch.

Derivation: tools/testkit/golden/derivations/isf-free-step-phase.md
Usage: --verify / --print.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/schrodinger-smoke"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "volumetric-grid"
    / "isf-free-step-phase.json"
)

CASES: list[tuple[tuple[int, int, int], float, float, int]] = [
    ((1, 0, 0), 0.05, 1.0 / 24.0, 32),
    ((2, 3, 1), 0.05, 1.0 / 24.0, 32),
    ((0, 0, 5), 0.1, 1.0 / 48.0, 32),
    ((7, 7, 7), 0.02, 1.0 / 24.0, 32),
]


def _wrap(a: float) -> float:
    return (a + math.pi) % (2.0 * math.pi) - math.pi


def closed_form(mode: tuple[int, int, int], hbar: float, dt: float) -> float:
    k2 = (2.0 * math.pi) ** 2 * float(sum(m * m for m in mode))
    return _wrap(-(hbar * dt / 2.0) * k2)


def measured(mode: tuple[int, int, int], hbar: float, dt: float, n: int) -> float:
    from schrodinger_smoke.reference.isf import (
        continuous_laplacian_eigenvalues,
        free_step,
    )

    lam = continuous_laplacian_eigenvalues((n, n, n), 1.0 / n)
    psi_hat = np.zeros((2, n, n, n), dtype=np.complex128)
    psi_hat[0][mode] = 1.0
    psi = np.fft.ifftn(psi_hat, axes=(1, 2, 3))
    out_hat = np.fft.fftn(free_step(psi, hbar, dt, lam), axes=(1, 2, 3))
    return float(np.angle(out_hat[0][mode]))


def compute_canonical() -> list[dict[str, float]]:
    return [
        {
            "closed_form_phase": closed_form(mode, hbar, dt),
            "measured_phase": measured(mode, hbar, dt, n),
        }
        for mode, hbar, dt, n in CASES
    ]


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    tol = float(table["tolerance"]["absolute"])
    failures: list[str] = []
    for tp, (mode, hbar, dt, n) in zip(table["test_points"], CASES, strict=False):
        want = float(tp["expected"]["phase"])
        cf = closed_form(mode, hbar, dt)
        got = measured(mode, hbar, dt, n)
        if abs(_wrap(cf - want)) > 1e-15:
            failures.append(f"closed form drifted: table={want} recomputed={cf} at {mode}")
        if abs(_wrap(got - want)) > tol:
            failures.append(f"solver phase {got} != table {want} (tol {tol}) at {mode}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches closed form and live solver.")
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
