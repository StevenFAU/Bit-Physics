"""Spectral / exponential-integrator solver — the machine-exact reference.

On the periodic box the constant-alpha heat equation diagonalizes in Fourier
space (spec-ref.md § 3.2): each mode obeys

    d/dt That_k = -alpha*|k|^2 * That_k + Shat_k

whose EXACT one-step update (ETD1 / phi_1 integrating factor, Cox & Matthews
2002) is

    That_k(t+dt) = exp(-alpha*|k|^2*dt) * That_k(t)
                 + (1 - exp(-alpha*|k|^2*dt)) / (alpha*|k|^2) * Shat_k

with the k=0 mode special-cased to dt (phi_1(0) = 1) — the 0/0 trap is
explicit, not incidental. For the unforced problem this is machine-exact per
mode and unconditionally stable: no CFL, no amplitude error, no phase error.

Two-spectra discipline: THIS solver uses the CONTINUOUS eigenvalues
-alpha*|k|^2 (k = 2*pi*fftfreq*N on the unit box); the FTCS run is compared
against the DISCRETE g_h = 1 + alpha*dt*lambda_h instead. Never mix.

Precision rule shared with the WGSL port (spec-ref.md § 5.2): the per-mode
decay and phi_1 factors are precomputed in f64 (``decay_factors`` /
``phi1_factors``) — the web build commits these tables via its data spine so
the browser's per-mode multipliers are byte-pinned, never evaluated with
WGSL builtin ``exp``.
"""

from __future__ import annotations

import numpy as np

# ---------------------------------------------------------------------------
# Eigenvalue tables (two-spectra rule — spec-ref.md § 3.2, golden C)
# ---------------------------------------------------------------------------


def continuous_laplacian_eigenvalues(
    nx: int, ny: int, lx: float = 1.0, ly: float = 1.0
) -> np.ndarray:
    """lambda_c(k) = -|k|^2 with k = 2*pi*fftfreq — the SPECTRAL-path table."""
    kx = 2.0 * np.pi * np.fft.fftfreq(nx, d=lx / nx)
    ky = 2.0 * np.pi * np.fft.fftfreq(ny, d=ly / ny)
    kx2, ky2 = np.meshgrid(kx * kx, ky * ky, indexing="ij")
    return -(kx2 + ky2)


def discrete_laplacian_eigenvalues(
    nx: int, ny: int, lx: float = 1.0, ly: float = 1.0
) -> np.ndarray:
    """lambda_h(k) = -(4/dx^2) sin^2(pi*m/Nx) - (4/dy^2) sin^2(pi*n/Ny) —
    the 5-point-stencil symbol the FTCS amplification g_h is built from."""
    dx = lx / nx
    dy = ly / ny
    m = np.arange(nx)
    n = np.arange(ny)
    sx = -(4.0 / dx**2) * np.sin(np.pi * m / nx) ** 2
    sy = -(4.0 / dy**2) * np.sin(np.pi * n / ny) ** 2
    sxg, syg = np.meshgrid(sx, sy, indexing="ij")
    return sxg + syg


# ---------------------------------------------------------------------------
# f64 per-mode factor tables (the committed-buffer discipline)
# ---------------------------------------------------------------------------


def decay_factors(lam_cont: np.ndarray, alpha: float, dt: float) -> np.ndarray:
    """exp(alpha*lambda_c*dt) = exp(-alpha*|k|^2*dt), f64, per mode."""
    return np.exp(alpha * lam_cont * dt)


def phi1_factors(lam_cont: np.ndarray, alpha: float, dt: float) -> np.ndarray:
    """ETD1 forcing coefficient (1 - exp(-alpha*|k|^2*dt)) / (alpha*|k|^2),
    with the k=0 mode set to dt exactly (phi_1(0) = 1).

    Uses expm1 for full precision at small alpha*|k|^2*dt; only the exact
    zero eigenvalue takes the special-case branch.
    """
    lam_pos = -alpha * lam_cont  # alpha*|k|^2 >= 0
    out = np.full_like(lam_pos, dt, dtype=np.float64)
    nz = lam_pos > 0.0
    out[nz] = -np.expm1(-lam_pos[nz] * dt) / lam_pos[nz]
    return out


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------


def spectral_step_hat(
    t_hat: np.ndarray,
    decay: np.ndarray,
    phi1: np.ndarray | None = None,
    s_hat: np.ndarray | None = None,
) -> np.ndarray:
    """One exact step in Fourier space: pure per-mode multiply (+ ETD1 forcing)."""
    out = t_hat * decay
    if s_hat is not None:
        if phi1 is None:
            raise ValueError("phi1 factors required when forcing is present")
        out = out + phi1 * s_hat
    return out


def spectral_step(
    t: np.ndarray,
    alpha: float,
    dt: float,
    lx: float = 1.0,
    ly: float = 1.0,
    source: np.ndarray | None = None,
) -> np.ndarray:
    """FFT -> per-mode multiply -> IFFT (convenience f64 path; tests and the
    gate re-run precompute the factor tables once and call spectral_step_hat)."""
    nx, ny = t.shape
    lam = continuous_laplacian_eigenvalues(nx, ny, lx, ly)
    decay = decay_factors(lam, alpha, dt)
    t_hat = np.fft.fft2(t)
    s_hat = np.fft.fft2(source) if source is not None else None
    phi1 = phi1_factors(lam, alpha, dt) if source is not None else None
    out_hat = spectral_step_hat(t_hat, decay, phi1, s_hat)
    return np.real(np.fft.ifft2(out_hat))


def parseval_rel_err(t: np.ndarray) -> float:
    """|sum|T|^2 - sum|That|^2/N| / sum|T|^2 — the FFT-normalization gate
    (machine-exact, <= 1e-13)."""
    t64 = t.astype(np.float64)
    spatial = float(np.sum(t64 * t64))
    t_hat = np.fft.fft2(t64)
    spectral = float(np.sum(np.abs(t_hat) ** 2)) / t64.size
    return abs(spatial - spectral) / spatial if spatial > 0 else 0.0


def mode_amplitude_sinsin(t_hat: np.ndarray, m: int, n: int) -> float:
    """Amplitude of the sin*sin product mode read from the complex spectrum.

    sin(2*pi*m*x)*sin(2*pi*n*y) = -(1/4)[e_(m,n) - e_(m,-n) - e_(-m,n) + e_(-m,-n)],
    so That[m, n] = -A*N^2/4 for a field A*sinsin; |That[m,n]|*4/N^2 = |A|.
    """
    nx, ny = t_hat.shape
    return float(np.abs(t_hat[m % nx, n % ny]) * 4.0 / (nx * ny))


__all__ = [
    "continuous_laplacian_eigenvalues",
    "decay_factors",
    "discrete_laplacian_eigenvalues",
    "mode_amplitude_sinsin",
    "parseval_rel_err",
    "phi1_factors",
    "spectral_step",
    "spectral_step_hat",
]
