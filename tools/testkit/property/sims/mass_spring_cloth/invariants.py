"""mass-spring-cloth PBT invariants (shared module form).

Charter D-PBT (operator-ratified): the two declared invariants (≥2 per spec
§2.14) are verified POST-HOC on captures the C++ sim emits — Hypothesis
generates IC params → subprocess the C++ capture binary → read the ``.h5`` →
assert these predicates (the cross-language wiring lives in
``packages/mass-spring-cloth/tests/python/test_pbt_invariants.py``). This shared
module hosts the canonical predicate forms so the Stage-2 landing audit can route
a single declaration.

- :func:`length_bounded_above_invariant` — valid for ANY IC: no structural/shear
  (stretch) spring exceeds ``rest * (1 + max_stretch_ratio)`` at any captured
  step. An XPBD compliant solver keeps springs near rest; a runaway/exploding
  solve violates this.
- :func:`momentum_conservation_free_no_gravity_invariant` — RE-DECLARED (charter
  D-PBT): linear momentum is conserved only for a FREE (unpinned) cloth with
  gravity disabled and no external force — the internal XPBD constraint
  corrections are equal-and-opposite (corr_a = +w_a*dlambda*n, corr_b = -w_b*dlambda*n), so
  for uniform mass the centre-of-mass velocity (∝ total momentum) is constant. A
  corner-pinned cloth does NOT conserve linear momentum (the pins supply force).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def grid_stretch_edges(nx: int, ny: int) -> list[tuple[int, int, float]]:
    """Structural + shear edges (the stretch springs) of an nxxny grid, with
    rest length in units of `spacing` (1.0 structural, sqrt(2) shear)."""
    edges: list[tuple[int, int, float]] = []

    def idx(i: int, j: int) -> int:
        return j * nx + i

    for j in range(ny):
        for i in range(nx):
            if i + 1 < nx:
                edges.append((idx(i, j), idx(i + 1, j), 1.0))
            if j + 1 < ny:
                edges.append((idx(i, j), idx(i, j + 1), 1.0))
    sqrt2 = float(np.sqrt(2.0))
    for j in range(ny - 1):
        for i in range(nx - 1):
            edges.append((idx(i, j), idx(i + 1, j + 1), sqrt2))
            edges.append((idx(i + 1, j), idx(i, j + 1), sqrt2))
    return edges


def length_bounded_above_invariant(
    positions_seq: NDArray[np.floating],
    edges: list[tuple[int, int, float]],
    spacing: float,
    *,
    max_stretch_ratio: float = 0.5,
) -> bool:
    """No stretch spring exceeds ``rest*(1+max_stretch_ratio)`` at any step.

    ``positions_seq`` shape: (n_steps, N, 3).
    """
    positions_seq = np.asarray(positions_seq, dtype=np.float64)
    for step in positions_seq:
        for a, b, rest_units in edges:
            rest = rest_units * spacing
            d = float(np.linalg.norm(step[a] - step[b]))
            if d > rest * (1.0 + max_stretch_ratio):
                return False
    return True


def momentum_conservation_free_no_gravity_invariant(
    velocities_seq: NDArray[np.floating],
    particle_mass: float,
    *,
    atol: float = 1e-9,
) -> bool:
    """Total linear momentum ``sum  mᵢ vᵢ`` is constant over the run (free cloth).

    ``velocities_seq`` shape: (n_steps, N, 3). Uniform ``particle_mass``.
    """
    velocities_seq = np.asarray(velocities_seq, dtype=np.float64)
    momenta = particle_mass * velocities_seq.sum(axis=1)  # (n_steps, 3)
    drift = float(np.max(np.abs(momenta - momenta[0])))
    return bool(drift <= atol)


__all__ = [
    "grid_stretch_edges",
    "length_bounded_above_invariant",
    "momentum_conservation_free_no_gravity_invariant",
]
