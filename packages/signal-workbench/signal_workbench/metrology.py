"""THD / SNR / SINAD / SFDR / ENOB (spec-ref section 4.7; MT-003, IEEE 1241).

Definitions (rms-amplitude / power-ratio forms — the v0.2 dimensional fix):

    THD   = sqrt(sum_{h>=2} V_h^2) / V_1 = sqrt(sum P_h / P_1)
    SINAD = 10 log10( P_1 / (P_noise + P_dist) )
    SFDR  = 10 log10( P_1 / P_worst_spur )
    ENOB  = (SINAD_dB - 1.76) / 6.02

Coherent sampling (k_0, N coprime — IEEE 1241 "mutually prime"; near-full-
scale amplitude for code coverage) is mandatory for the machine-exact
goldens; the incoherent reading is the negative lesson, not a gate.
"""

from __future__ import annotations

from math import gcd

import numpy as np


def is_coherent(k0: int, n: int) -> bool:
    return gcd(k0, n) == 1


def tone_power_bins(big_x: np.ndarray, k: int) -> float:
    """Power of the real-signal line at bin k (positive + mirrored image)."""
    n = len(big_x)
    p = abs(big_x[k]) ** 2
    if 0 < k < n - k:
        p += abs(big_x[n - k]) ** 2
    return float(p)


def thd(big_x: np.ndarray, k0: int, n_harmonics: int = 5) -> float:
    """THD as an rms-amplitude ratio from a coherent spectrum.

    Harmonics fold across Nyquist exactly like the synthesis fold; power is
    fold-invariant so the folded bin is used directly.
    """
    n = len(big_x)
    half = n // 2
    p1 = tone_power_bins(big_x, k0)
    ph = 0.0
    for h in range(2, n_harmonics + 2):
        k = (h * k0) % n
        if k > half:
            k = n - k
        if k in (0, half):
            continue
        ph += tone_power_bins(big_x, k)
    return float(np.sqrt(ph / p1))


def thd_closed_form(amplitudes: list[float]) -> float:
    """Closed-form THD for a prescribed tone: amplitudes = [V1, V2, ...]."""
    v = np.asarray(amplitudes, dtype=np.float64)
    return float(np.sqrt(np.sum(v[1:] ** 2)) / v[0])


def sinad_db(big_x: np.ndarray, k0: int) -> float:
    """SINAD from a coherent spectrum: fundamental vs everything else (ex DC)."""
    n = len(big_x)
    p_all = float(np.sum(np.abs(big_x) ** 2))
    p_dc = float(abs(big_x[0]) ** 2)
    if n % 2 == 0:
        p_dc += float(abs(big_x[n // 2]) ** 2)
    p1 = tone_power_bins(big_x, k0)
    p_nd = max(p_all - p_dc - p1, 1e-300)
    return float(10.0 * np.log10(p1 / p_nd))


def sfdr_db(big_x: np.ndarray, k0: int) -> float:
    """Fundamental-to-worst-spur ratio over the one-sided spectrum (ex DC)."""
    n = len(big_x)
    half = n // 2
    mag2 = np.abs(big_x[: half + 1]) ** 2
    p1 = tone_power_bins(big_x, k0)
    spurs = mag2.copy()
    spurs[0] = 0.0
    spurs[k0] = 0.0
    if n % 2 == 0:
        spurs[half] = 0.0
    worst = float(spurs.max()) * 2.0  # match the two-sided line-power convention
    return float(10.0 * np.log10(p1 / max(worst, 1e-300)))


def enob_from_sinad(sinad: float) -> float:
    return (sinad - 1.76) / 6.02


def ideal_snr_db(n_bits: int) -> float:
    return 6.02 * n_bits + 1.76


def quantize(x: np.ndarray, n_bits: int, full_scale: float = 1.0) -> np.ndarray:
    """Ideal mid-tread uniform quantizer over [-full_scale, +full_scale]."""
    levels = 2**n_bits
    step = 2.0 * full_scale / levels
    q = np.round(np.asarray(x, dtype=np.float64) / step) * step
    return np.clip(q, -full_scale, full_scale - step)


def sinad_closed_form_db(
    v1: float, harmonic_amps: list[float], noise_power: float
) -> float:
    """Closed-form SINAD for a prescribed tone + noise power (calc-verif)."""
    p1 = v1**2 / 2.0
    p_d = sum(a**2 / 2.0 for a in harmonic_amps)
    return float(10.0 * np.log10(p1 / (p_d + noise_power)))
