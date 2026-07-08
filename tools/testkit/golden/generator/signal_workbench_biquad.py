"""Generator/verifier for the signal-workbench RBJ biquad golden (table D).

Pins the exact f64 RBJ coefficients (W3C Audio EQ Cookbook intermediates
w0 = 2 pi f0/Fs, A = 10^{dBgain/40}, alpha = sin(w0)/(2Q)) and the sampled
closed-form response |H(e^{jw})|, phase, and group delay at pinned
frequencies for every shipped variant, plus the max pole radius (Jury /
stability pin: strictly < 1 on the open interval).

Independent cross-checks inside --verify: scipy.signal.freqz and
scipy.signal.group_delay against the analytic evaluation, and the measured
impulse-response DFT against H(e^{jw}) (the web gate's measurement leg).

Derivation: tools/testkit/golden/derivations/signal-workbench-biquad.md
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
    / "signal-workbench-biquad.json"
)

FS = 48000.0
# (kind, f0, Q, gain_db) — one per shipped variant, gate-scene-friendly Qs.
CASES: list[tuple[str, float, float, float]] = [
    ("lpf", 1200.0, 4.0, 0.0),
    ("hpf", 300.0, 0.7071067811865476, 0.0),
    ("bpf", 2000.0, 8.0, 0.0),
    ("notch", 1000.0, 10.0, 0.0),
    ("apf", 1500.0, 2.0, 0.0),
    ("peaking", 3000.0, 2.0, 6.0),
    ("lowshelf", 250.0, 0.9, 4.5),
    ("highshelf", 8000.0, 0.9, -3.0),
]
OMEGA_FRACS = [0.005, 0.02, 0.05, 0.1, 0.2, 0.35, 0.45]  # of Fs
IMPULSE_N = 65536
IMPULSE_CEILING = 1e-9  # response decayed below f64 tail within the frame


def closed_form(kind: str, f0: float, q: float, gain_db: float) -> dict[str, object]:
    from signal_workbench.filters import (
        freq_response,
        group_delay,
        poles,
        rbj_coeffs,
    )

    b, a = rbj_coeffs(kind, f0, FS, q, gain_db)
    omega = 2.0 * np.pi * np.asarray(OMEGA_FRACS)
    h = freq_response(b, a, omega)
    tau = group_delay(b, a, omega)
    return {
        "b": b.tolist(),
        "a": a.tolist(),
        "mag": np.abs(h).tolist(),
        "phase": np.angle(h).tolist(),
        "group_delay": tau.tolist(),
        "max_pole_radius": float(np.max(np.abs(poles(a)))),
    }


def scipy_cross_check(kind: str, f0: float, q: float, gain_db: float) -> float:
    """Worst relative disagreement scipy vs analytic over the pinned grid."""
    from scipy.signal import freqz
    from scipy.signal import group_delay as sp_group_delay
    from signal_workbench.filters import freq_response, group_delay, rbj_coeffs

    b, a = rbj_coeffs(kind, f0, FS, q, gain_db)
    omega = 2.0 * np.pi * np.asarray(OMEGA_FRACS)
    _, h_sp = freqz(b, a, worN=omega)
    h = freq_response(b, a, omega)
    worst = float(np.max(np.abs(h - h_sp)) / np.max(np.abs(h)))
    _, tau_sp = sp_group_delay((b, a), w=omega)
    tau = group_delay(b, a, omega)
    worst = max(worst, float(np.max(np.abs(tau - tau_sp)) / max(np.max(np.abs(tau)), 1.0)))
    return worst


def impulse_check(kind: str, f0: float, q: float, gain_db: float) -> float:
    """Measured impulse-response DFT vs H(e^{jw_k}) — rel of response peak."""
    from signal_workbench.filters import (
        freq_response,
        impulse_response_dft,
        rbj_coeffs,
    )

    b, a = rbj_coeffs(kind, f0, FS, q, gain_db)
    measured = impulse_response_dft(b, a, IMPULSE_N)
    omega = 2.0 * np.pi * np.arange(IMPULSE_N) / IMPULSE_N
    golden = freq_response(b, a, omega)
    return float(np.max(np.abs(measured - golden)) / np.max(np.abs(golden)))


def compute_canonical() -> list[dict[str, object]]:
    return [
        {
            "kind": kind,
            "f0": f0,
            "q": q,
            "gain_db": gain_db,
            **closed_form(kind, f0, q, gain_db),
            "scipy_cross_check_rel": scipy_cross_check(kind, f0, q, gain_db),
            "impulse_dft_rel": impulse_check(kind, f0, q, gain_db),
        }
        for kind, f0, q, gain_db in CASES
    ]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "rbj-audio-eq-cookbook",
        "source": (
            "Bristow-Johnson, 'Audio EQ Cookbook' (W3C Technical Report, "
            "https://www.w3.org/TR/audio-eq-cookbook/) — the exact coefficient "
            "formulas for every committed variant."
        ),
        "doi": "n/a-w3c-technical-report",
    },
    {
        "derived_by": "scipy-signal-freqz",
        "source": (
            "scipy.signal.freqz + scipy.signal.group_delay — independent "
            "response evaluation checked against the analytic H(e^{jw}) and "
            "the -d arg H/dw closed form inside --verify (bound 1e-9)."
        ),
        "doi": "10.1038/s41592-019-0686-2",
    },
    {
        "derived_by": "jury-stability-criterion",
        "source": (
            "Jury criterion on the RBJ denominator (a0 > 0, D(+-1) > 0, "
            "|a2| < a0 on the open f0 in (0, Fs/2), Q > 0): committed "
            "max_pole_radius strictly < 1 for every case (Oppenheim & "
            "Schafer 3e, ch. 6 stability; spec-ref.md section 4.5 pins)."
        ),
        "doi": "n/a-isbn-978-0131988422",
    },
    {
        "derived_by": "measured-impulse-dft",
        "source": (
            "DFT of the Direct-Form-I impulse response over 65536 samples vs "
            "H(e^{jw_k}) — the measurement leg the web gate re-runs; bound "
            "1e-9 of response peak (response decays below the f64 tail "
            "within the frame for every committed (f0, Q))."
        ),
        "doi": "n/a-in-generator-identity",
    },
]


def build_table() -> dict[str, object]:
    points = []
    for i, (kind, f0, q, gain_db) in enumerate(CASES):
        cf = closed_form(kind, f0, q, gain_db)
        points.append(
            {
                "inputs": {
                    "kind": kind,
                    "f0": f0,
                    "fs": FS,
                    "q": q,
                    "gain_db": gain_db,
                    "omega_fracs_of_fs": OMEGA_FRACS,
                },
                "expected": {
                    **cf,
                    "impulse_dft_ceiling_rel": IMPULSE_CEILING,
                    "assignment": (
                        "Coefficients are f64 CPU-computed (the f32 low-f0 "
                        "trap rule, spec-ref.md section 4.5); |H|/phase/"
                        "group-delay sampled at omega_fracs_of_fs; the "
                        "measured impulse-response DFT must match H(e^{jw}) "
                        "to impulse_dft_ceiling_rel of peak."
                    ),
                },
                "independent_reference": ANCHORS[i % len(ANCHORS)],
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "signal-workbench-rbj-biquad-response",
        "category": "signal-processing",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/signal-workbench-biquad.md",
            "upstream": "w3c-audio-eq-cookbook",
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
    rel = float(table["tolerance"]["relative"])
    absol = float(table["tolerance"]["absolute"])
    failures: list[str] = []
    for tp, (kind, f0, q, gain_db) in zip(table["test_points"], CASES, strict=True):
        cf = closed_form(kind, f0, q, gain_db)
        for key in ("b", "a", "mag", "phase", "group_delay"):
            for g, w in zip(cf[key], tp["expected"][key], strict=True):
                if abs(g - w) > max(rel * abs(w), absol):
                    failures.append(f"{kind}.{key}: {g} != {w}")
        if not cf["max_pole_radius"] < 1.0:
            failures.append(f"{kind} pole radius {cf['max_pole_radius']} >= 1")
        sp = scipy_cross_check(kind, f0, q, gain_db)
        if sp > 1e-9:
            failures.append(f"{kind} scipy cross-check {sp} > 1e-9")
        imp = impulse_check(kind, f0, q, gain_db)
        if imp > float(tp["expected"]["impulse_dft_ceiling_rel"]):
            failures.append(f"{kind} impulse DFT {imp} > ceiling")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} RBJ biquad responses pinned (analytic + scipy + impulse).")
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
