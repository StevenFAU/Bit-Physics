"""f64 NumPy reference — FTCS explicit stencil + analytic fixtures.

The FTCS update (spec-ref.md § 3.1) is forward-time centered-space on a
uniform grid:

    T'[i,j] = T[i,j] + r_x*(T[i+1,j] - 2 T[i,j] + T[i-1,j])
                     + r_y*(T[i,j+1] - 2 T[i,j] + T[i,j-1]) + dt*S[i,j]

with r_x = alpha*dt/dx^2, r_y = alpha*dt/dy^2 and the von Neumann bound
r_x + r_y <= 1/2. All steppers are dtype-preserving so the same code runs
the f64 gates AND the f32 WGSL-proxy tolerance measurement (the
schrodinger-smoke complex64-proxy pattern).

Grid convention: nodes at x_i = i*dx on [0, L) — the DFT sampling the
spectral path (spectral.py) shares, so both solvers evolve the same field.

Analytic fixtures (spec-ref.md § 4): Fourier eigenmode + discrete
amplification, Gaussian heat kernel, 2D MMS, erfc/product-form bounded
block, and the Rosenthal THIN-PLATE (K0) moving source — the 2D form; the
3D thick-plate formula solves a different equation and is recorded only as
the wrong-dimension counterexample (v0.3 correction, spec-ref.md § 4.6).
"""

from __future__ import annotations

import numpy as np
from scipy.special import erfc as _erfc
from scipy.special import k0 as _k0

# ---------------------------------------------------------------------------
# Grid + stability
# ---------------------------------------------------------------------------


def grid_coords(
    nx: int, ny: int, lx: float = 1.0, ly: float = 1.0
) -> tuple[np.ndarray, np.ndarray]:
    """DFT-sampled node coordinates x_i = i*dx (shape (nx, ny), indexing ij)."""
    x = np.arange(nx, dtype=np.float64) * (lx / nx)
    y = np.arange(ny, dtype=np.float64) * (ly / ny)
    return np.meshgrid(x, y, indexing="ij")


def stability_bound_dt(alpha: float, dx: float, dy: float) -> float:
    """The exact von Neumann limit dt_max = 1 / (2*alpha*(1/dx^2 + 1/dy^2))."""
    return 1.0 / (2.0 * alpha * (1.0 / dx**2 + 1.0 / dy**2))


def stability_margin(alpha: float, dt: float, dx: float, dy: float) -> float:
    """1/2 - (r_x + r_y): positive iff the FTCS step is von-Neumann stable."""
    return 0.5 - (alpha * dt / dx**2 + alpha * dt / dy**2)


# ---------------------------------------------------------------------------
# FTCS steppers (dtype-preserving; periodic / Dirichlet / material)
# ---------------------------------------------------------------------------


def ftcs_step(
    t: np.ndarray,
    alpha: float,
    dt: float,
    dx: float,
    dy: float,
    source: np.ndarray | None = None,
) -> np.ndarray:
    """One periodic FTCS step (canonical gate path).

    Arithmetic is carried out in the dtype of ``t`` (f64 reference / f32
    WGSL proxy). Coefficients are cast so an f32 run is a faithful proxy of
    the WGSL kernel's arithmetic.
    """
    dtype = t.dtype
    rx = np.asarray(alpha * dt / (dx * dx), dtype=dtype)
    ry = np.asarray(alpha * dt / (dy * dy), dtype=dtype)
    lap = rx * (np.roll(t, -1, axis=0) - 2.0 * t + np.roll(t, 1, axis=0)) + ry * (
        np.roll(t, -1, axis=1) - 2.0 * t + np.roll(t, 1, axis=1)
    )
    out = t + lap
    if source is not None:
        out = out + np.asarray(dt, dtype=dtype) * source.astype(dtype, copy=False)
    return out


def ftcs_step_dirichlet(
    t: np.ndarray,
    alpha: float,
    dt: float,
    dx: float,
    dy: float,
    wall_value: float,
    source: np.ndarray | None = None,
) -> np.ndarray:
    """One FTCS step with fixed-temperature (Dirichlet) walls.

    Ghost cells hold ``wall_value``; boundary NODES are re-pinned to the wall
    value after the interior update (the plate-template convention the
    erfc/product golden samples, spec-ref.md § 4.5).
    """
    dtype = t.dtype
    padded = np.pad(
        t, 1, mode="constant", constant_values=np.asarray(wall_value, dtype=dtype)
    )
    rx = np.asarray(alpha * dt / (dx * dx), dtype=dtype)
    ry = np.asarray(alpha * dt / (dy * dy), dtype=dtype)
    lap = rx * (padded[2:, 1:-1] - 2.0 * t + padded[:-2, 1:-1]) + ry * (
        padded[1:-1, 2:] - 2.0 * t + padded[1:-1, :-2]
    )
    out = t + lap
    if source is not None:
        out = out + np.asarray(dt, dtype=dtype) * source.astype(dtype, copy=False)
    out[0, :] = wall_value
    out[-1, :] = wall_value
    out[:, 0] = wall_value
    out[:, -1] = wall_value
    return out


def material_flux_step(
    t: np.ndarray,
    alpha_cell: np.ndarray,
    dt: float,
    dx: float,
    dy: float,
    source: np.ndarray | None = None,
    eps: float = 1e-30,
) -> np.ndarray:
    """Conservative face-flux FTCS step with harmonic-mean face diffusivity
    (spec-ref.md § 3.4). Periodic BCs. A uniform ``alpha_cell`` buffer must
    reproduce ``ftcs_step`` bit-for-bit — asserted by the equivalence test.
    """
    dtype = t.dtype
    a = alpha_cell.astype(dtype, copy=False)
    # Face diffusivity: harmonic mean of the two adjacent cells.
    ax_p = 2.0 * a * np.roll(a, -1, axis=0) / (a + np.roll(a, -1, axis=0) + eps)
    ay_p = 2.0 * a * np.roll(a, -1, axis=1) / (a + np.roll(a, -1, axis=1) + eps)
    # F^x_{i+1/2} = alpha_{i+1/2} * (T[i+1] - T[i]) / dx  (and same in y).
    fx_p = ax_p * (np.roll(t, -1, axis=0) - t) / np.asarray(dx, dtype=dtype)
    fy_p = ay_p * (np.roll(t, -1, axis=1) - t) / np.asarray(dy, dtype=dtype)
    div = (fx_p - np.roll(fx_p, 1, axis=0)) / np.asarray(dx, dtype=dtype) + (
        fy_p - np.roll(fy_p, 1, axis=1)
    ) / np.asarray(dy, dtype=dtype)
    out = t + np.asarray(dt, dtype=dtype) * div
    if source is not None:
        out = out + np.asarray(dt, dtype=dtype) * source.astype(dtype, copy=False)
    return out


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------


def total_heat(t: np.ndarray, dx: float, dy: float) -> float:
    """Sum(T) * dx * dy — the conserved 'mass' for periodic no-source runs."""
    return float(np.sum(t, dtype=np.float64)) * dx * dy


def l2_norm(t: np.ndarray, dx: float, dy: float) -> float:
    """sqrt(Sum(T^2) * dx * dy) — non-increasing for zero-mean periodic
    no-source diffusion (used with the mean removed; the k=0 mode is
    conserved, not damped)."""
    return float(np.sqrt(np.sum(np.square(t, dtype=np.float64)) * dx * dy))


def sinsin_amplitude(
    t: np.ndarray, m: int, n: int, lx: float = 1.0, ly: float = 1.0
) -> float:
    """Amplitude of the sin(2*pi*m*x/Lx)*sin(2*pi*n*y/Ly) eigenmode.

    DFT-sampled discrete orthogonality gives sum(sin^2) = N/2 exactly for
    0 < m < N/2, so the projection is amp = (4/(Nx*Ny)) * <T, sinsin>.
    """
    nx, ny = t.shape
    x, y = grid_coords(nx, ny, lx, ly)
    basis = np.sin(2.0 * np.pi * m * x / lx) * np.sin(2.0 * np.pi * n * y / ly)
    return float(4.0 / (nx * ny) * np.sum(t.astype(np.float64) * basis))


# ---------------------------------------------------------------------------
# Analytic fixtures (spec-ref.md § 4)
# ---------------------------------------------------------------------------


def fourier_mode(
    nx: int, ny: int, m: int, n: int, lx: float = 1.0, ly: float = 1.0
) -> np.ndarray:
    """sin(2*pi*m*x/Lx) * sin(2*pi*n*y/Ly) sampled on the DFT nodes."""
    x, y = grid_coords(nx, ny, lx, ly)
    return np.sin(2.0 * np.pi * m * x / lx) * np.sin(2.0 * np.pi * n * y / ly)


def continuous_decay(
    alpha: float, m: int, n: int, t: float, lx: float = 1.0, ly: float = 1.0
) -> float:
    """exp(-alpha*|k|^2*t) with k = 2*pi*(m/Lx, n/Ly) — the SPECTRAL golden."""
    k2 = (2.0 * np.pi * m / lx) ** 2 + (2.0 * np.pi * n / ly) ** 2
    return float(np.exp(-alpha * k2 * t))


def discrete_amplification(
    alpha: float, dt: float, dx: float, dy: float, m: int, n: int, nx: int, ny: int
) -> float:
    """g_h = 1 + alpha*dt*lambda_h for the 5-point stencil — the FTCS golden.

    lambda_h = -(4/dx^2) sin^2(pi*m/Nx) - (4/dy^2) sin^2(pi*n/Ny).
    After N steps the measured eigenmode amplitude is g_h**N (two-spectra
    rule: NEVER compare an FTCS run against the continuous decay).
    """
    lam_h = (
        -(4.0 / dx**2) * np.sin(np.pi * m / nx) ** 2
        - (4.0 / dy**2) * np.sin(np.pi * n / ny) ** 2
    )
    return float(1.0 + alpha * dt * lam_h)


def gaussian_at_time(
    x: np.ndarray,
    y: np.ndarray,
    t: float,
    alpha: float,
    sigma0: float,
    amplitude: float = 1.0,
    center: tuple[float, float] = (0.5, 0.5),
) -> np.ndarray:
    """2D free-space heat-kernel evolution of a Gaussian hot spot.

    IC A*exp(-r^2/(2*sigma0^2)) evolves to A*(sigma0^2/sigma_t^2) *
    exp(-r^2/(2*sigma_t^2)) with sigma_t^2 = sigma0^2 + 2*alpha*t (the
    common-ts ``gaussianAtTime`` closed form; valid while sigma << L so the
    periodic images stay below the tolerance floor, spec-ref.md § 4.3).
    """
    sig2 = sigma0 * sigma0 + 2.0 * alpha * t
    r2 = (x - center[0]) ** 2 + (y - center[1]) ** 2
    return amplitude * (sigma0 * sigma0 / sig2) * np.exp(-r2 / (2.0 * sig2))


def mms_solution(
    x: np.ndarray, y: np.ndarray, t: float, lx: float = 1.0, ly: float = 1.0
) -> np.ndarray:
    """Manufactured T(x,y,t) = sin(2*pi*x/Lx) * sin(2*pi*y/Ly) * cos(t)."""
    return np.sin(2.0 * np.pi * x / lx) * np.sin(2.0 * np.pi * y / ly) * np.cos(t)


def mms_source(
    x: np.ndarray,
    y: np.ndarray,
    t: float,
    alpha: float,
    lx: float = 1.0,
    ly: float = 1.0,
) -> np.ndarray:
    """Manufactured source S = T_t - alpha*(T_xx + T_yy) for the § 4.4 solution:

    S = sin(2*pi*x/Lx)*sin(2*pi*y/Ly) * [alpha*((2*pi/Lx)^2 + (2*pi/Ly)^2)*cos(t) - sin(t)]
    """
    k2 = (2.0 * np.pi / lx) ** 2 + (2.0 * np.pi / ly) ** 2
    amp = alpha * k2 * float(np.cos(t)) - float(np.sin(t))
    return np.sin(2.0 * np.pi * x / lx) * np.sin(2.0 * np.pi * y / ly) * amp


def erfc_semi_infinite(x_dimless: np.ndarray, t_fourier: float) -> np.ndarray:
    """Accomplished ratio T_d = erfc(x' / (2*sqrt(t_d))) for the suddenly-heated
    semi-infinite solid (spec-ref.md § 4.5)."""
    return np.asarray(_erfc(np.asarray(x_dimless) / (2.0 * np.sqrt(t_fourier))))


def slab_unaccomplished(x_d: np.ndarray, t_d: float, terms: int = 64) -> np.ndarray:
    """Unaccomplished (deficit) ratio theta = (T - T_s)/(T_i - T_s) for the
    symmetric slab |x_d| <= 1 (half-thickness = 1) with both surfaces stepped
    to T_s at t=0:

        theta = sum_n [4*(-1)^(n+1) / ((2n-1)*pi)]
                * exp(-((2n-1)*pi/2)^2 * t_d) * cos((2n-1)*pi*x_d/2)

    Converges fast for moderate/large t_d (each mode decays as exp(-k^2 t_d));
    the erfc similarity solution covers small t_d (spec-ref.md § 4.5).
    """
    x_arr = np.asarray(x_d, dtype=np.float64)
    theta = np.zeros_like(x_arr)
    for i in range(1, terms + 1):
        zeta = (2 * i - 1) * np.pi / 2.0
        coeff = 4.0 * (-1.0) ** (i + 1) / ((2 * i - 1) * np.pi)
        theta = theta + coeff * np.exp(-zeta * zeta * t_d) * np.cos(zeta * x_arr)
    return theta


def product_block_accomplished(
    x_d: np.ndarray, y_d: np.ndarray, t_dx: float, t_dy: float, terms: int = 64
) -> np.ndarray:
    """2D bounded-block accomplished ratio via the product rule
    (sign convention pinned, spec-ref.md § 4.5): the UNACCOMPLISHED ratio
    factorizes, theta_2D = theta_x * theta_y, so

        T_d = 1 - (1 - T_d,x)(1 - T_d,y) = 1 - theta_x * theta_y.

    Valid for uniform T_i, the same step BC on every exposed face pair, no
    generation, constant properties (Crank 1975 p. 25).
    """
    theta_x = slab_unaccomplished(x_d, t_dx, terms)
    theta_y = slab_unaccomplished(y_d, t_dy, terms)
    return 1.0 - theta_x * theta_y


def rosenthal_thin_plate(
    w: np.ndarray,
    y: np.ndarray,
    q: float,
    conductivity: float,
    thickness: float,
    speed: float,
    kappa: float,
    t0: float = 0.0,
) -> np.ndarray:
    """Rosenthal THIN-PLATE (2D) moving line source, steady state in the
    moving frame (spec-ref.md § 4.6, v0.3 correction):

        T = T0 + q/(2*pi*conductivity*thickness)
               * exp(-speed*w/(2*kappa)) * K0(speed*r/(2*kappa))

    w = x - U*t (along travel), r = sqrt(w^2 + y^2). K0 is log-singular at
    the source: golden comparisons sample probe lines/annuli EXCLUDING the
    source core. The 3D thick-plate form P/(2*pi*conductivity*R)*exp(...)
    solves the 3D equation — a 2D grid can never converge to it (recorded as
    the wrong-dimension counterexample in the golden derivation).
    """
    r = np.hypot(w, y)
    u_over_2k = speed / (2.0 * kappa)
    return t0 + q / (2.0 * np.pi * conductivity * thickness) * np.exp(
        -u_over_2k * w
    ) * np.asarray(_k0(u_over_2k * r))


__all__ = [
    "continuous_decay",
    "discrete_amplification",
    "erfc_semi_infinite",
    "fourier_mode",
    "ftcs_step",
    "ftcs_step_dirichlet",
    "gaussian_at_time",
    "grid_coords",
    "l2_norm",
    "material_flux_step",
    "mms_solution",
    "mms_source",
    "product_block_accomplished",
    "rosenthal_thin_plate",
    "sinsin_amplitude",
    "slab_unaccomplished",
    "stability_bound_dt",
    "stability_margin",
    "total_heat",
]
