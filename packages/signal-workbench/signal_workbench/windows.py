"""Window coefficients, closed-form DTFTs, and figures of merit.

Every shipped window is a sum-of-cosine window

    w[n] = sum_k (-1)^k a_k cos(2 pi k n / M),   n = 0..N-1,

with M = N (periodic / DFT-even, the STFT default) or M = N - 1 (symmetric).
The DTFT is therefore an exact weighted sum of shifted Dirichlet kernels
(Nuttall 1981 eq. 10a / 15b), so the incoherent-tone leakage golden is exact
for every window, not just the rectangle.

Figures of merit are RE-DERIVED numerically from the committed coefficients —
never hand-copied from Harris 1978, whose Table I has documented errata
(Nuttall 1981: Hann -32 -> -31.47 dB, min-3-term BH -67 -> -70.83 dB). Anchors:
Nuttall 1981 Table II; Heinzel GH_FFT; JOS SASP (spec-ref section 4.2).

Coefficient traps pinned here (spec-ref section 2 anchors 2-3):
- Hamming is alpha = 0.54 EXACTLY. The exact rational 25/46 nulls the first
  side lobe but a later lobe rises to -41.69 dB, worse than 0.54's -42.68 dB.
- "nuttall4b" is Nuttall's continuous-first-derivative window (eq. 34,
  three equal -93.32 dB lobes, -18 dB/oct). scipy.signal.windows.nuttall and
  MATLAB nuttallwin implement the DIFFERENT minimum-sidelobe set (eq. 37,
  "nuttall4c" here, -98.17 dB) — validating 4b against scipy fails by
  construction.
"""

from __future__ import annotations

import numpy as np

# Committed coefficient sets: w[n] = sum_k (-1)^k a_k cos(2 pi k n / M).
# The triangle (Bartlett) window is not sum-of-cosine and is special-cased.
WINDOW_COEFFS: dict[str, tuple[float, ...]] = {
    "rectangular": (1.0,),
    "hann": (0.5, 0.5),
    "hamming": (0.54, 0.46),
    "blackman": (0.42, 0.5, 0.08),
    "blackmanharris3": (0.42323, 0.49755, 0.07922),
    "blackmanharris4": (0.35875, 0.48829, 0.14128, 0.01168),
    "nuttall4b": (0.355768, 0.487396, 0.144232, 0.012604),
    "nuttall4c": (0.3635819, 0.4891775, 0.1365995, 0.0106411),
}

# Asymptotic side-lobe fall-off in dB/octave — an analytic property of the
# window's endpoint smoothness (documented, not measured): -6 for a jump,
# -12 for a slope discontinuity, -18 for continuous first derivative.
WINDOW_FALLOFF_DB_PER_OCT: dict[str, int] = {
    "rectangular": -6,
    "triangle": -12,
    "hann": -18,
    "hamming": -6,
    "blackman": -18,
    "blackmanharris3": -6,
    "blackmanharris4": -6,
    "nuttall4b": -18,
    "nuttall4c": -6,
}

WINDOW_NAMES: tuple[str, ...] = (
    "rectangular",
    "triangle",
    "hann",
    "hamming",
    "blackman",
    "blackmanharris3",
    "blackmanharris4",
    "nuttall4b",
    "nuttall4c",
)


def window(name: str, n: int, *, periodic: bool = True) -> np.ndarray:
    """Window taps in f64. Periodic (DFT-even) by default — the STFT form."""
    if name == "triangle":
        m = n if periodic else n - 1
        return 1.0 - np.abs((np.arange(n) - m / 2.0) / (m / 2.0))
    coeffs = WINDOW_COEFFS[name]
    m = n if periodic else n - 1
    k = np.arange(n)
    w = np.zeros(n)
    for i, a in enumerate(coeffs):
        w += ((-1.0) ** i) * a * np.cos(2.0 * np.pi * i * k / m)
    return w


def dirichlet(omega: np.ndarray, n: int) -> np.ndarray:
    """Causal Dirichlet kernel D_N(w) = e^{-jw(N-1)/2} sin(Nw/2)/sin(w/2)."""
    omega = np.asarray(omega, dtype=float)
    num = np.sin(n * omega / 2.0)
    den = np.sin(omega / 2.0)
    with np.errstate(divide="ignore", invalid="ignore"):
        ratio = np.where(np.abs(den) < 1e-300, float(n), num / den)
    # Remove the 0/0 at w = 2 pi m exactly: limit is N cos(pi m (N-1)) sign.
    small = np.abs(den) < 1e-12
    if np.any(small):
        ratio = np.where(
            small, n * np.cos(n * omega / 2.0) / np.cos(omega / 2.0), ratio
        )
    return np.exp(-1j * omega * (n - 1) / 2.0) * ratio


def window_dtft(name: str, n: int, omega: np.ndarray) -> np.ndarray:
    """Exact closed-form DTFT of the periodic sum-of-cosine window.

    W(w) = a_0 D_N(w) + sum_{k>=1} (-1)^k a_k/2 [D_N(w - 2 pi k/N) + D_N(w + 2 pi k/N)]

    (Nuttall eq. 10a with the alternating signs folded in). Exact for every
    shipped window except the triangle (use `dirichlet` squared form for it).
    """
    if name == "triangle":
        # Bartlett of even length N = convolution of two length-N/2 boxes:
        # W(w) = (2/N) e^{-jw(N-1)/2} [sin(Nw/4)/sin(w/2)]^2 for periodic form.
        omega = np.asarray(omega, dtype=float)
        half = dirichlet(omega, n // 2) * np.exp(1j * omega * (n // 2 - 1) / 2.0)
        return (
            (2.0 / n)
            * np.abs(half) ** 2
            * np.exp(-1j * omega * (n - 1) / 2.0)
            * (n / 2.0)
            / (n / 2.0)
        )
    coeffs = WINDOW_COEFFS[name]
    omega = np.asarray(omega, dtype=float)
    out = coeffs[0] * dirichlet(omega, n).astype(complex)
    for k in range(1, len(coeffs)):
        shift = 2.0 * np.pi * k / n
        term = dirichlet(omega - shift, n) + dirichlet(omega + shift, n)
        out += ((-1.0) ** k) * coeffs[k] / 2.0 * term
    return out


def figures_of_merit(name: str, n: int = 4096, pad: int = 64) -> dict[str, float]:
    """Coherent gain, ENBW, scalloping loss, WCPL, peak side lobe (dB).

    Dense-FFT numeric derivation from the committed taps (Nuttall Table II
    methodology). The scallop column is scalloping loss, NOT worst-case
    process loss; they coincide only for the rectangle.
    """
    w = window(name, n)
    s = float(w.sum())
    coherent_gain = s / n
    enbw_bins = float(n * (w * w).sum() / s**2)
    k = np.arange(n)
    half_bin = np.abs((w * np.exp(-1j * np.pi * k / n)).sum()) / s
    scallop_db = float(-20.0 * np.log10(half_bin))
    wcpl_db = float(scallop_db + 10.0 * np.log10(enbw_bins))
    psl_db = _peak_sidelobe_db(w, n, pad)
    return {
        "coherent_gain": coherent_gain,
        "enbw_bins": enbw_bins,
        "scallop_db": scallop_db,
        "wcpl_db": wcpl_db,
        "psl_db": psl_db,
        "falloff_db_per_oct": float(WINDOW_FALLOFF_DB_PER_OCT[name]),
    }


def _peak_sidelobe_db(w: np.ndarray, n: int, pad: int) -> float:
    """Pad-converged peak side lobe: dense rFFT + parabolic peak refinement.

    The raw padded-grid maximum is pad-sensitive at the few-1e-3-dB level;
    fitting a parabola through the three dB samples around the maximum makes
    the value stable across pad factors to ~1e-6 dB.
    """
    mag = np.abs(np.fft.rfft(w, n * pad))
    mag /= mag[0]
    db = 20.0 * np.log10(np.maximum(mag, 1e-300))
    i = 1
    while i < len(db) - 1 and db[i + 1] < db[i]:
        i += 1
    j = i + int(np.argmax(db[i:]))
    if j <= i or j >= len(db) - 1:
        return float(db[j])
    y0, y1, y2 = db[j - 1], db[j], db[j + 1]
    denom = y0 - 2.0 * y1 + y2
    if abs(denom) < 1e-30:
        return float(y1)
    delta = 0.5 * (y0 - y2) / denom
    return float(y1 - 0.25 * (y0 - y2) * delta)


def cola_ripple(name: str, m: int, hop: int, *, periodic: bool = True) -> float:
    """Peak-to-peak ripple of sum_m w(n - m R) over the steady-state region.

    COLA endpoint-convention trio for Hann (numerically verified, spec-ref
    section 4.2): periodic -> R = M/2; symmetric WITH zero endpoints ->
    R = (M-1)/2; endpoints-excluded (MATLAB `hanning`) -> R = (M+1)/2.
    """
    w = window(name, m, periodic=periodic)
    total = m * 8
    acc = np.zeros(total)
    for start in range(0, total - m, hop):
        acc[start : start + m] += w
    steady = acc[m * 2 : m * 5]
    return float(np.ptp(steady))


def tone_windowed_dft(
    name: str,
    n: int,
    f0_bins: float,
    amplitude: float = 1.0,
    phase: float = 0.0,
) -> np.ndarray:
    """Exact closed-form DFT of a windowed real sinusoid — the leakage golden.

    x[n] = A sin(2 pi f0_bins n / N + phase); the measured DFT of w*x equals

        X[k] = A/(2j) [ e^{+j phase} W(w_k - w_0) - e^{-j phase} W(w_k + w_0) ]

    with W the window DTFT above and w_0 = 2 pi f0_bins / N. This is the
    discrete-spectrum discipline (spec-ref section 3.2): the golden is F*W on
    the bin grid, never the continuous line spectrum.
    """
    omega_k = 2.0 * np.pi * np.arange(n) / n
    omega_0 = 2.0 * np.pi * f0_bins / n
    w_minus = window_dtft(name, n, omega_k - omega_0)
    w_plus = window_dtft(name, n, omega_k + omega_0)
    return (
        amplitude / 2j * (np.exp(1j * phase) * w_minus - np.exp(-1j * phase) * w_plus)
    )
