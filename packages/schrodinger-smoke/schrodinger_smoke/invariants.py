"""PBT invariant callables for the ISF reference (spec-ref.md § 6.6).

Each callable returns a (passed, detail) tuple so the pytest layer can sweep
parameters and surface the measured values in failure messages. The invariant
set mirrors the spec's declared PBT rows:

1. ``norm_mass_unitary_conserved`` — machine-exact (gate <= 1e-13).
2. ``projection_divergence_contracts`` — scale-free ratio form (the landed
   clebsch-pfm PBT #2 pattern): post-projection max|div| <= ratio * pre.
3. ``per_mode_phase_exact`` — free-step phase golden swept over modes.
4. ``irrotational_stays_curl_free`` — continuum, MEASURED-convergent (labeled
   approximate; asserted only as bounded, never machine-exact).
"""

from __future__ import annotations

import numpy as np

from .reference.isf import (
    continuous_laplacian_eigenvalues,
    discrete_laplacian_eigenvalues,
    divergence_from_phases,
    edge_phases,
    free_step,
    grid_coords,
    normalize,
    pressure_project,
)

NORM_DRIFT_CEILING = 1e-13
PHASE_ERR_CEILING = 1e-12
DIV_CONTRACTION_RATIO = 1e-6


def _smooth_random_spinor(n: int, seed: int) -> np.ndarray:
    """Band-limited random unit spinor: white noise low-pass filtered in
    Fourier space so edge phases stay far from the +-pi branch cut (the
    projection-exactness precondition, spec-ref.md § 3)."""
    rng = np.random.default_rng(seed)
    psi = rng.standard_normal((2, n, n, n)) + 1j * rng.standard_normal((2, n, n, n))
    psi_hat = np.fft.fftn(psi, axes=(1, 2, 3))
    k = np.fft.fftfreq(n) * n
    kx, ky, kz = np.meshgrid(k, k, k, indexing="ij")
    keep = (np.abs(kx) <= 2) & (np.abs(ky) <= 2) & (np.abs(kz) <= 2)
    psi_hat *= keep
    psi = np.fft.ifftn(psi_hat, axes=(1, 2, 3))
    # bias away from zeros so normalize() is well-conditioned
    psi[0] += 2.0
    return normalize(psi)


def norm_mass_unitary_conserved(
    n: int, hbar: float, dt: float, seed: int
) -> tuple[bool, float]:
    """Free step preserves global L2 norm to <= 1e-13 (machine-exact gate)."""
    dx = 1.0 / n
    lam = continuous_laplacian_eigenvalues((n, n, n), dx)
    psi = _smooth_random_spinor(n, seed)
    pre = float(np.sum(np.abs(psi) ** 2))
    post = float(np.sum(np.abs(free_step(psi, hbar, dt, lam)) ** 2))
    drift = abs(post - pre) / pre
    return drift <= NORM_DRIFT_CEILING, drift


def projection_divergence_contracts(n: int, seed: int) -> tuple[bool, float]:
    """Post-projection max|div| <= 1e-6 * pre-projection max|div| (scale-free;
    spectral projection contracts to FP-zero on wrap-free states)."""
    dx = 1.0 / n
    lam_disc = discrete_laplacian_eigenvalues((n, n, n), dx)
    psi = _smooth_random_spinor(n, seed)
    pre = float(np.max(np.abs(divergence_from_phases(edge_phases(psi), dx))))
    projected = pressure_project(psi, dx, lam_disc)
    post = float(np.max(np.abs(divergence_from_phases(edge_phases(projected), dx))))
    ratio = post / pre if pre > 0 else 0.0
    return ratio <= DIV_CONTRACTION_RATIO, ratio


def per_mode_phase_exact(
    n: int, hbar: float, dt: float, mode: tuple[int, int, int]
) -> tuple[bool, float]:
    """A single seeded Fourier mode advances by exactly -(hbar*dt/2)*|k|^2."""
    dx = 1.0 / n
    lam = continuous_laplacian_eigenvalues((n, n, n), dx)
    psi_hat = np.zeros((2, n, n, n), dtype=np.complex128)
    psi_hat[0][mode] = 1.0
    psi = np.fft.ifftn(psi_hat, axes=(1, 2, 3))
    out_hat = np.fft.fftn(free_step(psi, hbar, dt, lam), axes=(1, 2, 3))
    measured = float(np.angle(out_hat[0][mode]))
    k = 2.0 * np.pi * np.array([np.fft.fftfreq(n)[m] * n for m in mode])
    expected = -(hbar * dt / 2.0) * float(np.dot(k, k))
    err = abs((measured - expected + np.pi) % (2.0 * np.pi) - np.pi)
    return err <= PHASE_ERR_CEILING, err


def irrotational_stays_curl_free(n: int, hbar: float) -> tuple[bool, float]:
    """Madelung limit: for a single-component wave psi1 = e^{i*theta} (psi2 = 0)
    the edge phases are exact phase differences, so the plaquette circulation
    (the discrete MAC curl, in phase units) telescopes to machine zero on the
    principal branch — and the pressure projection preserves it (a gauge adds
    a discrete gradient, whose plaquette sum is zero). Vortices would show up
    as 2*pi quanta; a smooth gradient IC must stay at ~0."""
    dx = 1.0 / n
    lam_disc = discrete_laplacian_eigenvalues((n, n, n), dx)
    x, y, _z = grid_coords(n)
    theta = 0.3 * np.sin(2.0 * np.pi * x) + 0.2 * np.cos(2.0 * np.pi * y)
    psi = np.zeros((2, n, n, n), dtype=np.complex128)
    psi[0] = np.exp(1j * theta)
    psi = pressure_project(psi, dx, lam_disc)
    ex, ey, ez = edge_phases(psi)
    worst = 0.0
    for ea, eb, axis_a, axis_b in ((ex, ey, 0, 1), (ey, ez, 1, 2), (ex, ez, 0, 2)):
        circ = ea + np.roll(eb, -1, axis=axis_a) - np.roll(ea, -1, axis=axis_b) - eb
        worst = max(worst, float(np.max(np.abs(circ))))
    _ = hbar  # circulation quanta are hbar-scaled; the zero statement is not
    return worst <= 1e-12, worst


__all__ = [
    "DIV_CONTRACTION_RATIO",
    "NORM_DRIFT_CEILING",
    "PHASE_ERR_CEILING",
    "irrotational_stays_curl_free",
    "norm_mass_unitary_conserved",
    "per_mode_phase_exact",
    "projection_divergence_contracts",
]
