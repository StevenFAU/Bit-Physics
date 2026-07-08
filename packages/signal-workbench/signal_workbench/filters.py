"""RBJ biquad family: exact coefficients, H(e^jw), group delay (spec-ref 4.5).

Coefficients follow the W3C Audio EQ Cookbook (Bristow-Johnson) verbatim:
w0 = 2 pi f0 / Fs, A = 10^{dBgain/40}, alpha = sin(w0)/(2Q). All coefficient
math is f64 on the CPU — the documented f32 low-f0 quantization trap means
runtimes must never recompute these in f32 (spec-ref section 4.5).

Stability (Jury criterion, verified at v0.2 review): every RBJ variant is
stable in exact arithmetic on the OPEN interval f0 in (0, Fs/2), Q > 0; the
endpoints put poles on the unit circle, so UIs clamp away from them.
"""

from __future__ import annotations

import numpy as np

BIQUAD_KINDS: tuple[str, ...] = (
    "lpf",
    "hpf",
    "bpf",
    "notch",
    "apf",
    "peaking",
    "lowshelf",
    "highshelf",
)


def rbj_coeffs(
    kind: str, f0: float, fs: float, q: float, gain_db: float = 0.0
) -> tuple[np.ndarray, np.ndarray]:
    """(b, a) with a[0] left un-normalized (the RBJ-canonical 6-tuple)."""
    w0 = 2.0 * np.pi * f0 / fs
    a_lin = 10.0 ** (gain_db / 40.0)
    cw = np.cos(w0)
    sw = np.sin(w0)
    alpha = sw / (2.0 * q)
    if kind == "lpf":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hpf":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bpf":
        # constant 0 dB peak gain variant
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "notch":
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "apf":
        b = [1 - alpha, -2 * cw, 1 + alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peaking":
        b = [1 + alpha * a_lin, -2 * cw, 1 - alpha * a_lin]
        a = [1 + alpha / a_lin, -2 * cw, 1 - alpha / a_lin]
    elif kind == "lowshelf":
        two_sqrt_a_alpha = 2.0 * np.sqrt(a_lin) * alpha
        b = [
            a_lin * ((a_lin + 1) - (a_lin - 1) * cw + two_sqrt_a_alpha),
            2 * a_lin * ((a_lin - 1) - (a_lin + 1) * cw),
            a_lin * ((a_lin + 1) - (a_lin - 1) * cw - two_sqrt_a_alpha),
        ]
        a = [
            (a_lin + 1) + (a_lin - 1) * cw + two_sqrt_a_alpha,
            -2 * ((a_lin - 1) + (a_lin + 1) * cw),
            (a_lin + 1) + (a_lin - 1) * cw - two_sqrt_a_alpha,
        ]
    elif kind == "highshelf":
        two_sqrt_a_alpha = 2.0 * np.sqrt(a_lin) * alpha
        b = [
            a_lin * ((a_lin + 1) + (a_lin - 1) * cw + two_sqrt_a_alpha),
            -2 * a_lin * ((a_lin - 1) + (a_lin + 1) * cw),
            a_lin * ((a_lin + 1) + (a_lin - 1) * cw - two_sqrt_a_alpha),
        ]
        a = [
            (a_lin + 1) - (a_lin - 1) * cw + two_sqrt_a_alpha,
            2 * ((a_lin - 1) - (a_lin + 1) * cw),
            (a_lin + 1) - (a_lin - 1) * cw - two_sqrt_a_alpha,
        ]
    else:
        raise ValueError(f"unknown biquad kind {kind!r}")
    return np.asarray(b, dtype=np.float64), np.asarray(a, dtype=np.float64)


def freq_response(b: np.ndarray, a: np.ndarray, omega: np.ndarray) -> np.ndarray:
    """Exact H(e^{jw}) = B(e^{-jw})/A(e^{-jw}) — form-independent golden."""
    omega = np.asarray(omega, dtype=np.float64)
    z1 = np.exp(-1j * omega)
    z2 = z1 * z1
    num = b[0] + b[1] * z1 + b[2] * z2
    den = a[0] + a[1] * z1 + a[2] * z2
    return num / den


def group_delay(b: np.ndarray, a: np.ndarray, omega: np.ndarray) -> np.ndarray:
    """Analytic group delay tau_g = -d arg H / dw in samples.

    For a polynomial P(e^{-jw}) = sum_k p_k e^{-jwk}, the phase-derivative
    contribution is Re[ (sum_k k p_k e^{-jwk}) / P ]; tau_g = tau_B - tau_A.
    """
    omega = np.asarray(omega, dtype=np.float64)

    def tau(p: np.ndarray) -> np.ndarray:
        z1 = np.exp(-1j * omega)
        val = p[0] + p[1] * z1 + p[2] * z1 * z1
        dval = p[1] * z1 + 2.0 * p[2] * z1 * z1
        return np.real(dval / val)

    return tau(np.asarray(b)) - tau(np.asarray(a))


def poles(a: np.ndarray) -> np.ndarray:
    return np.roots(np.asarray(a, dtype=np.float64))


def zeros(b: np.ndarray) -> np.ndarray:
    return np.roots(np.asarray(b, dtype=np.float64))


def is_stable(a: np.ndarray) -> bool:
    return bool(np.all(np.abs(poles(a)) < 1.0))


def df1_filter(b: np.ndarray, a: np.ndarray, x: np.ndarray) -> np.ndarray:
    """Direct Form I reference filtering (the RBJ-canonical form), f64."""
    b0, b1, b2 = (np.asarray(b) / a[0]).tolist()
    a1, a2 = (np.asarray(a[1:]) / a[0]).tolist()
    y = np.zeros_like(np.asarray(x, dtype=np.float64))
    x = np.asarray(x, dtype=np.float64)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        yi = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, yi
        y[i] = yi
    return y


def impulse_response_dft(b: np.ndarray, a: np.ndarray, n: int) -> np.ndarray:
    """Measured leg: DFT of the length-N impulse response from DF1 filtering.

    Converges to H(e^{jw_k}) as the response decays below f64 epsilon within
    the frame — the gate scene picks (f0, Q) so it does.
    """
    impulse = np.zeros(n)
    impulse[0] = 1.0
    return np.fft.fft(df1_filter(b, a, impulse))
