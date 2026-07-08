"""Generator/verifier for the signal-workbench comms golden (table E).

Pins (spec-ref.md section 4.6):

- Ideal constellation coordinates (BPSK/QPSK/16-QAM/64-QAM), unit average
  energy, Gray-coded — with the Gray single-bit-neighbor property and the
  average-energy identity checked inside the generator.
- RC / RRC taps including the exact removable-singularity values
  h(0) = 1 + beta(4/pi - 1) and h(+-1/(4 beta)) (T = 1 units), plus the
  RRC*RRC = RC matched-filter identity on the frequency grid.
- EVM against a known injected error (constant complex offset e: EVM_rms =
  |e| exactly for a unit-average-energy constellation).
- The seeded-AWGN BER golden: exact deterministic error counts per Eb/N0
  under the pinned PCG64 seed, alongside the closed-form Q-function curve.

Derivation: tools/testkit/golden/derivations/signal-workbench-comms.md
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
    / "signal-workbench-comms.json"
)

RRC_BETAS = [0.25, 0.35, 0.5]
RRC_SPS = 8
RRC_SPAN = 6
EVM_OFFSET = 0.05 + 0.03j
BER_SEED = 12345
BER_N_BITS = 200000
BER_EBN0_DB = [0.0, 2.0, 4.0, 6.0, 8.0]


def constellation_facts(name: str) -> dict[str, object]:
    from signal_workbench.comms import constellation

    pts = constellation(name)
    avg_e = float(np.mean(np.abs(pts) ** 2))
    return {
        "points_re": np.real(pts).tolist(),
        "points_im": np.imag(pts).tolist(),
        "average_energy": avg_e,
    }


def gray_neighbor_violations(name: str) -> int:
    """Count nearest-neighbor pairs whose labels differ by != 1 bit (square
    QAM / BPSK / QPSK Gray property: must be 0)."""
    from signal_workbench.comms import constellation

    pts = constellation(name)
    m = len(pts)
    d2 = np.abs(pts[:, None] - pts[None, :]) ** 2
    np.fill_diagonal(d2, np.inf)
    dmin = float(np.sqrt(d2.min()))
    bad = 0
    for i in range(m):
        for j in range(i + 1, m):
            if abs(np.sqrt(d2[i, j]) - dmin) < 1e-9 and bin(i ^ j).count("1") != 1:
                bad += 1
    return bad


def rrc_facts(beta: float) -> dict[str, object]:
    from signal_workbench.comms import rc_taps, rrc_taps

    h = rrc_taps(beta, RRC_SPS, RRC_SPAN)
    center = RRC_SPAN * RRC_SPS
    h0 = float(h[center])
    # exact singular index at t = 1/(4 beta) symbol units, if on the tap grid
    idx = 1.0 / (4.0 * beta) * RRC_SPS
    singular_val = None
    if abs(idx - round(idx)) < 1e-9:
        singular_val = float(h[center + round(idx)])
    # matched-filter identity: RRC (X) RRC == RC. Span-truncation limited —
    # measured convergence 8.3e-3 (span 6) -> 2.6e-4 (span 24) at beta=0.25,
    # so the identity is checked at span 24 while the committed product taps
    # stay at the pinned span above.
    h24 = rrc_taps(beta, RRC_SPS, 24)
    rc = rc_taps(beta, RRC_SPS, 48)
    conv = np.convolve(h24, h24) / RRC_SPS
    err = float(np.max(np.abs(conv - rc)) / np.max(np.abs(rc)))
    return {
        "h0": h0,
        "h_singular": singular_val,
        "rrc_conv_rc_rel_err": err,
        "taps_head": h[center : center + 5].tolist(),
    }


def evm_fact() -> float:
    from signal_workbench.comms import constellation, evm_rms

    ideal = constellation("16qam")
    measured = ideal + EVM_OFFSET
    return float(evm_rms(measured, ideal))


def ber_facts() -> dict[str, object]:
    from signal_workbench.comms import ber_bpsk_seeded, ber_bpsk_theory

    counts = []
    for ebn0 in BER_EBN0_DB:
        errors, _ = ber_bpsk_seeded(ebn0, BER_N_BITS, BER_SEED)
        counts.append(errors)
    theory = ber_bpsk_theory(np.asarray(BER_EBN0_DB)).tolist()
    return {"error_counts": counts, "theory_pb": theory}


def compute_canonical() -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    for name in ("bpsk", "qpsk", "16qam", "64qam"):
        out.append(
            {
                "constellation": name,
                **constellation_facts(name),
                "gray_violations": gray_neighbor_violations(name),
            }
        )
    for beta in RRC_BETAS:
        out.append({"rrc_beta": beta, **rrc_facts(beta)})
    out.append({"evm_offset": [EVM_OFFSET.real, EVM_OFFSET.imag], "evm": evm_fact()})
    out.append(ber_facts())
    return out


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "proakis-constellation-geometry",
        "source": (
            "Proakis & Salehi, Digital Communications 5e — square-QAM grid "
            "scaled by sqrt(3/(2(M-1))) for unit average energy; Gray coding "
            "= single-bit change between nearest neighbors (checked "
            "exhaustively inside the generator: zero violations)."
        ),
        "doi": "n/a-isbn-978-0072957167",
    },
    {
        "derived_by": "rrc-closed-form",
        "source": (
            "Root-raised-cosine closed form with removable singularities at "
            "t=0 and t=1/(4 beta) (MATLAB rcosdesign documentation formula, "
            "T=1 unnormalized); matched-filter identity RRC*RRC=RC checked "
            "by direct convolution inside --verify."
        ),
        "doi": "n/a-mathworks-rcosdesign-doc",
    },
    {
        "derived_by": "evm-rms-definition",
        "source": (
            "802.11a relative constellation error / 3GPP EVM with RMS-average "
            "normalization (pinned; Keysight 89600's default is PEAK-"
            "referenced and differs by sqrt(9/5) for 16-QAM): constant "
            "offset e on a unit-energy constellation gives EVM_rms = |e| "
            "exactly."
        ),
        "doi": "n/a-ieee-802-11a-17-3-9-6-3",
    },
    {
        "derived_by": "q-function-closed-form",
        "source": (
            "P_b = Q(sqrt(2 Eb/N0)) for BPSK/Gray-QPSK (Proakis 5e eq. "
            "4.3-13); seeded error counts are deterministic integers under "
            "NumPy PCG64 stream-compatibility policy (same-version exact; "
            "cross-version honesty caveat recorded in the derivation doc)."
        ),
        "doi": "n/a-isbn-978-0072957167",
    },
]


def build_table() -> dict[str, object]:
    points = []
    for _i, name in enumerate(("bpsk", "qpsk", "16qam", "64qam")):
        facts = constellation_facts(name)
        points.append(
            {
                "inputs": {"constellation": name},
                "expected": {
                    **facts,
                    "gray_violations": 0,
                    "average_energy_ceiling_err": 1e-12,
                    "assignment": (
                        "Unit-average-energy Gray-coded ideal coordinates; "
                        "the web overlay and EVM reference use exactly these."
                    ),
                },
                "independent_reference": ANCHORS[0],
            }
        )
    for beta in RRC_BETAS:
        facts = rrc_facts(beta)
        points.append(
            {
                "inputs": {"beta": beta, "sps": RRC_SPS, "span": RRC_SPAN},
                "expected": {
                    **facts,
                    "conv_identity_ceiling": 5e-4,
                    "assignment": (
                        "h0 must equal 1 + beta(4/pi - 1) exactly; "
                        "h_singular is the committed removable-singularity "
                        "value; RRC*RRC~RC to conv_identity_ceiling "
                        "(span-truncation limited; checked at span 24, "
                        "measured 2.6e-4..3.3e-4)."
                    ),
                },
                "independent_reference": ANCHORS[1],
            }
        )
    points.append(
        {
            "inputs": {
                "check": "evm-injected-offset",
                "offset": [EVM_OFFSET.real, EVM_OFFSET.imag],
            },
            "expected": {
                "evm": evm_fact(),
                "closed_form": float(abs(EVM_OFFSET)),
                "assignment": "EVM_rms of a constant offset equals |offset| exactly.",
            },
            "independent_reference": ANCHORS[2],
        }
    )
    points.append(
        {
            "inputs": {
                "check": "seeded-ber",
                "seed": BER_SEED,
                "n_bits": BER_N_BITS,
                "ebn0_db": BER_EBN0_DB,
            },
            "expected": {
                **ber_facts(),
                "assignment": (
                    "Exact deterministic error counts under the pinned PCG64 "
                    "seed; the closed-form Q-curve is the analytic overlay "
                    "the accumulating measured points converge onto "
                    "(spec-ref.md section 4.6)."
                ),
            },
            "independent_reference": ANCHORS[3],
        }
    )
    return {
        "schema_version": "1.0.0",
        "algorithm": "signal-workbench-comms-constellation-rrc-evm-ber",
        "category": "signal-processing",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/signal-workbench-comms.md",
            "upstream": "proakis-plus-rcosdesign-plus-80211a-evm",
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
    for tp in table["test_points"]:
        inputs = tp["inputs"]
        if "constellation" in inputs:
            name = inputs["constellation"]
            facts = constellation_facts(name)
            for key in ("points_re", "points_im"):
                for g, w in zip(facts[key], tp["expected"][key], strict=True):
                    if abs(g - w) > max(rel * abs(w), absol):
                        failures.append(f"{name}.{key}: {g} != {w}")
            if abs(facts["average_energy"] - 1.0) > 1e-12:
                failures.append(f"{name} avg energy {facts['average_energy']} != 1")
            if gray_neighbor_violations(name) != 0:
                failures.append(f"{name} gray violations")
        elif "beta" in inputs:
            facts = rrc_facts(inputs["beta"])
            import math

            h0_closed = 1.0 + inputs["beta"] * (4.0 / math.pi - 1.0)
            if abs(facts["h0"] - h0_closed) > 1e-12:
                failures.append(f"rrc h0 {facts['h0']} != closed {h0_closed}")
            for key in ("h0", "h_singular"):
                w = tp["expected"][key]
                if w is None:
                    continue
                if abs(facts[key] - w) > max(rel * abs(w), absol):
                    failures.append(f"rrc beta={inputs['beta']} {key} drift")
            if facts["rrc_conv_rc_rel_err"] > float(tp["expected"]["conv_identity_ceiling"]):
                failures.append(f"rrc conv identity {facts['rrc_conv_rc_rel_err']} over ceiling")
        elif inputs.get("check") == "evm-injected-offset":
            got = evm_fact()
            want = float(tp["expected"]["evm"])
            closed = float(tp["expected"]["closed_form"])
            if abs(got - want) > 1e-12 or abs(got - closed) > 1e-12:
                failures.append(f"evm {got} != {want} / closed {closed}")
        elif inputs.get("check") == "seeded-ber":
            facts = ber_facts()
            if facts["error_counts"] != tp["expected"]["error_counts"]:
                failures.append(
                    f"seeded BER counts {facts['error_counts']} != {tp['expected']['error_counts']}"
                )
            for g, w in zip(facts["theory_pb"], tp["expected"]["theory_pb"], strict=True):
                if abs(g - w) > 1e-12:
                    failures.append(f"Q-curve drift {g} != {w}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} comms goldens pinned (constellations/RRC/EVM/seeded BER).")
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
