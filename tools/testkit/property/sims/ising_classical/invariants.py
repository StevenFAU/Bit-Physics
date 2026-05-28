"""Ising-classical PBT invariants (shared module form for per-sim consumption).

The in-package witness tests at
``packages/ising-classical/tests/test_pbt_invariants.py`` exercise these
invariants on seed-sampled short runs via the testkit property harness;
this shared module hosts the canonical predicate forms so downstream
consumers (and the Stage-2 landing audit) can route a single
declaration. Mirrors ``tools/testkit/property/sims/lenia/invariants.py``.

Both invariants are mathematically pristine for Ising spins (charter
§ 5 D-PBT): the lenia ``mass_approximately_conserved`` falsification
does NOT translate — these are exact bounds, not conservation laws.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def magnetization_bounded_invariant(spins: NDArray[np.floating]) -> bool:
    """Check ``|m| = |(1/N) sum s_i| <= 1``."""
    m = float(np.mean(np.asarray(spins, dtype=np.float64)))
    return bool(np.isfinite(m) and abs(m) <= 1.0 + 1e-12)


def energy_per_spin_bounded_invariant(
    spins: NDArray[np.floating],
    coupling: float = 1.0,
) -> bool:
    """Check ``E/N in [-2, 2]`` for the 2D nearest-neighbour Ising (J=1)."""
    s = np.asarray(spins, dtype=np.float64)
    bonds = -coupling * (s * np.roll(s, -1, axis=0) + s * np.roll(s, -1, axis=1))
    e = float(bonds.sum() / s.size)
    return bool(np.isfinite(e) and -2.0 * coupling - 1e-12 <= e <= 2.0 * coupling + 1e-12)
