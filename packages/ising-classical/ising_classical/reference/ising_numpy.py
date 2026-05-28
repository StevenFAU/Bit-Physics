"""NumPy reference — 2D Ising-classical lattice-spin sim.

Spec § 5.10 (`docs/architecture.md:1195`). The reference is a
Metropolis-Hastings Monte-Carlo evolution of an Ising spin field
``s in {-1, +1}`` on an ``n x n`` square lattice with periodic boundary
conditions, nearest-neighbour coupling ``J`` and (optional) external
field ``h``:

    H(s) = -J * sum_<ij> s_i s_j  -  h * sum_i s_i

The update is a **checkerboard (red/black) sublattice sweep**: all
"white" sites (parity ``(i+j) % 2 == 0``) are proposed-and-accepted in
parallel, then all "black" sites, using the Metropolis acceptance
``min(1, exp(-beta dE))`` with ``dE = 2 s_i (J * sum_neighbours + h)``.
Because no two same-colour sites are nearest neighbours, the parallel
update on one colour preserves detailed balance (Glauber dynamics on a
bipartite lattice). The black sweep recomputes the neighbour sum so it
sees the just-updated white sites. This mirrors the WGSL parallel-
Metropolis kernel (``packages/ising-classical/src/metropolis.wgsl``)
which runs the same checkerboard order with a PCG per-cell PRNG (no
atomics, no subgroup ops) -- the NumPy reference is the CI-visible
oracle (spec § 7.8: CI runners have no GPU, so the WGSL impl runs
locally only).

The ONLY randomness enters through ``numpy.random.default_rng(seed)``
(initial condition + per-sweep acceptance draws); every subsequent step
is deterministic given the seed, which is what makes the
``bit-exact-same-hw`` determinism claim hold.

Closed-form anchors (golden tables):

- Onsager 1944 critical temperature ``T_c = 2 / ln(1 + sqrt 2) ~
  2.269185`` (Phys. Rev. 65, 117).
- Yang 1952 spontaneous magnetization ``m(T) = (1 - sinh^-4(2 beta))^(1/8)``
  for ``T < T_c`` (Phys. Rev. 85, 808), with ``beta = 1/T`` and ``J = 1``.
- Kramers-Wannier 1941 duality ``sinh(2 beta_c) = 1`` (Phys. Rev. 60, 252).

Hand-derivation: ``tools/testkit/golden/derivations/ising-onsager.md``.
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Final

import numpy as np


@dataclass(frozen=True)
class IsingParams:
    """2D Ising parameter set.

    The canonical descriptor uses ``n = 128``, ``J = 1.0``, ``h = 0.0``,
    ``T = 2.27`` (~ T_c). Use :func:`canonical_params` to construct it.
    """

    n: int
    J: float
    h: float
    T: float


CANONICAL_DESCRIPTOR: Final[str] = "metropolis-128sq-T2.27-seed42-step10000"
CANONICAL_STEP_COUNT: Final[int] = 10000
CANONICAL_SEED: Final[int] = 42
CANONICAL_TEMPERATURE: Final[float] = 2.27


def canonical_params() -> IsingParams:
    """Return the spec-locked parameter set for the canonical capture."""
    return IsingParams(n=128, J=1.0, h=0.0, T=CANONICAL_TEMPERATURE)


def critical_temperature() -> float:
    """Onsager exact 2D critical temperature ``T_c = 2 / ln(1 + sqrt 2)`` (J=1)."""
    return 2.0 / float(np.log(1.0 + np.sqrt(2.0)))


def onsager_magnetization(temperature: float) -> float:
    """Yang 1952 spontaneous magnetization ``m(T)`` for ``T < T_c`` (J=1).

    ``m(T) = (1 - sinh^-4(2/T))^(1/8)`` for ``T < T_c``; ``0`` for
    ``T >= T_c`` (paramagnetic phase). ``sinh(2/T) = 1`` exactly at
    ``T = T_c``, so the bracket vanishes there and is negative above —
    the guard returns 0 in the disordered phase.
    """
    if temperature <= 0.0:
        return 1.0
    sinh_val = float(np.sinh(2.0 / temperature))
    bracket = 1.0 - sinh_val ** (-4)
    if bracket <= 0.0:
        return 0.0
    return float(bracket ** (1.0 / 8.0))


def initial_condition(p: IsingParams, seed: int) -> np.ndarray:
    """Build the deterministic seeded spin initial condition.

    Returns an ``(n, n)`` int8 array of ``+/-1`` spins drawn uniformly
    via ``numpy.random.default_rng(seed)``.
    """
    rng = np.random.default_rng(seed)
    bits = rng.integers(0, 2, size=(p.n, p.n), dtype=np.int8)
    return (2 * bits - 1).astype(np.int8)


def magnetization_per_spin(spins: np.ndarray) -> float:
    """Mean spin ``m = (1/N) sum s_i`` in ``[-1, 1]``."""
    return float(np.mean(spins.astype(np.float64)))


def energy_per_spin(spins: np.ndarray, p: IsingParams) -> float:
    """Energy per spin ``E/N`` for the 2D nearest-neighbour Ising H.

    ``E = -J sum_<ij> s_i s_j - h sum_i s_i`` over the ``2N`` bonds
    (each counted once via the +x and +y neighbour rolls). For ``J = 1``
    nearest-neighbour with ``h = 0``, ``E/N in [-2, 2]``.
    """
    s = spins.astype(np.float64)
    bonds = -p.J * (s * np.roll(s, -1, axis=0) + s * np.roll(s, -1, axis=1))
    field = -p.h * s
    return float((bonds.sum() + field.sum()) / s.size)


def metropolis_sweep(spins: np.ndarray, p: IsingParams, rng: np.random.Generator) -> np.ndarray:
    """One checkerboard Metropolis sweep (white sublattice, then black).

    Returns the updated ``(n, n)`` int8 spin array. Detailed balance is
    preserved per colour because same-colour sites are never nearest
    neighbours on a bipartite square lattice; the black sweep recomputes
    the neighbour field so it observes the just-updated white spins.
    """
    n = p.n
    beta = 1.0 / p.T
    s = spins.astype(np.int8, copy=True)
    ii, jj = np.indices((n, n))
    parity = (ii + jj) % 2
    for colour in (0, 1):
        neighbour_sum = (
            np.roll(s, 1, axis=0).astype(np.float64)
            + np.roll(s, -1, axis=0)
            + np.roll(s, 1, axis=1)
            + np.roll(s, -1, axis=1)
        )
        delta_e = 2.0 * s.astype(np.float64) * (p.J * neighbour_sum + p.h)
        draws = rng.random((n, n))
        accept = (parity == colour) & (draws < np.exp(-beta * delta_e))
        s = np.where(accept, -s, s).astype(np.int8)
    return s


def evolve(
    p: IsingParams,
    seed: int,
    n_steps: int,
    *,
    capture_interval: int = 1000,
) -> Iterator[tuple[int, np.ndarray]]:
    """Yield ``(step_index, spins)`` at step 0 and every ``capture_interval``.

    Always yields the final step regardless of ``capture_interval``. The
    acceptance RNG is a single ``default_rng(seed)`` stream threaded
    across every sweep (so the whole trajectory is reproducible from the
    seed).
    """
    if n_steps < 0:
        raise ValueError(f"n_steps must be non-negative; got {n_steps!r}")
    if capture_interval < 1:
        raise ValueError(f"capture_interval must be >= 1; got {capture_interval!r}")
    spins = initial_condition(p, seed)
    rng = np.random.default_rng(seed + 1)  # distinct stream from the IC draw
    yield 0, spins.copy()
    for i in range(1, n_steps + 1):
        spins = metropolis_sweep(spins, p, rng)
        if i % capture_interval == 0 or i == n_steps:
            yield i, spins.copy()
