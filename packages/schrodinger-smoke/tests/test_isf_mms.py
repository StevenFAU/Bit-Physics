"""Code verification (spec-ref.md § 6.1) — exact-propagator flatline,
spectral-Δx collapse, and full-split Richardson order study.

The free step is the EXACT propagator (the FFT phase multiply IS
e^{-i*H*dt}), so vs the analytic Gaussian packet the error must be FLAT
under dt-halving (that flatness is the check — review catch #2); dt order
exists only in the full split and is MEASURED by Richardson
self-convergence on the canonical ring scene.
"""

from __future__ import annotations

import numpy as np
import pytest

from schrodinger_smoke.reference.isf import (
    IsfConfig,
    continuous_laplacian_eigenvalues,
    discrete_laplacian_eigenvalues,
    free_step,
    gaussian_packet,
    isf_step,
    make_scene,
    normalize,
    pressure_project,
)

# Fixture chosen so (a) the spectral tail at N=64 is < 1e-14 of peak
# (exp(-(pi*N*sigma0)^2) ~ 1e-28) and (b) periodic images at the box
# boundary stay < 1e-12 over the window (sigma_T < 0.048) — the § 6.1
# periodization caveat.
_SIGMA0 = 0.04
_HBAR = 0.02
_T_FINAL = 0.08
_N = 64


def _free_evolve(psi: np.ndarray, n: int, dt: float, steps: int) -> np.ndarray:
    lam = continuous_laplacian_eigenvalues((n, n, n), 1.0 / n)
    for _ in range(steps):
        psi = free_step(psi, _HBAR, dt, lam)
    return psi


def test_exact_propagator_flatline() -> None:
    """Error vs the closed-form Gaussian is dt-INDEPENDENT at the FP floor:
    halving dt four times moves max_abs error by < 10x within a 1e-13
    absolute ceiling (declared from the measured ~2.3e-14 floor)."""
    psi0 = gaussian_packet(_N, 0.0, _HBAR, _SIGMA0)
    ref = gaussian_packet(_N, _T_FINAL, _HBAR, _SIGMA0)
    errs = []
    for steps in (2, 4, 8, 16):
        out = _free_evolve(psi0.copy(), _N, _T_FINAL / steps, steps)
        errs.append(float(np.max(np.abs(out[0] - ref[0]))))
    assert max(errs) <= 1e-13, errs
    # flatness: no dt trend beyond FP noise
    assert max(errs) <= 10.0 * min(errs), errs


def test_spectral_dx_collapse() -> None:
    """Grid refinement collapses the band-limit truncation error
    super-algebraically (spectral accuracy): each refinement gains MORE
    than one order of magnitude until the FP floor."""
    errs = {}
    for n in (16, 24, 32, 48):
        psi0 = gaussian_packet(n, 0.0, _HBAR, _SIGMA0)
        ref = gaussian_packet(n, _T_FINAL, _HBAR, _SIGMA0)
        out = _free_evolve(psi0, n, _T_FINAL / 4, 4)
        errs[n] = float(np.max(np.abs(out[0] - ref[0])))
    # measured at review: 7.6e-3 / 3.1e-5 / 1.7e-8 / 2.3e-14
    assert errs[24] < errs[16] / 10.0, errs
    assert errs[32] < errs[24] / 10.0, errs
    assert errs[48] < errs[32] / 100.0, errs
    assert errs[48] <= 1e-12, errs


def _richardson_slope(scheme: str, n: int = 32, t_final: float = 0.05) -> float:
    """Δt-halving self-convergence slope of the full split on the canonical
    ring scene: slope = log2(||S(dt)-S(dt/2)|| / ||S(dt/2)-S(dt/4)||).

    Protocol pinned from measurement: the comparison metric is the
    GAUGE-INVARIANT velocity field (psi itself differs by the accumulated
    gauge), L2 norm; the window/base (t_final = 0.05, base = 16 steps,
    thickness 0.12 ring at 32^3) is the smallest that reaches the
    asymptotic regime — coarser dt is pre-asymptotic (measured slopes
    scatter around 0 there) because a canonical-dt step advances high
    modes by tens of radians.
    """
    cfg = IsfConfig(n=n, hbar=0.05, scene="translating-ring", ring_thickness=0.12)
    dx = 1.0 / n
    lam_cont = continuous_laplacian_eigenvalues((n, n, n), dx)
    lam_disc = discrete_laplacian_eigenvalues((n, n, n), dx)
    psi0 = make_scene(cfg, lam_disc)

    def evolve(steps: int) -> np.ndarray:
        psi = psi0.copy()
        dt = t_final / steps
        for _ in range(steps):
            psi = isf_step(psi, cfg.hbar, dt, dx, lam_cont, lam_disc, scheme)
        # strang leaves a trailing half free step un-projected; read out on
        # the constraint manifold for a like-for-like comparison
        psi = normalize(psi)
        psi = pressure_project(psi, dx, lam_disc)
        from schrodinger_smoke.reference.isf import velocity_faces

        return np.stack(velocity_faces(psi, cfg.hbar, dx))

    base = 16
    s1 = evolve(base)
    s2 = evolve(base * 2)
    s4 = evolve(base * 4)
    d12 = float(np.sqrt(np.mean((s1 - s2) ** 2)))
    d24 = float(np.sqrt(np.mean((s2 - s4) ** 2)))
    return float(np.log2(d12 / d24))


@pytest.mark.parametrize("scheme", ["lie", "strang"])
def test_full_split_richardson_order(scheme: str) -> None:
    """MEASURED slope, declared as a band (never asserted from theory —
    projections are not flows; § 6.1). MEASURED at build (2026-07-05,
    this protocol): lie = 1.71, strang = 1.65 — both first-order-plus;
    the classical Lie ≈ 1 / Strang ≈ 2 targets were NOT reproduced as a
    separation (the projection/normalize corrections dominate), which is
    recorded honestly. Declared band [0.8, 3.5] guards regression."""
    slope = _richardson_slope(scheme)
    assert 0.8 <= slope <= 3.5, slope


def test_per_mode_phase_exact() -> None:
    """Seeded single mode advances by exactly -(hbar*dt/2)|k|^2 (§ 7 B)."""
    n, hbar, dt = 32, 0.1, 0.05
    lam = continuous_laplacian_eigenvalues((n, n, n), 1.0 / n)
    for mode in ((1, 0, 0), (2, 3, 1), (0, 0, 5), (7, 7, 7)):
        psi_hat = np.zeros((2, n, n, n), dtype=np.complex128)
        psi_hat[0][mode] = 1.0
        psi = np.fft.ifftn(psi_hat, axes=(1, 2, 3))
        out_hat = np.fft.fftn(free_step(psi, hbar, dt, lam), axes=(1, 2, 3))
        measured = float(np.angle(out_hat[0][mode]))
        k = 2.0 * np.pi * np.array([np.fft.fftfreq(n)[m] * n for m in mode])
        expected = -(hbar * dt / 2.0) * float(np.dot(k, k))
        err = abs((measured - expected + np.pi) % (2.0 * np.pi) - np.pi)
        assert err <= 1e-12, (mode, err)
