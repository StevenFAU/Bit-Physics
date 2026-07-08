"""Analytic generators with closed-form spectra (spec-ref sections 3.5, 4.3, 4.4).

Every generator here is defined on the DFT bin grid (frequencies in BINS,
i.e. cycles per N-sample frame) so the coherent scenes are exact by
construction: a line at integer bin k with a rectangular window is a single
exact DFT line — the discrete-spectrum discipline (spec-ref section 3.2).

FM is Chowning 1973: e(t) = A sin(w_c t + I sin w_m t) with exact sidebands
J_n(I) at w_c + n w_m (odd lower sidebands negative via J_{-n} = (-1)^n J_n).
The energy identity J_0^2 + 2 sum J_n^2 = 1 is DLMF 10.23.3.
"""

from __future__ import annotations

import numpy as np
from scipy.special import jv, sici

GIBBS_OVERSHOOT = float(sici(np.pi)[0] / np.pi - 0.5)  # 0.0894898722... per side


def sine(
    n: int, f_bins: float, amplitude: float = 1.0, phase: float = 0.0
) -> np.ndarray:
    """A sin(2 pi f_bins i / N + phase) — the primitive every scene builds on."""
    i = np.arange(n, dtype=np.float64)
    return amplitude * np.sin(2.0 * np.pi * f_bins * i / n + phase)


def fm_signal(
    n: int, kc: float, km: float, index: float, amplitude: float = 1.0
) -> np.ndarray:
    """Chowning FM sampled on the frame: A sin(2 pi kc i/N + I sin(2 pi km i/N))."""
    i = np.arange(n, dtype=np.float64)
    return amplitude * np.sin(
        2.0 * np.pi * kc * i / n + index * np.sin(2.0 * np.pi * km * i / n)
    )


def fm_sideband_orders(index: float, floor: float = 1e-18) -> int:
    """Smallest n_max with |J_n(I)| < floor for all |n| > n_max."""
    n = max(8, int(np.ceil(index)) + 8)
    while abs(jv(n, index)) >= floor and n < 512:
        n += 4
    return n


def fm_line_bins(
    n: int, kc: int, km: int, index: float, amplitude: float = 1.0
) -> np.ndarray:
    """Exact per-bin sine-amplitude array for coherent FM (length N//2 + 1).

    e = A sum_n J_n(I) sin(2 pi (kc + n km) i / N). Each term is a sine at a
    signed integer bin; sin at bin -k equals -sin at bin +k, and a bin above
    Nyquist folds as sin(2 pi (N - k) i / N) = -sin(2 pi k i / N). Folding is
    handled exactly, so the array is the machine-exact golden for the
    rectangular-window coherent scene (all lines on-bin).
    """
    half = n // 2
    amps = np.zeros(half + 1, dtype=np.float64)
    n_max = fm_sideband_orders(index)
    for order in range(-n_max, n_max + 1):
        a = amplitude * float(jv(order, index))
        k = kc + order * km
        # Fold into [0, N/2] with the sine's odd symmetry:
        # sin(2 pi k i / N) for k_mod in (N/2, N) equals -sin(2 pi (N - k_mod) i / N).
        k_mod = k % n
        if k_mod > half:
            k_mod = n - k_mod
            a = -a
        if k_mod == 0 or (n % 2 == 0 and k_mod == half):
            continue  # sin is identically zero on DC and the even-N Nyquist bin
        amps[k_mod] += a
    return amps


def fm_expected_dft(
    n: int, kc: int, km: int, index: float, amplitude: float = 1.0
) -> np.ndarray:
    """Exact complex DFT of the coherent FM frame (rectangular window).

    A sine of amplitude a at integer bin k contributes -j a N/2 at bin k and
    +j a N/2 at bin N - k.
    """
    amps = fm_line_bins(n, kc, km, index, amplitude)
    big_x = np.zeros(n, dtype=np.complex128)
    for k in range(1, n // 2):
        a = amps[k]
        if a != 0.0:
            big_x[k] = -0.5j * a * n
            big_x[n - k] = 0.5j * a * n
    return big_x


def fm_energy_identity_residual(index: float) -> float:
    """|1 - (J_0^2 + 2 sum_{n>=1} J_n^2)| — DLMF 10.23.3, machine-exact."""
    n_max = fm_sideband_orders(index)
    total = float(jv(0, index)) ** 2 + 2.0 * sum(
        float(jv(k, index)) ** 2 for k in range(1, n_max + 1)
    )
    return abs(1.0 - total)


def am_signal(n: int, kc: float, km: float, depth: float) -> np.ndarray:
    """(1 + m cos(2 pi km i/N)) cos(2 pi kc i/N): lines 1, m/2, m/2."""
    i = np.arange(n, dtype=np.float64)
    return (1.0 + depth * np.cos(2.0 * np.pi * km * i / n)) * np.cos(
        2.0 * np.pi * kc * i / n
    )


# --- Classic waveforms: exact truncated Fourier series (the additive lens) ---


def saw_harmonics(n_harm: int) -> np.ndarray:
    """Sawtooth sine-series amplitudes: (-1)^{k+1} * 2/(pi k)."""
    k = np.arange(1, n_harm + 1, dtype=np.float64)
    return ((-1.0) ** (k + 1)) * 2.0 / (np.pi * k)


def square_harmonics(n_harm: int) -> np.ndarray:
    """Square sine-series amplitudes: 4/(pi k) for odd k, 0 for even."""
    k = np.arange(1, n_harm + 1, dtype=np.float64)
    amps = 4.0 / (np.pi * k)
    amps[1::2] = 0.0
    return amps


def triangle_harmonics(n_harm: int) -> np.ndarray:
    """Triangle sine-series amplitudes: (8/pi^2 k^2)(-1)^{(k-1)/2} for odd k."""
    amps = np.zeros(n_harm, dtype=np.float64)
    for k in range(1, n_harm + 1, 2):
        amps[k - 1] = 8.0 / (np.pi**2 * k**2) * ((-1.0) ** ((k - 1) // 2))
    return amps


def additive_signal(n: int, f0_bins: float, harmonics: np.ndarray) -> np.ndarray:
    """sum_k amps[k-1] sin(2 pi k f0 i / N) — bandlimited by construction."""
    i = np.arange(n, dtype=np.float64)
    x = np.zeros(n, dtype=np.float64)
    for k, a in enumerate(harmonics, start=1):
        if a != 0.0:
            x += a * np.sin(2.0 * np.pi * k * f0_bins * i / n)
    return x


def naive_saw(n: int, f0_bins: float) -> np.ndarray:
    """Non-bandlimited saw 2(f t mod 1) - 1 — the aliasing negative control."""
    i = np.arange(n, dtype=np.float64)
    return 2.0 * np.mod(f0_bins * i / n, 1.0) - 1.0


def chirp_linear(n: int, f0_bins: float, f1_bins: float) -> np.ndarray:
    """Linear chirp; instantaneous frequency f0 + (f1-f0) i/N bins."""
    i = np.arange(n, dtype=np.float64)
    phase = 2.0 * np.pi * (f0_bins * i + 0.5 * (f1_bins - f0_bins) * i * i / n) / n
    return np.sin(phase)


def chirp_instantaneous_bins(n: int, f0_bins: float, f1_bins: float) -> np.ndarray:
    i = np.arange(n, dtype=np.float64)
    return f0_bins + (f1_bins - f0_bins) * i / n
