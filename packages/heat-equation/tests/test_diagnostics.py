"""Diagnostics + fixture sanity (spec-ref.md § 10): stability margin,
Gaussian-kernel closed form, mode-amplitude projection exactness, and the
FTCS-vs-spectral truncation-error diagnostic."""

from __future__ import annotations

import numpy as np
from heat_equation.reference import (
    ftcs_step,
    fourier_mode,
    gaussian_at_time,
    grid_coords,
    sinsin_amplitude,
    stability_bound_dt,
    stability_margin,
)
from heat_equation.sim import gate_config, make_canonical_ic
from heat_equation.spectral import spectral_step


def test_stability_margin_signs() -> None:
    alpha, dx = 0.02, 1.0 / 128
    bound = stability_bound_dt(alpha, dx, dx)
    assert stability_margin(alpha, 0.8 * bound, dx, dx) > 0.0
    assert abs(stability_margin(alpha, bound, dx, dx)) <= 1e-12
    assert stability_margin(alpha, 1.2 * bound, dx, dx) < 0.0


def test_sinsin_amplitude_exact_on_pure_mode() -> None:
    t = 0.37 * fourier_mode(128, 128, 5, 3)
    assert abs(sinsin_amplitude(t, 5, 3) - 0.37) <= 1e-13
    assert abs(sinsin_amplitude(t, 1, 1)) <= 1e-13


def test_gaussian_kernel_spread_law() -> None:
    """FTCS evolution of a narrow Gaussian tracks sigma^2 = sigma0^2 +
    2*alpha*t (spec-ref.md § 4.3; valid while sigma << L). Discretization-
    bounded tolerance."""
    n, alpha, sigma0 = 256, 0.02, 0.03
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    steps = 400
    x, y = grid_coords(n, n)
    t_field = gaussian_at_time(x, y, 0.0, alpha, sigma0)
    for _ in range(steps):
        t_field = ftcs_step(t_field, alpha, dt, dx, dx)
    exact = gaussian_at_time(x, y, steps * dt, alpha, sigma0)
    err = float(np.max(np.abs(t_field - exact)))
    assert err <= 5e-4, f"Gaussian-kernel error {err:.3e}"

    # Measured second moment recovers sigma^2(t) (amplitude-weighted).
    total = float(np.sum(t_field))
    var = float(np.sum(t_field * ((x - 0.5) ** 2 + (y - 0.5) ** 2))) / total / 2.0
    want = sigma0**2 + 2.0 * alpha * steps * dt
    assert abs(var - want) / want <= 1e-2


def test_ftcs_spectral_deviation_is_truncation_scale() -> None:
    """||T_ftcs - T_spec||_inf on the gate scene is the FTCS truncation error
    — nonzero (the two solvers ARE different operators) yet small (stable,
    resolved run). Brackets keep the diagnostic honest in both directions."""
    cfg = gate_config()
    t_f = make_canonical_ic(cfg.n)
    t_s = t_f.copy()
    for _ in range(64):
        t_f = ftcs_step(t_f, cfg.alpha, cfg.dt, cfg.dx, cfg.dx)
        t_s = spectral_step(t_s, cfg.alpha, cfg.dt)
    dev = float(np.max(np.abs(t_f - t_s)))
    assert 1e-9 <= dev <= 1e-2, f"truncation-scale deviation out of bracket: {dev:.3e}"
