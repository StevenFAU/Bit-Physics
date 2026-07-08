"""Generator/verifier for the signal-workbench metrology golden (table F).

Closed-form THD / SINAD / SFDR / ENOB for a prescribed multi-harmonic tone
under COHERENT sampling (k0, N coprime — IEEE 1241 "mutually prime"), and
the deterministic 12-bit ideal-quantizer bench (spec-ref.md section 4.7):

    THD   = sqrt(sum_{h>=2} V_h^2) / V_1        (rms-amplitude ratio —
                                                 the v0.2 dimensional fix)
    SINAD = 10 log10(P_1 / (P_noise + P_dist))
    ENOB  = (SINAD - 1.76) / 6.02

The measured pipeline (generate -> FFT -> metrology) must reproduce the
closed forms at ~1e-12; the quantizer SINAD is committed as the DETERMINISTIC
measured value, with its distance from the 6.02N+1.76 model recorded — the
model is an approximation, the measurement is the golden.

Derivation: tools/testkit/golden/derivations/signal-workbench-metrology.md
Usage: --verify / --print / --write.
"""

from __future__ import annotations

import argparse
import json
import sys
from math import gcd
from pathlib import Path

import numpy as np

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/signal-workbench"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "signal-processing"
    / "signal-workbench-metrology.json"
)

N = 4096
K0 = 331  # coprime with 4096 (odd) — IEEE 1241 coherent condition
# Prescribed tone: fundamental + harmonics 2..4 with known amplitudes.
V_AMPS = [1.0, 0.01, 0.003, 0.001]
QUANT_BITS = 12
QUANT_AMPLITUDE = 0.999  # near full scale (code coverage, spec section 4.7)
MEASURED_CEILING = 1e-10


def _prescribed_signal() -> np.ndarray:
    i = np.arange(N, dtype=np.float64)
    x = np.zeros(N)
    for h, v in enumerate(V_AMPS, start=1):
        x += v * np.sin(2.0 * np.pi * (h * K0 % N) * i / N)
    return x


def closed_form() -> dict[str, float]:
    from signal_workbench.metrology import enob_from_sinad, thd_closed_form

    thd = thd_closed_form(V_AMPS)
    p1 = V_AMPS[0] ** 2 / 2.0
    pd = sum(v**2 / 2.0 for v in V_AMPS[1:])
    sinad = 10.0 * np.log10(p1 / pd)
    sfdr = 10.0 * np.log10(p1 / (V_AMPS[1] ** 2 / 2.0))
    return {
        "thd": thd,
        "thd_db": float(20.0 * np.log10(thd)),
        "sinad_db": float(sinad),
        "sfdr_db": float(sfdr),
        "enob_from_sinad": float(enob_from_sinad(sinad)),
    }


def measured() -> dict[str, float]:
    from signal_workbench.metrology import sfdr_db, sinad_db, thd

    x = _prescribed_signal()
    big_x = np.fft.fft(x)
    return {
        "thd": thd(big_x, K0, n_harmonics=len(V_AMPS) - 1),
        "sinad_db": sinad_db(big_x, K0),
        "sfdr_db": sfdr_db(big_x, K0),
    }


def quantizer_bench() -> dict[str, float]:
    from signal_workbench.metrology import (
        enob_from_sinad,
        ideal_snr_db,
        quantize,
        sinad_db,
    )
    from signal_workbench.synthesis import sine

    x = sine(N, K0, QUANT_AMPLITUDE)
    xq = quantize(x, QUANT_BITS)
    big_x = np.fft.fft(xq)
    s = sinad_db(big_x, K0)
    return {
        "measured_sinad_db": float(s),
        "measured_enob": float(enob_from_sinad(s)),
        "ideal_model_snr_db": float(ideal_snr_db(QUANT_BITS)),
        "model_gap_db": float(s - ideal_snr_db(QUANT_BITS)),
    }


def compute_canonical() -> list[dict[str, object]]:
    return [
        {"closed_form": closed_form(), "measured": measured()},
        {"quantizer_bench": quantizer_bench()},
    ]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "mt-003-definitions",
        "source": (
            "Analog Devices MT-003, 'Understand SINAD, ENOB, SNR, THD, THD+N, "
            "and SFDR' — THD as the rms-amplitude ratio sqrt(sum V_h^2)/V_1, "
            "SINAD/ENOB relation ENOB = (SINAD - 1.76)/6.02, ideal "
            "SNR = 6.02N + 1.76 dB."
        ),
        "doi": "n/a-analog-devices-mt-003",
    },
    {
        "derived_by": "ieee-1241-coherent-sampling",
        "source": (
            "IEEE Std 1241-2010 — coherent sampling with k0 and N mutually "
            "prime (k0=331, N=4096: gcd checked = 1) and near-full-scale "
            "amplitude; leakage-free single-line harmonics make the spectrum "
            "metrology machine-exact."
        ),
        "doi": "10.1109/IEEESTD.2011.5692956",
    },
    {
        "derived_by": "spreadsheet-closed-form",
        "source": (
            "Hand-checkable calculation (spec-ref.md section 6.4): with "
            "V = [1, 0.01, 0.003, 0.001], THD = sqrt(0.0001 + 9e-6 + 1e-6) "
            "= 0.010488..., SFDR = 40 dB exactly (worst spur = V_2 = 0.01) — "
            "the measured FFT pipeline must reproduce these to ~1e-12."
        ),
        "doi": "n/a-in-generator-identity",
    },
]


def build_table() -> dict[str, object]:
    cf = closed_form()
    qb = quantizer_bench()
    points = [
        {
            "inputs": {"n": N, "k0": K0, "amplitudes": V_AMPS},
            "expected": {
                **cf,
                "measured_ceiling_rel": MEASURED_CEILING,
                "assignment": (
                    "Prescribed coherent multi-harmonic tone: the measured "
                    "FFT metrology pipeline must reproduce every closed form "
                    "to measured_ceiling_rel."
                ),
            },
            "independent_reference": ANCHORS[0],
        },
        {
            "inputs": {
                "n": N,
                "k0": K0,
                "bits": QUANT_BITS,
                "amplitude": QUANT_AMPLITUDE,
            },
            "expected": {
                **qb,
                "assignment": (
                    "Deterministic ideal-quantizer bench: measured_sinad_db "
                    "is the committed golden (exact re-run equality); "
                    "ideal_model_snr_db = 6.02N + 1.76 is a MODEL and "
                    "model_gap_db records its approximation error — the "
                    "measurement is the truth, the formula is the lesson."
                ),
            },
            "independent_reference": ANCHORS[1],
        },
        {
            "inputs": {"check": "coherence", "n": N, "k0": K0},
            "expected": {
                "gcd": 1,
                "assignment": (
                    "IEEE 1241 mutual-primality (coprimality is the "
                    "primitive; 'odd k0' is the power-of-two special case)."
                ),
            },
            "independent_reference": ANCHORS[2],
        },
    ]
    return {
        "schema_version": "1.0.0",
        "algorithm": "signal-workbench-metrology-thd-sinad-sfdr-enob",
        "category": "signal-processing",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/signal-workbench-metrology.md",
            "upstream": "mt-003-plus-ieee-1241",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "docs/sim-specs/signal-processing/signal-workbench/spec-ref.md",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-9},
        "test_points": points,
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    failures: list[str] = []
    cf = closed_form()
    ms = measured()
    tp0 = table["test_points"][0]
    ceiling = float(tp0["expected"]["measured_ceiling_rel"])
    for key, want in tp0["expected"].items():
        if key in ("assignment", "measured_ceiling_rel"):
            continue
        got = cf[key]
        if abs(got - float(want)) > 1e-9 * max(abs(float(want)), 1e-300):
            failures.append(f"closed form {key}={got} != {want}")
    for key in ("thd", "sinad_db", "sfdr_db"):
        rel_err = abs(ms[key] - cf[key]) / max(abs(cf[key]), 1e-300)
        if rel_err > ceiling:
            failures.append(f"measured {key}={ms[key]} vs closed {cf[key]} ({rel_err})")
    qb = quantizer_bench()
    tp1 = table["test_points"][1]
    for key in ("measured_sinad_db", "measured_enob", "ideal_model_snr_db"):
        want = float(tp1["expected"][key])
        if abs(qb[key] - want) > 1e-9 * max(abs(want), 1e-300):
            failures.append(f"quantizer {key}={qb[key]} != {want}")
    if gcd(K0, N) != 1:
        failures.append("k0, N not coprime")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} metrology closed forms + measured pipeline pinned.")
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
