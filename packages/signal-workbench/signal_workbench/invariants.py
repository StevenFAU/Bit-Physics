"""PBT predicates (spec-ref section 6.3). Each returns (passed, measured)."""

from __future__ import annotations

import numpy as np

from .filters import is_stable, rbj_coeffs
from .reference import parseval_residual
from .synthesis import fm_energy_identity_residual, sine
from .windows import figures_of_merit, window

PARSEVAL_CEILING = 1e-13
# pocketfft rounding at N=4096 measures up to ~1.4e-13 relative leak on some
# (k0, phase) draws — still the machine floor, so the ceiling sits just above.
SINGLE_BIN_CEILING = 5e-13
FM_ENERGY_CEILING = 1e-12
COHERENT_GAIN_CEILING = 1e-12
LINEARITY_CEILING = 1e-12


def parseval_energy_exact(n: int, seed: int) -> tuple[bool, float]:
    """Own-FFT Rayleigh/Parseval residual at f64 machine precision."""
    rng = np.random.default_rng(seed)
    res = parseval_residual(rng.standard_normal(n))
    return res <= PARSEVAL_CEILING, res


def coherent_tone_single_bin(n: int, k0: int, seed: int) -> tuple[bool, float]:
    """Coherent rectangular-windowed sinusoid: all energy in one line pair."""
    rng = np.random.default_rng(seed)
    phase = float(rng.uniform(0.0, 2.0 * np.pi))
    amp = float(rng.uniform(0.25, 1.0))
    x = amp * np.sin(2.0 * np.pi * k0 * np.arange(n) / n + phase)
    big_x = np.abs(np.fft.fft(x))
    peak = big_x[k0]
    others = big_x.copy()
    others[k0] = 0.0
    others[n - k0] = 0.0
    leak = float(others.max() / peak)
    return leak <= SINGLE_BIN_CEILING, leak


def fm_energy_identity(index: float) -> tuple[bool, float]:
    """DLMF 10.23.3: J_0^2 + 2 sum J_n^2 = 1 for the FM sideband set."""
    res = fm_energy_identity_residual(index)
    return res <= FM_ENERGY_CEILING, res


def biquad_stable_poles_in_unit_circle(
    kind: str, f0_frac: float, q: float, gain_db: float
) -> tuple[bool, float]:
    """RBJ poles strictly inside the unit circle on the open (0, Fs/2)."""
    b, a = rbj_coeffs(kind, f0_frac * 48000.0, 48000.0, q, gain_db)
    stable = is_stable(a)
    roots = np.roots(a)
    return stable, float(np.max(np.abs(roots)))


def window_dc_gain_is_coherent_gain(name: str, n: int) -> tuple[bool, float]:
    """sum w / N equals the tabulated coherent gain (self-consistency)."""
    w = window(name, n)
    cg_direct = float(w.sum() / n)
    cg_table = figures_of_merit(name, n)["coherent_gain"]
    err = abs(cg_direct - cg_table)
    return err <= COHERENT_GAIN_CEILING, err


def linearity_and_parseval_under_gain(
    n: int, k0: int, gain: float, seed: int
) -> tuple[bool, float]:
    """Scaling the signal scales the spectrum linearly, energy by the square."""
    x = sine(n, k0, 1.0, 0.7)
    x_g = gain * x
    big_x = np.fft.fft(x)
    big_xg = np.fft.fft(x_g)
    lin_err = float(np.max(np.abs(big_xg - gain * big_x)) / np.max(np.abs(big_xg)))
    e = float(np.sum(x * x))
    e_g = float(np.sum(x_g * x_g))
    energy_err = abs(e_g - gain * gain * e) / max(e_g, 1e-300)
    worst = max(lin_err, energy_err)
    return worst <= LINEARITY_CEILING, worst
