"""Constellations / RC-RRC / EVM / seeded BER vs golden table E (§ 4.6)."""

import json
from pathlib import Path

import numpy as np

from signal_workbench.comms import (
    ber_bpsk_seeded,
    ber_bpsk_theory,
    constellation,
    evm_rms,
    hilbert_analytic,
    rrc_taps,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO / "tools/testkit/golden/tables/signal-processing/signal-workbench-comms.json"
)


def _table() -> dict:
    return json.loads(TABLE.read_text())


def test_constellations_match_table() -> None:
    for tp in _table()["test_points"]:
        if "constellation" not in tp["inputs"]:
            continue
        pts = constellation(tp["inputs"]["constellation"])
        np.testing.assert_allclose(
            np.real(pts), tp["expected"]["points_re"], atol=1e-12
        )
        np.testing.assert_allclose(
            np.imag(pts), tp["expected"]["points_im"], atol=1e-12
        )
        assert abs(np.mean(np.abs(pts) ** 2) - 1.0) <= 1e-12


def test_rrc_singular_values() -> None:
    for tp in _table()["test_points"]:
        if "beta" not in tp["inputs"]:
            continue
        beta = tp["inputs"]["beta"]
        sps, span = tp["inputs"]["sps"], tp["inputs"]["span"]
        h = rrc_taps(beta, sps, span)
        center = span * sps
        assert h[center] == 1.0 + beta * (4.0 / np.pi - 1.0)
        want = tp["expected"]["h_singular"]
        if want is not None:
            idx = center + int(round(sps / (4.0 * beta)))
            assert abs(h[idx] - want) <= 1e-12


def test_evm_constant_offset_identity() -> None:
    ideal = constellation("16qam")
    offset = 0.05 + 0.03j
    assert abs(evm_rms(ideal + offset, ideal) - abs(offset)) <= 1e-14


def test_seeded_ber_counts_and_q_curve() -> None:
    for tp in _table()["test_points"]:
        if tp["inputs"].get("check") != "seeded-ber":
            continue
        seed = tp["inputs"]["seed"]
        n_bits = tp["inputs"]["n_bits"]
        for ebn0, want_count, want_pb in zip(
            tp["inputs"]["ebn0_db"],
            tp["expected"]["error_counts"],
            tp["expected"]["theory_pb"],
            strict=True,
        ):
            errors, _ = ber_bpsk_seeded(ebn0, n_bits, seed)
            assert errors == want_count, (ebn0, errors, want_count)
            assert abs(float(ber_bpsk_theory(np.array([ebn0]))[0]) - want_pb) <= 1e-14


def test_hilbert_kills_negative_frequencies() -> None:
    n = 4096
    x = np.cos(2 * np.pi * 200 * np.arange(n) / n)
    xa = hilbert_analytic(x)
    spec = np.fft.fft(xa)
    neg = np.abs(spec[n // 2 + 1 :]).max()
    pos = np.abs(spec[: n // 2]).max()
    assert neg <= 1e-10 * pos


def test_hilbert_sign_flip_negative_control() -> None:
    """Flipping the Hilbert sign resurrects negative-frequency content (§ 6.5)."""
    n = 4096
    x = np.cos(2 * np.pi * 200 * np.arange(n) / n)
    xa_wrong = np.conj(hilbert_analytic(x))
    spec = np.fft.fft(xa_wrong)
    neg = np.abs(spec[n // 2 + 1 :]).max()
    pos_line = np.abs(spec[200])
    assert neg > 1e3 * max(pos_line, 1e-30)
