"""Generator/verifier for the ISF free-step unitary-norm golden (table A).

The split-step free propagator multiplies every Fourier mode by the
unit-modulus phase exp(-i*(hbar*dt/2)*|k|^2), so the global L2 norm is
preserved to machine precision (unitarity of e^{-iHt}). The table pins the
declared machine-exact ceiling (<= 1e-13, spec-ref.md § 6.4) over an
(hbar, N, dt) sweep on a band-limited random spinor; --verify re-runs the
sweep against `schrodinger_smoke.reference.isf.free_step` and fails if any
measured drift exceeds the committed ceiling.

Derivation: tools/testkit/golden/derivations/isf-unitary-norm.md
Usage: --verify / --print.
"""

from __future__ import annotations

import argparse
import json
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
    / "isf-unitary-norm.json"
)


def _band_limited_spinor(n: int, seed: int) -> np.ndarray:
    from schrodinger_smoke.reference.isf import normalize

    rng = np.random.default_rng(seed)
    psi = rng.standard_normal((2, n, n, n)) + 1j * rng.standard_normal((2, n, n, n))
    psi_hat = np.fft.fftn(psi, axes=(1, 2, 3))
    k = np.fft.fftfreq(n) * n
    kx, ky, kz = np.meshgrid(k, k, k, indexing="ij")
    psi_hat *= (np.abs(kx) <= 2) & (np.abs(ky) <= 2) & (np.abs(kz) <= 2)
    psi = np.fft.ifftn(psi_hat, axes=(1, 2, 3))
    psi[0] += 2.0
    return normalize(psi)


def compute_canonical() -> list[dict[str, object]]:
    from schrodinger_smoke.reference.isf import (
        continuous_laplacian_eigenvalues,
        free_step,
    )

    points: list[dict[str, object]] = []
    for hbar, n, dt in (
        (0.05, 32, 1.0 / 24.0),
        (0.1, 32, 1.0 / 48.0),
        (0.3, 16, 1.0 / 24.0),
    ):
        lam = continuous_laplacian_eigenvalues((n, n, n), 1.0 / n)
        psi = _band_limited_spinor(n, seed=42)
        pre = float(np.sum(np.abs(psi) ** 2))
        post = float(np.sum(np.abs(free_step(psi, hbar, dt, lam)) ** 2))
        points.append(
            {
                "hbar": hbar,
                "n": n,
                "dt": dt,
                "measured_rel_drift": abs(post - pre) / pre,
            }
        )
    return points


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    ceiling = float(table["tolerance"]["absolute"])
    measured = compute_canonical()
    failures: list[str] = []
    for tp, m in zip(table["test_points"], measured, strict=False):
        for key in ("hbar", "n", "dt"):
            if tp["inputs"][key] != m[key]:
                failures.append(f"input mismatch {key}: {tp['inputs'][key]} != {m[key]}")
        drift = float(m["measured_rel_drift"])  # type: ignore[arg-type]
        if drift > ceiling:
            failures.append(f"norm drift {drift} > declared ceiling {ceiling} at {tp['inputs']}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} unitary-norm ceiling holds on live recomputation.")
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
