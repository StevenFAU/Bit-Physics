"""Deliberately-broken solver: first-order forward difference for u_xx.

The "broken" Laplacian approximation
    u_xx ~ (u[i+1] - u[i]) / dx
is first-order (formally O(dx)), not second-order. The analyzer's observed
order on this solver collapses to roughly 1.0, which is outside the +/- 0.5
band around the FTCS scheme's formal spatial order (2). The negative test
asserts the analyzer rejects this solver.

This is intentional: per spec § 9.4 Category 6 (test-design fabrication), we
need a negative test that fails for the asserted reason. A first-order
spatial term is the cleanest forcing function for that.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray


def broken_first_order_step(
    u: NDArray[np.float64],
    dt: float,
    dx: float,
    D: float,
    source: NDArray[np.float64],
) -> NDArray[np.float64]:
    """One step using a first-order forward difference in place of u_xx."""
    pseudo_laplacian = (np.roll(u, -1) - u) / dx
    result: NDArray[np.float64] = u + dt * (D * pseudo_laplacian + source)
    return result


def run_heat_1d_broken(
    N: int,
    L: float,
    D: float,
    t_final: float,
    cfl: float,
    initial_condition: Callable[[NDArray[np.float64]], NDArray[np.float64]],
    source_fn: Callable[[NDArray[np.float64], float], NDArray[np.float64]],
) -> tuple[NDArray[np.float64], NDArray[np.float64], float]:
    """Same call signature as `run_heat_1d_ftcs` but uses the broken step.

    NOTE: this solver is unconditionally unstable for the pure heat equation
    because the forward-difference operator is non-self-adjoint; in MMS we
    keep the simulated time small (matches the runner) so the integrator's
    output is finite and the analyzer can fit its observed order. A larger
    `t_final` would simply blow up before the analyzer ran.
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
        u = broken_first_order_step(u, dt, dx, D, s)
        t += dt
    return x, u, t
