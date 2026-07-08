"""Discrete-spectrum discipline: measured DFT == F*W, never the continuous
line spectrum (§ 3.2) — including the negative control that proves the
golden distinguishes the two."""

import numpy as np
import pytest

from signal_workbench.reference import windowed_dft
from signal_workbench.synthesis import sine
from signal_workbench.windows import tone_windowed_dft

N = 4096
GOLDEN_CEILING = 1e-11  # rel of spectrum peak, f64 Dirichlet accumulation


@pytest.mark.parametrize("name", ("rectangular", "hann", "hamming", "blackmanharris4"))
@pytest.mark.parametrize("f0_bins", (100.37, 517.83))
def test_measured_dft_equals_window_skirt(name: str, f0_bins: float) -> None:
    x = sine(N, f0_bins, 0.8, 0.3)
    measured = windowed_dft(x, name)
    golden = tone_windowed_dft(name, N, f0_bins, 0.8, 0.3)
    err = np.max(np.abs(measured - golden)) / np.max(np.abs(golden))
    assert err <= GOLDEN_CEILING, f"{name} skirt error {err:.3e}"


def test_continuous_line_spectrum_is_the_wrong_golden() -> None:
    """Negative control: comparing the windowed measured DFT against the
    idealized continuous line spectrum leaks the window skirt as error."""
    f0 = 100.37
    x = sine(N, f0, 0.8, 0.3)
    measured = windowed_dft(x, "hann")
    wrong = np.zeros(N, dtype=complex)  # single line at the nearest bin
    k = int(round(f0))
    wsum = 0.5 * N  # hann coherent gain * N
    wrong[k] = -0.5j * 0.8 * wsum * np.exp(0.3j)
    wrong[N - k] = np.conj(wrong[k]) * -1.0
    err_wrong = np.max(np.abs(measured - wrong)) / np.max(np.abs(measured))
    golden = tone_windowed_dft("hann", N, f0, 0.8, 0.3)
    err_right = np.max(np.abs(measured - golden)) / np.max(np.abs(golden))
    assert err_wrong > 1e3 * max(err_right, 1e-30), (err_wrong, err_right)


def test_coherent_tone_is_a_single_exact_line() -> None:
    """The coherent regime: on-bin tone + rectangular window = one line."""
    k0 = 331
    x = sine(N, k0, 1.0, 0.0)
    measured = np.abs(np.fft.fft(x))
    peak = measured[k0]
    measured[k0] = 0.0
    measured[N - k0] = 0.0
    assert measured.max() / peak <= 1e-13
