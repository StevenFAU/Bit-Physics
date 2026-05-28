"""NumPy reference — 2D Ising-classical lattice-spin sim.

Spec § 5.10 (`docs/architecture.md:1195`). The reference is a
Metropolis-Hastings Monte-Carlo evolution of an Ising spin field
``s ∈ {-1, +1}`` on an ``n x n`` square lattice with periodic boundary
conditions, nearest-neighbour coupling ``J`` and (optional) external
field ``h``:

    H(s) = -J · Σ_<ij> s_i s_j  -  h · Σ_i s_i

The update is a **checkerboard (red/black) sublattice sweep**: all
"white" sites are proposed-and-accepted in parallel, then all "black"
sites, using the Metropolis acceptance ``min(1, exp(-β ΔE))``. Because
no two same-colour sites are nearest neighbours, the parallel update on
one colour preserves detailed balance (Glauber dynamics on a bipartite
lattice). This mirrors the WGSL parallel-Metropolis kernel
(``packages/ising-classical/src/metropolis.wgsl``) which runs the same
checkerboard order with a PCG per-cell PRNG (no atomics, no subgroup
ops) — the NumPy reference is the CI-visible oracle (spec §7.8: CI
runners have no GPU, so the WGSL impl runs locally only).

The ONLY randomness enters through ``numpy.random.default_rng(seed)``
(initial condition + per-sweep acceptance draws); every subsequent step
is deterministic given the seed, which is what makes the
``bit-exact-same-hw`` determinism claim hold.

Closed-form anchors (Stage-1b golden tables):

- Onsager 1944 critical temperature ``T_c = 2 / ln(1 + √2) ≈ 2.269185``
  (Phys. Rev. 65, 117).
- Yang 1952 spontaneous magnetization ``m(T) = (1 - sinh⁻⁴(2β))^(1/8)``
  for ``T < T_c`` (Phys. Rev. 85, 808), with ``β = 1/T`` and ``J = 1``.
- Kramers-Wannier 1941 duality ``sinh(2β_c) = 1`` (Phys. Rev. 60, 252).

Hand-derivation: ``tools/testkit/golden/derivations/ising-onsager.md``.

**Stage 1a posture:** every implementation function raises
``NotImplementedError("Stage 1b")``. The dataclass + canonical
constants exist so the RED tests collect (no collection error); they
fail with ``NotImplementedError`` until Stage 1b inverts to GREEN.
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
    ``T = 2.27`` (≈ T_c). Use :func:`canonical_params` to construct it.
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
    """Onsager exact 2D critical temperature ``T_c = 2 / ln(1 + √2)`` (J=1)."""
    raise NotImplementedError("Stage 1b")


def onsager_magnetization(temperature: float) -> float:
    """Yang 1952 spontaneous magnetization ``m(T)`` for ``T < T_c`` (J=1).

    Returns 0.0 for ``T >= T_c`` (paramagnetic phase).
    """
    raise NotImplementedError("Stage 1b")


def initial_condition(p: IsingParams, seed: int) -> np.ndarray:
    """Build the deterministic seeded spin initial condition.

    Returns an ``(n, n)`` int8 array of ``±1`` spins.
    """
    raise NotImplementedError("Stage 1b")


def magnetization_per_spin(spins: np.ndarray) -> float:
    """Mean spin ``m = (1/N) Σ s_i ∈ [-1, 1]``."""
    raise NotImplementedError("Stage 1b")


def energy_per_spin(spins: np.ndarray, p: IsingParams) -> float:
    """Energy per spin ``E/N`` for the 2D nearest-neighbour Ising H.

    For ``J = 1`` nearest-neighbour (2N bonds), ``E/N ∈ [-2, 2]``.
    """
    raise NotImplementedError("Stage 1b")


def metropolis_sweep(spins: np.ndarray, p: IsingParams, rng: np.random.Generator) -> np.ndarray:
    """One checkerboard Metropolis sweep (white sublattice, then black).

    Returns the updated ``(n, n)`` int8 spin array. Detailed balance is
    preserved per colour because same-colour sites are never nearest
    neighbours on a bipartite square lattice.
    """
    raise NotImplementedError("Stage 1b")


def evolve(
    p: IsingParams,
    seed: int,
    n_steps: int,
    *,
    capture_interval: int = 1000,
) -> Iterator[tuple[int, np.ndarray]]:
    """Yield ``(step_index, spins)`` at step 0 and every ``capture_interval``.

    Always yields the final step regardless of ``capture_interval``.
    """
    raise NotImplementedError("Stage 1b")
