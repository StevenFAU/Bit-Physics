"""Generator/verifier for the signal-workbench FM Bessel golden (table C).

Chowning FM e(t) = A sin(w_c t + I sin(w_m t)) has the exact spectrum
sum_n J_n(I) sin((w_c + n w_m) t) — sidebands J_n(I) at f_c +/- n f_m, odd
lower sidebands negative (J_{-n} = (-1)^n J_n). On the coherent bin grid
(kc, km integers) every line is on-bin, so the rectangular-window DFT is
machine-exact against the folded line set (spec-ref.md section 4.4).

Pins: signed sideband amplitudes for the canonical scene, the DLMF 10.23.3
energy identity, the J_0 carrier nulls at I = 2.4048 / 5.5201, and — the
strongest check — the MEASURED DFT of the generated frame against the exact
folded line spectrum at ~1e-13 of peak.

Derivation: tools/testkit/golden/derivations/signal-workbench-fm-bessel.md
Usage: --verify / --print / --write.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/signal-workbench"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "signal-processing"
    / "signal-workbench-fm-bessel.json"
)

# (n, kc, km, index) — canonical gate scene, diagnostic scene, two J_0 nulls.
CASES: list[tuple[int, int, int, float]] = [
    (4096, 512, 37, 3.2),
    (1024, 128, 9, 1.0),
    (4096, 512, 37, 2.404825557695773),
    (4096, 512, 37, 5.520078110286311),
]
SIDEBAND_ORDERS = list(range(-8, 9))
MEASURED_DFT_CEILING = 1e-12  # rel of spectrum peak, f64


def closed_form(n: int, kc: int, km: int, index: float) -> dict[str, object]:
    from scipy.special import jv
    from signal_workbench.synthesis import fm_energy_identity_residual

    lines = {str(order): float(jv(order, index)) for order in SIDEBAND_ORDERS}
    return {
        "sideband_j_n": lines,
        "carrier_j0": float(jv(0, index)),
        "energy_identity_residual": fm_energy_identity_residual(index),
    }


def measured_vs_golden(n: int, kc: int, km: int, index: float) -> float:
    """max_abs(measured DFT - exact folded line spectrum) / peak."""
    from signal_workbench.synthesis import fm_expected_dft, fm_signal

    x = fm_signal(n, kc, km, index)
    measured = np.fft.fft(x)
    golden = fm_expected_dft(n, kc, km, index)
    return float(np.max(np.abs(measured - golden)) / np.max(np.abs(golden)))


def compute_canonical() -> list[dict[str, object]]:
    return [
        {
            "n": n,
            "kc": kc,
            "km": km,
            "index": index,
            **closed_form(n, kc, km, index),
            "measured_vs_golden_rel": measured_vs_golden(n, kc, km, index),
        }
        for n, kc, km, index in CASES
    ]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "chowning-1973",
        "source": (
            "Chowning, 'The synthesis of complex audio spectra by means of "
            "frequency modulation', JAES 21(7):526-534 — sidebands exactly "
            "J_n(I) at alpha +/- n beta with odd lower sidebands negative."
        ),
        "doi": "n/a-jaes-1973-paper",
    },
    {
        "derived_by": "scipy-special-jv",
        "source": (
            "scipy.special.jv (AMOS/cephes Bessel implementation) — the f64 "
            "numeric anchor for every committed J_n(I) value."
        ),
        "doi": "10.1038/s41592-019-0686-2",
    },
    {
        "derived_by": "dlmf-10-23-3",
        "source": (
            "NIST DLMF 10.23.3 (Neumann addition theorem special case): "
            "J_0^2 + 2 sum_{n>=1} J_n^2 = 1 — the energy identity checked to "
            "machine precision at every committed index; J_0 zeros 2.40483 / "
            "5.52008 from the DLMF Bessel-zero tables; https://dlmf.nist.gov/10.23"
        ),
        "doi": "n/a-dlmf-handbook",
    },
    {
        "derived_by": "measured-dft-identity",
        "source": (
            "The generated frame's own FFT vs the exact folded line spectrum "
            "at <= 1e-12 of peak, checked inside --verify — the same identity "
            "the web gate re-runs live (spec-ref.md section 13.1)."
        ),
        "doi": "n/a-in-generator-identity",
    },
]


def build_table() -> dict[str, object]:
    points = []
    for i, (n, kc, km, index) in enumerate(CASES):
        cf = closed_form(n, kc, km, index)
        note = ""
        if abs(index - 2.404825557695773) < 1e-12:
            note = " Carrier null: I is the first J_0 zero, so carrier_j0 ~ 0."
        elif abs(index - 5.520078110286311) < 1e-12:
            note = " Carrier null: I is the second J_0 zero."
        points.append(
            {
                "inputs": {"n": n, "kc": kc, "km": km, "index": index},
                "expected": {
                    **cf,
                    "measured_dft_ceiling_rel": MEASURED_DFT_CEILING,
                    "assignment": (
                        "Measured rectangular-window DFT of the generated "
                        "frame must match the exact folded J_n(I) line "
                        "spectrum to measured_dft_ceiling_rel of peak "
                        "(discrete-spectrum discipline, spec-ref.md "
                        "section 3.2)." + note
                    ),
                },
                "independent_reference": ANCHORS[i % len(ANCHORS)],
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "signal-workbench-fm-bessel-sidebands",
        "category": "signal-processing",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/signal-workbench-fm-bessel.md",
            "upstream": "chowning-1973-plus-dlmf-10-23",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "docs/sim-specs/signal-processing/signal-workbench/spec-ref.md",
        },
        "tolerance": {"absolute": 1e-15, "relative": 1e-12},
        "test_points": points,
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    rel = float(table["tolerance"]["relative"])
    absol = float(table["tolerance"]["absolute"])
    failures: list[str] = []
    for tp, (n, kc, km, index) in zip(table["test_points"], CASES, strict=True):
        cf = closed_form(n, kc, km, index)
        for order, want in tp["expected"]["sideband_j_n"].items():
            got = cf["sideband_j_n"][order]
            if abs(got - float(want)) > max(rel * abs(float(want)), absol):
                failures.append(f"J_{order}({index})={got} != {want}")
        if cf["energy_identity_residual"] > 1e-12:
            failures.append(f"energy identity residual {cf['energy_identity_residual']}")
        got_meas = measured_vs_golden(n, kc, km, index)
        ceiling = float(tp["expected"]["measured_dft_ceiling_rel"])
        if got_meas > ceiling:
            failures.append(f"measured-vs-golden {got_meas} > {ceiling} at I={index}")
        if "Carrier null" in tp["expected"]["assignment"] and abs(cf["carrier_j0"]) > 1e-12:
            failures.append(f"carrier at J_0 zero not null: {cf['carrier_j0']}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} FM Bessel sidebands pinned (closed form + measured DFT).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print", action="store_true")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    if args.write:
        TABLE_PATH.parent.mkdir(parents=True, exist_ok=True)
        TABLE_PATH.write_text(json.dumps(build_table(), indent=2) + "\n")
        print(f"wrote {TABLE_PATH}")
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
