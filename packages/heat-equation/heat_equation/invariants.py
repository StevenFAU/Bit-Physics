"""PBT invariant callables (spec-ref.md § 6.3).

Each callable returns a (passed, measured) tuple so the pytest layer can
sweep parameters and surface measured values in failure messages (the
schrodinger-smoke invariants pattern). Ceilings are module constants:
machine-exact gates at 1e-13, telescoping-sum FP accumulation at 1e-12,
continuum properties at stated f64 tolerances.
"""

from __future__ import annotations

import numpy as np

from .reference import ftcs_step, stability_bound_dt
from .spectral import (
    continuous_laplacian_eigenvalues,
    decay_factors,
    parseval_rel_err,
    spectral_step,
)

SPECTRAL_MODE_CEILING = 1e-13
PARSEVAL_CEILING = 1e-13
MASS_DRIFT_CEILING = 1e-12
MAX_PRINCIPLE_CEILING = 1e-12
L2_GROWTH_CEILING = 1e-12
NONNEG_CEILING = 1e-12
SOURCE_ACCOUNT_CEILING = 1e-11


def _smooth_random_field(n: int, seed: int, offset: float = 1.0) -> np.ndarray:
    """Band-limited random field: white noise low-pass filtered in Fourier
    space (smooth, so continuum invariants are exercised away from grid
    noise), plus a positive offset for the nonnegativity sweep."""
    rng = np.random.default_rng(seed)
    field = rng.standard_normal((n, n))
    f_hat = np.fft.fft2(field)
    k = np.fft.fftfreq(n) * n
    kx, ky = np.meshgrid(np.abs(k), np.abs(k), indexing="ij")
    f_hat[(kx > 4) | (ky > 4)] = 0.0
    smooth = np.real(np.fft.ifft2(f_hat))
    smooth = smooth / max(1.0, float(np.max(np.abs(smooth))))
    return offset + smooth


def mass_conserved_periodic_no_source(
    n: int, alpha: float, steps: int, seed: int
) -> tuple[bool, float]:
    """Periodic, zero source: Sum(T) is conserved. FTCS telescopes exactly in
    exact arithmetic; measured f64 drift stays under 1e-12 relative."""
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    t = _smooth_random_field(n, seed)
    pre = float(np.sum(t))
    for _ in range(steps):
        t = ftcs_step(t, alpha, dt, dx, dx)
    drift = abs(float(np.sum(t)) - pre) / abs(pre)
    return drift <= MASS_DRIFT_CEILING, drift


def maximum_principle_stable_no_source(
    n: int, alpha: float, steps: int, seed: int
) -> tuple[bool, float]:
    """Stable dt, no source: values stay within the initial [min, max]
    envelope (the FTCS update is a convex combination when r_x + r_y <= 1/2)."""
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    t = _smooth_random_field(n, seed)
    lo, hi = float(np.min(t)), float(np.max(t))
    worst = 0.0
    for _ in range(steps):
        t = ftcs_step(t, alpha, dt, dx, dx)
        worst = max(worst, float(np.max(t)) - hi, lo - float(np.min(t)))
    return worst <= MAX_PRINCIPLE_CEILING, worst


def l2_energy_nonincreasing(
    n: int, alpha: float, steps: int, seed: int
) -> tuple[bool, float]:
    """Periodic zero-source diffusion never increases ||T - mean||_2 (the k=0
    mode is conserved, all others are damped by |g_h| <= 1)."""
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    t = _smooth_random_field(n, seed)
    t = t - float(np.mean(t))
    prev = float(np.sum(t * t))
    worst = 0.0
    for _ in range(steps):
        t = ftcs_step(t, alpha, dt, dx, dx)
        cur = float(np.sum(t * t))
        worst = max(worst, (cur - prev) / max(prev, 1e-300))
        prev = cur
    return worst <= L2_GROWTH_CEILING, worst


def nonnegative_preserved(
    n: int, alpha: float, steps: int, seed: int
) -> tuple[bool, float]:
    """Nonnegative IC + nonnegative source stay nonnegative under the stable
    explicit update (convex combination + nonnegative increments)."""
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    t = np.abs(_smooth_random_field(n, seed, offset=1.5))
    source = np.abs(_smooth_random_field(n, seed + 1, offset=0.0))
    worst = 0.0
    for _ in range(steps):
        t = ftcs_step(t, alpha, dt, dx, dx, source=source)
        worst = max(worst, -float(np.min(t)))
    return worst <= NONNEG_CEILING, worst


def spectral_per_mode_exact(
    n: int, alpha: float, dt: float, mode: tuple[int, int], steps: int = 1
) -> tuple[bool, float]:
    """A single seeded Fourier mode advances by exactly exp(-alpha*|k|^2*dt)
    per step under the spectral solver (machine-exact gate, <= 1e-13).

    The error metric is ABSOLUTE per unit initial amplitude: once a mode has
    decayed below the FFT round-off floor (~1e-16 of the field scale) a
    relative comparison against a denormal expected value is meaningless —
    the exactness claim is |measured - expected| <= 1e-13 * amp(0).
    """
    lam = continuous_laplacian_eigenvalues(n, n)
    t_hat0 = np.zeros((n, n), dtype=np.complex128)
    t_hat0[mode] = 1.0
    t_hat0[(-mode[0]) % n, (-mode[1]) % n] = 1.0  # keep the field real
    t = np.real(np.fft.ifft2(t_hat0))
    for _ in range(steps):
        t = spectral_step(t, alpha, dt)
    measured = np.fft.fft2(t)[mode]
    expected = float(decay_factors(lam, alpha, dt)[mode]) ** steps
    err = abs(measured - expected)  # amp(0) = 1 by construction
    return err <= SPECTRAL_MODE_CEILING, float(err)


def spectral_mass_machine_exact(
    n: int, alpha: float, dt: float, seed: int, steps: int
) -> tuple[bool, float]:
    """Spectral path: the k=0 mode multiplies by exp(0) = 1 exactly, so total
    heat is conserved to FFT round-off (<= 1e-13 relative)."""
    t = _smooth_random_field(n, seed)
    pre = float(np.sum(t))
    for _ in range(steps):
        t = spectral_step(t, alpha, dt)
    drift = abs(float(np.sum(t)) - pre) / abs(pre)
    return drift <= 1e-13, drift


def parseval_machine_exact(n: int, seed: int) -> tuple[bool, float]:
    """FFT normalization (Parseval/Plancherel) holds to <= 1e-13."""
    t = _smooth_random_field(n, seed)
    err = parseval_rel_err(t)
    return err <= PARSEVAL_CEILING, err


def source_integral_accounted(
    n: int, alpha: float, steps: int, seed: int
) -> tuple[bool, float]:
    """Total heat change equals the integrated source: for periodic FTCS,
    Sum(T^{n+1}) = Sum(T^n) + dt*Sum(S) exactly (telescoping stencil)."""
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    t = _smooth_random_field(n, seed)
    source = _smooth_random_field(n, seed + 7, offset=0.0)
    pre = float(np.sum(t))
    for _ in range(steps):
        t = ftcs_step(t, alpha, dt, dx, dx, source=source)
    expected = pre + steps * dt * float(np.sum(source))
    scale = max(abs(expected), 1.0)
    err = abs(float(np.sum(t)) - expected) / scale
    return err <= SOURCE_ACCOUNT_CEILING, err


__all__ = [
    "L2_GROWTH_CEILING",
    "MASS_DRIFT_CEILING",
    "MAX_PRINCIPLE_CEILING",
    "NONNEG_CEILING",
    "PARSEVAL_CEILING",
    "SOURCE_ACCOUNT_CEILING",
    "SPECTRAL_MODE_CEILING",
    "l2_energy_nonincreasing",
    "mass_conserved_periodic_no_source",
    "maximum_principle_stable_no_source",
    "nonnegative_preserved",
    "parseval_machine_exact",
    "source_integral_accounted",
    "spectral_mass_machine_exact",
    "spectral_per_mode_exact",
]
