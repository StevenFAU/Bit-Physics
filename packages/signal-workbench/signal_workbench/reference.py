"""f64 analysis path: pinned DFT convention, normalization, STFT, Parseval.

DFT convention (spec-ref section 3.3, pinned): unnormalized forward
``X[k] = sum_n x[n] e^{-j 2 pi k n / N}`` (JOS / FFTW / NumPy). Rayleigh /
Parseval with this convention: ``sum |x|^2 = (1/N) sum |X|^2`` — the
machine-exact FFT-correctness gate (spec-ref section 4.1).

Amplitude normalization uses the window's coherent gain so a unit sinusoid
reads its true amplitude; power/PSD normalization would use ENBW (section
3.3) — the amplitude convention is what the workbench displays and gates.
"""

from __future__ import annotations

import numpy as np

from .windows import window


def dft(x: np.ndarray) -> np.ndarray:
    """Unnormalized forward DFT (the pinned convention)."""
    return np.fft.fft(np.asarray(x, dtype=np.float64))


def parseval_residual(x: np.ndarray) -> float:
    """Relative Rayleigh/Parseval residual |sum|x|^2 - (1/N)sum|X|^2| / sum|x|^2."""
    x = np.asarray(x, dtype=np.float64)
    big_x = np.fft.fft(x)
    lhs = float(np.sum(np.abs(x) ** 2))
    rhs = float(np.sum(np.abs(big_x) ** 2) / len(x))
    return abs(lhs - rhs) / max(lhs, 1e-300)


def windowed_dft(x: np.ndarray, window_name: str) -> np.ndarray:
    """DFT of the windowed frame — the measured leg of every spectral gate."""
    x = np.asarray(x, dtype=np.float64)
    w = window(window_name, len(x))
    return np.fft.fft(w * x)


def amplitude_spectrum(big_x: np.ndarray, window_sum: float) -> np.ndarray:
    """One-sided amplitude spectrum normalized by coherent gain.

    A unit-amplitude on-bin sinusoid reads 1.0 at its bin (factor 2 for the
    split between the positive- and negative-frequency lines).
    """
    n = len(big_x)
    half = n // 2 + 1
    amp = 2.0 * np.abs(big_x[:half]) / window_sum
    amp[0] *= 0.5
    if n % 2 == 0:
        amp[-1] *= 0.5
    return amp


def stft(x: np.ndarray, window_name: str, frame: int, hop: int) -> np.ndarray:
    """Frames-by-bins STFT matrix with the pinned periodic window."""
    x = np.asarray(x, dtype=np.float64)
    w = window(window_name, frame)
    n_frames = 1 + (len(x) - frame) // hop
    out = np.empty((n_frames, frame), dtype=np.complex128)
    for m in range(n_frames):
        out[m] = np.fft.fft(w * x[m * hop : m * hop + frame])
    return out


def peak_rms_crest(x: np.ndarray) -> tuple[float, float, float]:
    x = np.asarray(x, dtype=np.float64)
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x * x)))
    return peak, rms, peak / max(rms, 1e-300)
