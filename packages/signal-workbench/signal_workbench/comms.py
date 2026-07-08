"""Comms lens: constellations, RC/RRC, Hilbert, EVM, seeded BER (spec-ref 4.6).

Constellations are unit-average-energy, Gray-coded (Proakis; GNU Radio /
MATLAB qammod conventions). EVM normalization is pinned to the RMS-average
constellation magnitude (802.11a / 3GPP); Keysight 89600's DEFAULT is
peak-referenced and differs by the peak/avg ratio (x sqrt(9/5) for 16-QAM) —
any VSA cross-check must switch to RMS first.

RRC taps have removable singularities at t = 0 and t = +/- T/(4 beta); the
exact special-case values are committed here, never left to 0/0.
"""

from __future__ import annotations

import numpy as np
from scipy.special import erfc


def _gray(i: int) -> int:
    return i ^ (i >> 1)


def constellation(name: str) -> np.ndarray:
    """Ideal symbol coordinates, unit average energy, Gray-coded index order.

    Index = symbol label (the bit pattern); the coordinate at index v is the
    point whose Gray-decoded pam coordinates are used — adjacent points then
    differ by one bit along each axis (square-QAM Gray property).
    """
    if name == "bpsk":
        return np.array([1.0 + 0.0j, -1.0 + 0.0j])
    if name == "qpsk":
        # Gray: 00 -> (+,+), 01 -> (-,+), 11 -> (-,-), 10 -> (+,-)
        pts = np.array([1 + 1j, -1 + 1j, 1 - 1j, -1 - 1j], dtype=np.complex128)
        return pts / np.sqrt(2.0)
    if name in ("16qam", "64qam"):
        m = 16 if name == "16qam" else 64
        side = int(np.sqrt(m))
        bits_per_axis = side.bit_length() - 1
        # PAM levels in Gray order: level index g maps to amplitude 2*b - (side-1)
        # where b is the binary value whose Gray code is g.
        gray_to_bin = {}
        for b in range(side):
            gray_to_bin[_gray(b)] = b
        pts = np.empty(m, dtype=np.complex128)
        for v in range(m):
            gi = v >> bits_per_axis  # high bits -> I axis Gray label
            gq = v & (side - 1)  # low bits -> Q axis Gray label
            i_lvl = 2 * gray_to_bin[gi] - (side - 1)
            q_lvl = 2 * gray_to_bin[gq] - (side - 1)
            pts[v] = i_lvl + 1j * q_lvl
        scale = np.sqrt(2.0 * (m - 1) / 3.0)  # average energy -> 1
        return pts / scale
    raise ValueError(f"unknown constellation {name!r}")


def rc_taps(beta: float, sps: int, span: int) -> np.ndarray:
    """Raised-cosine impulse response h(t), t in symbol units, T = 1.

    h(t) = sinc(t) cos(pi beta t) / (1 - (2 beta t)^2), with the removable
    singularity at t = +/- 1/(2 beta) evaluated exactly:
    h = (pi/4) sinc(1/(2 beta)).
    """
    t = np.arange(-span * sps, span * sps + 1, dtype=np.float64) / sps
    out = np.empty_like(t)
    for i, ti in enumerate(t):
        if beta > 0.0 and abs(abs(ti) - 1.0 / (2.0 * beta)) < 1e-12:
            out[i] = (np.pi / 4.0) * np.sinc(1.0 / (2.0 * beta))
        else:
            out[i] = (
                np.sinc(ti) * np.cos(np.pi * beta * ti) / (1.0 - (2.0 * beta * ti) ** 2)
            )
    return out


def rrc_taps(beta: float, sps: int, span: int) -> np.ndarray:
    """Root-raised-cosine taps, T = 1, with the exact singular values pinned:

    h(0)        = 1 + beta (4/pi - 1)
    h(+-1/(4b)) = (beta/sqrt 2) [ (1 + 2/pi) sin(pi/(4 beta))
                                + (1 - 2/pi) cos(pi/(4 beta)) ]
    """
    t = np.arange(-span * sps, span * sps + 1, dtype=np.float64) / sps
    out = np.empty_like(t)
    for i, ti in enumerate(t):
        if abs(ti) < 1e-12:
            out[i] = 1.0 + beta * (4.0 / np.pi - 1.0)
        elif beta > 0.0 and abs(abs(ti) - 1.0 / (4.0 * beta)) < 1e-12:
            out[i] = (beta / np.sqrt(2.0)) * (
                (1.0 + 2.0 / np.pi) * np.sin(np.pi / (4.0 * beta))
                + (1.0 - 2.0 / np.pi) * np.cos(np.pi / (4.0 * beta))
            )
        else:
            num = np.sin(np.pi * ti * (1.0 - beta)) + 4.0 * beta * ti * np.cos(
                np.pi * ti * (1.0 + beta)
            )
            den = np.pi * ti * (1.0 - (4.0 * beta * ti) ** 2)
            out[i] = num / den
    return out


def hilbert_analytic(x: np.ndarray) -> np.ndarray:
    """Analytic signal x + j H{x} via the frequency-domain method."""
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    big_x = np.fft.fft(x)
    h = np.zeros(n)
    h[0] = 1.0
    if n % 2 == 0:
        h[n // 2] = 1.0
        h[1 : n // 2] = 2.0
    else:
        h[1 : (n + 1) // 2] = 2.0
    return np.fft.ifft(big_x * h)


def evm_rms(measured: np.ndarray, ideal: np.ndarray) -> float:
    """RMS EVM, RMS-average-constellation normalization (pinned, spec 4.6)."""
    err = np.mean(np.abs(measured - ideal) ** 2)
    ref = np.mean(np.abs(ideal) ** 2)
    return float(np.sqrt(err / ref))


def q_function(x: np.ndarray) -> np.ndarray:
    """Gaussian tail Q(x) = erfc(x / sqrt 2) / 2."""
    return 0.5 * erfc(np.asarray(x, dtype=np.float64) / np.sqrt(2.0))


def ber_bpsk_theory(ebn0_db: np.ndarray) -> np.ndarray:
    """Closed-form BPSK/QPSK-Gray bit error rate P_b = Q(sqrt(2 Eb/N0))."""
    ebn0 = 10.0 ** (np.asarray(ebn0_db, dtype=np.float64) / 10.0)
    return q_function(np.sqrt(2.0 * ebn0))


def ber_bpsk_seeded(ebn0_db: float, n_bits: int, seed: int) -> tuple[int, float]:
    """Seeded-AWGN BPSK simulation: (exact error count, measured BER).

    With the PCG64 seed pinned, the error count is a deterministic integer
    — the golden the accumulating measured points are gated on (spec 4.6).
    """
    rng = np.random.default_rng(seed)
    bits = rng.integers(0, 2, n_bits)
    symbols = 1.0 - 2.0 * bits.astype(np.float64)  # 0 -> +1, 1 -> -1
    ebn0 = 10.0 ** (ebn0_db / 10.0)
    sigma = np.sqrt(1.0 / (2.0 * ebn0))  # Es = Eb = 1 for BPSK
    noisy = symbols + sigma * rng.standard_normal(n_bits)
    decided = (noisy < 0.0).astype(np.int64)
    errors = int(np.sum(decided != bits))
    return errors, errors / n_bits
