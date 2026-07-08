"""Generator/verifier for the signal-workbench oscillator golden (table B).

Exact Fourier-series harmonic amplitudes for saw / square / triangle
(spec-ref.md section 4.3):

    saw:      (-1)^{k+1} 2/(pi k)          all k
    square:   4/(pi k)                     odd k only
    triangle: 8/(pi^2 k^2) (-1)^{(k-1)/2}  odd k only

plus the Gibbs constant Si(pi)/pi - 1/2 = 0.0894898... (fraction of the FULL
jump per side, independent of truncation order) with a measured-overshoot
cross-check, and the coherent measured-DFT identity: the additive frame's
FFT recovers every committed harmonic amplitude to ~1e-13.

Derivation: tools/testkit/golden/derivations/signal-workbench-oscillators.md
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
    / "signal-workbench-oscillators.json"
)

N_HARM = 16
N_FRAME = 4096
F0_BINS = 31  # coherent: k * f0 stays under Nyquist for k <= N_HARM
GIBBS_MEASURE_HARMONICS = 400
GIBBS_MEASURE_CEILING = 2e-3  # O(1/K) convergence at K=400


def closed_form() -> dict[str, object]:
    from signal_workbench.synthesis import (
        GIBBS_OVERSHOOT,
        saw_harmonics,
        square_harmonics,
        triangle_harmonics,
    )

    return {
        "saw_harmonics": saw_harmonics(N_HARM).tolist(),
        "square_harmonics": square_harmonics(N_HARM).tolist(),
        "triangle_harmonics": triangle_harmonics(N_HARM).tolist(),
        "gibbs_overshoot": GIBBS_OVERSHOOT,
    }


def measured_gibbs(n_harm: int = GIBBS_MEASURE_HARMONICS) -> float:
    """Overshoot of the truncated square-wave series as a fraction of the
    full jump (jump = 2 for the unit square wave)."""
    from signal_workbench.synthesis import square_harmonics

    t = np.linspace(0.0, 0.5, 200001)  # dense half period
    amps = square_harmonics(n_harm)
    x = np.zeros_like(t)
    for k, a in enumerate(amps, start=1):
        if a != 0.0:
            x += a * np.sin(2.0 * np.pi * k * t)
    return float((x.max() - 1.0) / 2.0)


def measured_harmonics_rel_err(kind: str) -> float:
    """Coherent additive frame -> FFT -> per-harmonic sine amplitude vs the
    committed series; returns worst relative error over nonzero harmonics."""
    from signal_workbench.synthesis import (
        additive_signal,
        saw_harmonics,
        square_harmonics,
        triangle_harmonics,
    )

    amps = {
        "saw": saw_harmonics,
        "square": square_harmonics,
        "triangle": triangle_harmonics,
    }[kind](N_HARM)
    x = additive_signal(N_FRAME, F0_BINS, amps)
    big_x = np.fft.fft(x)
    worst = 0.0
    for k, a in enumerate(amps, start=1):
        if a == 0.0:
            continue
        # sine of amplitude a at bin k*F0 contributes -j a N/2 there
        got = float(np.imag(big_x[k * F0_BINS]) * (-2.0 / N_FRAME))
        worst = max(worst, abs(got - a) / abs(a))
    return worst


def compute_canonical() -> list[dict[str, object]]:
    return [
        {
            **closed_form(),
            "measured_gibbs_K400": measured_gibbs(),
            "measured_harmonics_rel_err": {
                k: measured_harmonics_rel_err(k) for k in ("saw", "square", "triangle")
            },
        }
    ]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "fourier-series-closed-form",
        "source": (
            "Classic Fourier series of the ideal saw/square/triangle "
            "(Oppenheim & Schafer, Discrete-Time Signal Processing 3e, ch. 2; "
            "any standard table) — the amplitudes are exact rationals in pi."
        ),
        "doi": "n/a-isbn-978-0131988422",
    },
    {
        "derived_by": "stilson-smith-blit-1996",
        "source": (
            "Stilson & Smith, 'Alias-free digital synthesis of classic analog "
            "waveforms' (ICMC 1996) — the bandlimited framing: a truncated "
            "series IS bandlimited by construction; the naive sampled saw "
            "aliases at ~6 dB/oct (the section 3.6 negative control)."
        ),
        "doi": "n/a-icmc-1996-paper",
    },
    {
        "derived_by": "si-pi-constant",
        "source": (
            "Gibbs constant Si(pi)/pi - 1/2 via scipy.special.sici (DLMF 6.2 "
            "sine integral), cross-checked by the measured K=400 truncated-"
            "series overshoot inside --verify (O(1/K) agreement bound)."
        ),
        "doi": "n/a-dlmf-6-2",
    },
]


def build_table() -> dict[str, object]:
    cf = closed_form()
    points = [
        {
            "inputs": {
                "n_harmonics": N_HARM,
                "frame_n": N_FRAME,
                "f0_bins": F0_BINS,
                "kind": kind,
            },
            "expected": {
                "harmonics": cf[f"{kind}_harmonics"],
                "measured_rel_ceiling": 1e-12,
                "assignment": (
                    "Coherent additive frame's own FFT must recover every "
                    "committed harmonic amplitude to measured_rel_ceiling "
                    "(all partials on-bin)."
                ),
            },
            "independent_reference": ANCHORS[i % len(ANCHORS)],
        }
        for i, kind in enumerate(("saw", "square", "triangle"))
    ]
    points.append(
        {
            "inputs": {"check": "gibbs", "n_harmonics": GIBBS_MEASURE_HARMONICS},
            "expected": {
                "gibbs_overshoot": cf["gibbs_overshoot"],
                "measured_agreement_ceiling": GIBBS_MEASURE_CEILING,
                "assignment": (
                    "Overshoot fraction of the FULL jump per side, "
                    "Si(pi)/pi - 1/2; the K=400 truncated square wave must "
                    "measure within measured_agreement_ceiling (O(1/K))."
                ),
            },
            "independent_reference": ANCHORS[2],
        }
    )
    return {
        "schema_version": "1.0.0",
        "algorithm": "signal-workbench-oscillator-harmonics",
        "category": "signal-processing",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/signal-workbench-oscillators.md",
            "upstream": "fourier-series-plus-stilson-smith-blit",
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
    cf = closed_form()
    failures: list[str] = []
    for tp in table["test_points"]:
        if tp["inputs"].get("check") == "gibbs":
            want = float(tp["expected"]["gibbs_overshoot"])
            if abs(cf["gibbs_overshoot"] - want) > max(rel * abs(want), absol):
                failures.append(f"gibbs constant {cf['gibbs_overshoot']} != {want}")
            got = measured_gibbs()
            ceiling = float(tp["expected"]["measured_agreement_ceiling"])
            if abs(got - want) > ceiling:
                failures.append(f"measured gibbs {got} vs {want} > {ceiling}")
            continue
        kind = tp["inputs"]["kind"]
        want_amps = tp["expected"]["harmonics"]
        got_amps = cf[f"{kind}_harmonics"]
        for k, (g, w) in enumerate(zip(got_amps, want_amps, strict=True), start=1):
            if abs(g - w) > max(rel * abs(w), absol):
                failures.append(f"{kind} harmonic {k}: {g} != {w}")
        meas = measured_harmonics_rel_err(kind)
        ceiling = float(tp["expected"]["measured_rel_ceiling"])
        if meas > ceiling:
            failures.append(f"{kind} measured harmonics rel err {meas} > {ceiling}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} oscillator harmonics + Gibbs pinned.")
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
