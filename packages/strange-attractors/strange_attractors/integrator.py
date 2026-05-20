"""Classical 4th-order Runge-Kutta fixed-step integrator.

Per spec § 3 / spec-ref.md § 3 ("classical RK4, fixed step"). The
integrator has no atomic ops, no subgroup ops, no FP reductions —
hence the spec-pinned ``bit-exact-same-hw`` determinism claim
(see ``docs/sim-specs/closed-form/strange-attractors/determinism.md``).
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np


def rk4_step(
    field: Callable[[np.ndarray], np.ndarray],
    state: np.ndarray,
    dt: float,
) -> np.ndarray:
    """One classical RK4 step. ``field`` is a pure (state) -> dstate map."""
    k1 = field(state)
    k2 = field(state + 0.5 * dt * k1)
    k3 = field(state + 0.5 * dt * k2)
    k4 = field(state + dt * k3)
    return state + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


def rk4_evolve(
    field: Callable[[np.ndarray], np.ndarray],
    initial_state: np.ndarray,
    *,
    dt: float,
    n_steps: int,
    capture_interval: int = 1,
) -> np.ndarray:
    """Evolve ``initial_state`` under ``field`` via RK4 for ``n_steps``.

    Returns an ``(n_captures, dim)`` array of states recorded at indices
    ``0, capture_interval, 2 * capture_interval, ...``; the final step
    is always included. ``capture_interval = 1`` records every step.
    """
    state = np.asarray(initial_state, dtype=np.float64).copy()
    out: list[np.ndarray] = [state.copy()]
    for i in range(1, n_steps + 1):
        state = rk4_step(field, state, dt)
        if i % capture_interval == 0 or i == n_steps:
            out.append(state.copy())
    return np.stack(out, axis=0)
