"""NumPy reference — Gray-Scott reaction-diffusion 2D.

Spec § 5.2.1. The reference scheme is explicit forward Euler with a
5-point Laplacian and periodic boundary conditions:

    U_{t+dt} = U + dt * (Du * laplacian(U) - U*V*V + F * (1 - U))
    V_{t+dt} = V + dt * (Dv * laplacian(V) + U*V*V - (F + k) * V)

The "lambda" pattern lives at the canonical parameters F = 0.0367,
k = 0.0649 (Pearson 1993 classification, λ region).

The initial condition is a deterministic, seeded perturbation: U is
nearly 1 everywhere, V is nearly 0 with a localized seed at the centre
plus a small uniform-random perturbation drawn from
``numpy.random.default_rng(seed)``. The IC is the ONLY place a random
draw enters; every subsequent step is deterministic, which is what
makes the determinism harness's bit-exact-same-hw claim hold.

The derivation + numerical stability analysis is at
``docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md``.
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Final

import numpy as np


@dataclass(frozen=True)
class GrayScottParams:
    """Gray-Scott parameter set.

    The lambda canonical seed corresponds to ``F = 0.0367, k = 0.0649,
    Du = 0.16, Dv = 0.08, dx = 1.0, dt = 1.0, n = 128``. Use
    :func:`canonical_params` to construct it.
    """

    n: int
    Du: float
    Dv: float
    F: float
    k: float
    dx: float
    dt: float


CANONICAL_DESCRIPTOR: Final[str] = "gray-scott-lambda-128sq-seed42-step2000"
CANONICAL_STEP_COUNT: Final[int] = 2000
CANONICAL_SEED: Final[int] = 42


def canonical_params() -> GrayScottParams:
    """Return the spec-locked parameter set for the canonical capture."""
    return GrayScottParams(
        n=128,
        Du=0.16,
        Dv=0.08,
        F=0.0367,
        k=0.0649,
        dx=1.0,
        dt=1.0,
    )


def initial_condition(p: GrayScottParams, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Build the deterministic seeded initial condition.

    Returns ``(U, V)`` arrays of shape ``(n, n)`` dtype ``float64``.

    The IC is the spec-standard "U≈1, V≈0 with a centred V-perturbation".
    A small uniform perturbation seeded by ``numpy.random.default_rng(seed)``
    is added so that the determinism harness has something seed-dependent
    to verify while the rest of the run remains analytically reproducible.
    """
    rng = np.random.default_rng(seed)
    u = np.ones((p.n, p.n), dtype=np.float64)
    v = np.zeros((p.n, p.n), dtype=np.float64)
    # Centred V-seed: 10-cell square at value 1.0 in V and 0.5 in U.
    half = p.n // 2
    seed_size = max(4, p.n // 16)
    lo = half - seed_size
    hi = half + seed_size
    u[lo:hi, lo:hi] = 0.5
    v[lo:hi, lo:hi] = 0.25
    # Tiny seeded perturbation so determinism harness exercises a real
    # IC dependency on `seed`.
    noise = rng.uniform(-1e-3, 1e-3, size=(p.n, p.n))
    u = u + noise
    v = v + np.roll(noise, 1, axis=0)
    np.clip(u, 0.0, 1.0, out=u)
    np.clip(v, 0.0, 1.0, out=v)
    return u, v


def _laplacian(field: np.ndarray) -> np.ndarray:
    """5-point Laplacian with periodic BCs (dx is folded in by caller)."""
    out: np.ndarray = (
        np.roll(field, +1, axis=0)
        + np.roll(field, -1, axis=0)
        + np.roll(field, +1, axis=1)
        + np.roll(field, -1, axis=1)
        - 4.0 * field
    )
    return out


def step(u: np.ndarray, v: np.ndarray, p: GrayScottParams) -> tuple[np.ndarray, np.ndarray]:
    """One forward-Euler Gray-Scott update; returns new (U, V)."""
    lap_u = _laplacian(u) / (p.dx * p.dx)
    lap_v = _laplacian(v) / (p.dx * p.dx)
    uvv = u * v * v
    du_dt = p.Du * lap_u - uvv + p.F * (1.0 - u)
    dv_dt = p.Dv * lap_v + uvv - (p.F + p.k) * v
    u_next = u + p.dt * du_dt
    v_next = v + p.dt * dv_dt
    return u_next, v_next


def evolve(
    p: GrayScottParams,
    seed: int,
    n_steps: int,
    *,
    capture_interval: int = 100,
) -> Iterator[tuple[int, np.ndarray, np.ndarray]]:
    """Yield ``(step_index, U, V)`` at step 0 and every ``capture_interval`` thereafter.

    Always yields the final step regardless of `capture_interval`.
    """
    if n_steps < 0:
        raise ValueError(f"n_steps must be non-negative; got {n_steps!r}")
    if capture_interval < 1:
        raise ValueError(f"capture_interval must be >= 1; got {capture_interval!r}")
    u, v = initial_condition(p, seed)
    yield 0, u.copy(), v.copy()
    for i in range(1, n_steps + 1):
        u, v = step(u, v, p)
        if i % capture_interval == 0 or i == n_steps:
            yield i, u.copy(), v.copy()
