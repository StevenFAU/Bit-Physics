"""Naive vs bandlimited oscillator — the aliasing negative control (§ 3.6).

The bandlimited (truncated-Fourier) saw's spectrum contains ONLY the
committed harmonic lines; the naive sampled saw grows aliased lines the
golden lacks. Shown, not hidden — and never a product default.
"""

import numpy as np

from signal_workbench.synthesis import additive_signal, naive_saw, saw_harmonics

N = 4096
F0 = 331  # coherent integer cycles-per-frame: committed lines sit exactly on bins
N_HARM = 6  # keeps k*F0 well under Nyquist


def _offgrid_line_power(x: np.ndarray, f0: int, n_harm: int) -> float:
    """Total spectral power away from DC and the committed harmonic bins."""
    spec = np.abs(np.fft.rfft(x)) ** 2
    mask = np.ones(len(spec), dtype=bool)
    mask[:3] = False  # DC guard (the naive saw has a DC offset by construction)
    for k in range(1, n_harm + 1):
        bin_k = (k * f0) % len(x)
        if bin_k > len(x) // 2:
            bin_k = len(x) - bin_k  # fold across Nyquist like the synthesis does
        mask[bin_k] = False
    return float(spec[mask].sum() / spec.sum())


def test_bandlimited_has_no_offgrid_energy_but_naive_does() -> None:
    bl = additive_signal(N, F0, saw_harmonics(N_HARM))
    nv = naive_saw(N, F0)
    frac_bl = _offgrid_line_power(bl, F0, N_HARM)
    frac_nv = _offgrid_line_power(nv, F0, N_HARM)
    # bandlimited coherent: ALL energy on the committed bins (machine floor);
    # naive: truncation-to-sample partials alias across the whole band.
    assert frac_bl <= 1e-20, frac_bl
    assert frac_nv > 0.01, frac_nv
    assert frac_nv > 1e10 * max(frac_bl, 1e-30), (frac_bl, frac_nv)


def test_naive_grows_spurious_lines_as_fundamental_sweeps_up() -> None:
    fracs = []
    for f0 in (331, 662, 1324):
        nv = naive_saw(N, f0)
        fracs.append(_offgrid_line_power(nv, f0, N_HARM))
    assert fracs[-1] > fracs[0], fracs
