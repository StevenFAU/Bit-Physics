"""Generator/verifier for the ISF Gaussian-dispersion golden (table D).

The free step is the EXACT propagator (the FFT phase multiply IS
e^{-i*H*dt}), so vs the closed-form free Gaussian packet

    psi(x,t) = prod_d sqrt(a/(a_t)) * exp(-(x_d-c)^2/(4*a_t)),
    a = sigma0^2,  a_t = a + i*hbar*t/2,
    sigma_t^2 = a * (1 + (hbar*t/(2a))^2)

the error is dt-INDEPENDENT at the FP/band-limit floor (review catch #2 —
this table is NOT a dt-order probe), and Delta-x refinement collapses the
band-limit truncation super-algebraically (spectral accuracy). The table
commits the analytic sigma(T), the flatline ceiling over a dt-halving
ladder, and the measured spectral N-ladder; --verify re-runs both ladders.

Fixture (periodization caveat, spec-ref.md § 6.1): sigma0 = 0.04,
hbar = 0.02, T = 0.08 keeps periodic images < 1e-12 at the box boundary
and the N = 64 spectral tail < 1e-14 of peak.

Derivation: tools/testkit/golden/derivations/isf-gaussian-dispersion.md
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
    / "isf-gaussian-dispersion.json"
)

SIGMA0 = 0.04
HBAR = 0.02
T_FINAL = 0.08
N_FLAT = 64
DT_LADDER = (2, 4, 8, 16)
N_LADDER = (16, 24, 32, 48)


def sigma_t(t: float) -> float:
    a = SIGMA0**2
    return math.sqrt(a * (1.0 + (HBAR * t / (2.0 * a)) ** 2))


def _evolve_err(n: int, steps: int) -> float:
    from schrodinger_smoke.reference.isf import (
        continuous_laplacian_eigenvalues,
        free_step,
        gaussian_packet,
    )

    lam = continuous_laplacian_eigenvalues((n, n, n), 1.0 / n)
    psi = gaussian_packet(n, 0.0, HBAR, SIGMA0)
    ref = gaussian_packet(n, T_FINAL, HBAR, SIGMA0)
    for _ in range(steps):
        psi = free_step(psi, HBAR, T_FINAL / steps, lam)
    return float(np.max(np.abs(psi[0] - ref[0])))


def compute_canonical() -> dict[str, object]:
    return {
        "sigma_T_analytic": sigma_t(T_FINAL),
        "flatline_errs": {str(s): _evolve_err(N_FLAT, s) for s in DT_LADDER},
        "spectral_errs": {str(n): _evolve_err(n, 4) for n in N_LADDER},
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    got = compute_canonical()
    by_name = {tp["inputs"]["row"]: tp["expected"] for tp in table["test_points"]}
    failures: list[str] = []
    exp_sigma = by_name["analytic-sigma"]
    if abs(float(got["sigma_T_analytic"]) - float(exp_sigma["sigma_T_analytic"])) > 1e-15:
        failures.append("analytic sigma(T) drifted")
    exp_flat = by_name["exact-propagator-flatline"]
    flat = [float(v) for v in got["flatline_errs"].values()]  # type: ignore[union-attr]
    if max(flat) > float(exp_flat["flatline_ceiling"]):
        failures.append(f"flatline errs {flat} exceed ceiling {exp_flat['flatline_ceiling']}")
    if max(flat) > 10.0 * min(flat):
        failures.append(f"flatline is not flat: {flat} (dt trend where none should exist)")
    exp_spec = by_name["spectral-dx-collapse"]
    for n_str, ceiling in exp_spec["spectral_ceilings"].items():
        e = float(got["spectral_errs"][n_str])  # type: ignore[index]
        if e > float(ceiling):
            failures.append(f"spectral err {e} at N={n_str} exceeds ceiling {ceiling}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} exact-propagator flatline + spectral collapse hold.")
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
