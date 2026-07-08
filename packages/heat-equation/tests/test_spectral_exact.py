"""Machine-exact spectral gates (spec-ref.md § 3.2, § 6.2).

The spectral solver's per-mode update IS the analytic solution — these gates
run at 1e-13, not at a discretization tolerance. Includes the ETD1 semigroup
check (n steps of dt == one step of n*dt for constant forcing) that pins the
phi_1 forcing form, and the k=0 special case.
"""

from __future__ import annotations

import numpy as np
import pytest
from heat_equation.invariants import (
    parseval_machine_exact,
    spectral_mass_machine_exact,
    spectral_per_mode_exact,
)
from heat_equation.spectral import (
    continuous_laplacian_eigenvalues,
    decay_factors,
    phi1_factors,
    spectral_step,
    spectral_step_hat,
)


@pytest.mark.parametrize("mode", [(1, 0), (1, 1), (5, 3), (2, 7), (31, 17)])
@pytest.mark.parametrize("alpha,dt", [(0.02, 6.103515625e-4), (1.0, 1e-3)])
def test_per_mode_decay_machine_exact(
    mode: tuple[int, int], alpha: float, dt: float
) -> None:
    passed, err = spectral_per_mode_exact(64, alpha, dt, mode, steps=8)
    assert passed, f"mode {mode}: per-mode relative error {err:.3e} > 1e-13"


def test_spectral_mass_machine_exact() -> None:
    passed, drift = spectral_mass_machine_exact(64, 0.02, 1e-3, seed=3, steps=32)
    assert passed, f"total-heat drift {drift:.3e} > 1e-13 on the spectral path"


def test_parseval_machine_exact() -> None:
    passed, err = parseval_machine_exact(128, seed=5)
    assert passed, f"Parseval relative error {err:.3e} > 1e-13"


def test_unconditional_stability_large_step() -> None:
    """dt at 400x the FTCS von Neumann bound: the spectral solver stays exact
    (no CFL) — the honest 'turbo' path (spec-ref.md § 3.2)."""
    n, alpha = 64, 0.02
    dx = 1.0 / n
    dt = 400.0 * dx * dx / (4.0 * alpha)
    passed, err = spectral_per_mode_exact(n, alpha, dt, (3, 2), steps=4)
    assert passed, f"large-step per-mode error {err:.3e} > 1e-13"


def test_etd1_semigroup_constant_source() -> None:
    """For constant-in-time S the ETD1 update is exact, so n steps of dt must
    equal one step of n*dt to FP round-off (pins the phi_1 forcing form)."""
    n, alpha, dt, steps = 64, 0.05, 2e-3, 16
    rng = np.random.default_rng(11)
    t0 = rng.standard_normal((n, n))
    source = rng.standard_normal((n, n))

    lam = continuous_laplacian_eigenvalues(n, n)
    s_hat = np.fft.fft2(source)

    many = np.fft.fft2(t0)
    decay = decay_factors(lam, alpha, dt)
    phi1 = phi1_factors(lam, alpha, dt)
    for _ in range(steps):
        many = spectral_step_hat(many, decay, phi1, s_hat)

    once = spectral_step_hat(
        np.fft.fft2(t0),
        decay_factors(lam, alpha, dt * steps),
        phi1_factors(lam, alpha, dt * steps),
        s_hat,
    )
    a = np.real(np.fft.ifft2(many))
    b = np.real(np.fft.ifft2(once))
    scale = float(np.max(np.abs(b)))
    assert float(np.max(np.abs(a - b))) <= 1e-11 * scale


def test_k0_mode_phi1_special_case() -> None:
    """The k=0 mode has lambda = 0: the forcing coefficient must be exactly dt
    (phi_1(0) = 1), so the mean grows by dt*mean(S) per step, exactly."""
    n, alpha, dt = 32, 0.02, 1e-3
    lam = continuous_laplacian_eigenvalues(n, n)
    phi1 = phi1_factors(lam, alpha, dt)
    assert phi1[0, 0] == dt

    source = np.full((n, n), 3.0)
    t = np.zeros((n, n))
    for _ in range(10):
        t = spectral_step(t, alpha, dt, source=source)
    assert abs(float(np.mean(t)) - 10 * dt * 3.0) <= 1e-13


def test_phi1_matches_series_near_zero() -> None:
    """expm1 keeps full precision where a naive (1-exp)/lambda cancels: check
    against the Taylor series dt*(1 - z/2 + z^2/6), z = lambda*dt, tiny z."""
    for lam_pos, dt in [(1e-9, 1e-3), (1e-6, 1e-2), (1e-12, 1.0)]:
        lam = np.array([[-lam_pos]])
        got = float(phi1_factors(lam, 1.0, dt)[0, 0])
        z = lam_pos * dt
        series = dt * (1.0 - z / 2.0 + z * z / 6.0)
        assert abs(got - series) <= 1e-15 * dt
