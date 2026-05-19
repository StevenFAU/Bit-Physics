"""Minimal NumPy FTCS solver for the 1D heat equation with periodic BCs.

Forward-Euler in time (formal temporal order 1); centered second differences
in space (formal spatial order 2). Periodic BCs implemented via `np.roll`.

CFL: `dt = c * dx^2 / D` with `c < 0.5`. The runner picks `c = 0.25` so that
temporal truncation does not dominate spatial truncation at the resolutions
used; the analyzer's observed-order fit is then driven by the spatial term.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray


def ftcs_step(
    u: NDArray[np.float64],
    dt: float,
    dx: float,
    D: float,
    source: NDArray[np.float64],
) -> NDArray[np.float64]:
    """Advance u by one FTCS step in time.

    Args:
        u: current state, shape (N,), periodic.
        dt: time step.
        dx: spatial grid spacing.
        D: diffusivity.
        source: manufactured source S(x, t_n) sampled at the current time.

    Returns:
        Next-step state, shape (N,).
    """
    laplacian = (np.roll(u, -1) - 2.0 * u + np.roll(u, 1)) / (dx * dx)
    result: NDArray[np.float64] = u + dt * (D * laplacian + source)
    return result


def run_heat_1d_ftcs(
    N: int,
    L: float,
    D: float,
    t_final: float,
    cfl: float,
    initial_condition: Callable[[NDArray[np.float64]], NDArray[np.float64]],
    source_fn: Callable[[NDArray[np.float64], float], NDArray[np.float64]],
) -> tuple[NDArray[np.float64], NDArray[np.float64], float]:
    """Run FTCS on a periodic mesh of `N` cells and return (x, u_final, t_final_actual).

    The mesh is a cell-centered grid: x_i = (i + 0.5) * dx, i = 0..N-1. Periodic
    BCs mean opposite-end ghosts wrap. The integrator picks `dt = cfl * dx^2 / D`
    and advances until simulated time first reaches or exceeds `t_final`; the
    final step is clamped so `t_final` is hit exactly (subject to floating-point
    rounding).
    """
    if cfl >= 0.5:
        raise ValueError(f"cfl must be < 0.5 for stability, got {cfl}")
    dx = L / N
    x = (np.arange(N, dtype=np.float64) + 0.5) * dx
    u = initial_condition(x).astype(np.float64, copy=True)
    dt_full = cfl * dx * dx / D
    t = 0.0
    while t < t_final:
        dt = min(dt_full, t_final - t)
        s = source_fn(x, t)
        u = ftcs_step(u, dt, dx, D, s)
        t += dt
    return x, u, t
