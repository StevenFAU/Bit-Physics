"""D3Q19 lattice constants (canonical ordering) -- Stack-E port.

Ported VERBATIM from the Phase-1 NumPy reference
``packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/constants.py``
(R-LBM-4: the 19-velocity ordering MUST match the golden table
``tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`` velocity_indexing
verbatim; cross-stack equivalence at gate-14 requires bit-identical lattice
ordering between Stack-E and the NumPy reference).

Pure data (no Warp); the Stack-E Warp kernels in ``d3q19_warp`` consume
``C`` / ``W`` as f64 ndarrays uploaded via ``wp.from_numpy(..., dtype=...)``.
Sound speed + weights are first-principles Gauss-Hermite values (Qian et al.
1992 section 2; Kruger 2017 Ch. 3 Table 3.4); NOT re-derived at runtime.

N_z = 3 z-periodic depth-3 slab (Phase-1 Stage 0 Task 0.4 operator routing).
"""

from __future__ import annotations

from typing import Final

import numpy as np
from numpy.typing import NDArray

# Lex-ordered 19 velocity vectors. Order matches the golden JSON's
# velocity_indexing field verbatim (Phase-1 reference + d3q19 derivation.md).
VELOCITIES: Final[tuple[tuple[int, int, int], ...]] = (
    (0, 0, 0),
    (1, 0, 0),
    (-1, 0, 0),
    (0, 1, 0),
    (0, -1, 0),
    (0, 0, 1),
    (0, 0, -1),
    (1, 1, 0),
    (-1, -1, 0),
    (1, -1, 0),
    (-1, 1, 0),
    (1, 0, 1),
    (-1, 0, -1),
    (1, 0, -1),
    (-1, 0, 1),
    (0, 1, 1),
    (0, -1, -1),
    (0, 1, -1),
    (0, -1, 1),
)
assert len(VELOCITIES) == 19

WEIGHTS: Final[tuple[float, ...]] = (
    1.0 / 3.0,
    *([1.0 / 18.0] * 6),
    *([1.0 / 36.0] * 12),
)
assert len(WEIGHTS) == 19

CS2: Final[float] = 1.0 / 3.0  # speed-of-sound^2 in lattice units


def _velocities_array() -> NDArray[np.int64]:
    """Return the 19x3 velocity matrix as an integer NumPy array."""
    return np.asarray(VELOCITIES, dtype=np.int64)


def _weights_array() -> NDArray[np.float64]:
    """Return the 19-element weight vector as a float64 array."""
    return np.asarray(WEIGHTS, dtype=np.float64)


C: Final[NDArray[np.int64]] = _velocities_array()
W: Final[NDArray[np.float64]] = _weights_array()


# Canonical capture descriptors per Appendix D D.2.3 (Phase-1-frozen; D4).
CANONICAL_DESCRIPTOR_POISEUILLE: Final[str] = "poiseuille-64x32-seed42-step1000"
CANONICAL_DESCRIPTOR_COUETTE: Final[str] = "couette-32x16-seed42-step500"
CANONICAL_SEED: Final[int] = 42
CANONICAL_NZ: Final[int] = 3  # depth-3 z-periodic slab.

# Poiseuille: 64 (flow-x) x 32 (wall-normal y) x 3 (periodic z), 1000 steps.
CANONICAL_POISEUILLE_NX: Final[int] = 64
CANONICAL_POISEUILLE_NY: Final[int] = 32
CANONICAL_POISEUILLE_STEPS: Final[int] = 1000

# Couette: 32 (flow-x) x 16 (wall-normal y) x 3 (periodic z), 500 steps.
CANONICAL_COUETTE_NX: Final[int] = 32
CANONICAL_COUETTE_NY: Final[int] = 16
CANONICAL_COUETTE_STEPS: Final[int] = 500


__all__ = [
    "CANONICAL_COUETTE_NX",
    "CANONICAL_COUETTE_NY",
    "CANONICAL_COUETTE_STEPS",
    "CANONICAL_DESCRIPTOR_COUETTE",
    "CANONICAL_DESCRIPTOR_POISEUILLE",
    "CANONICAL_NZ",
    "CANONICAL_POISEUILLE_NX",
    "CANONICAL_POISEUILLE_NY",
    "CANONICAL_POISEUILLE_STEPS",
    "CANONICAL_SEED",
    "CS2",
    "VELOCITIES",
    "WEIGHTS",
    "C",
    "W",
]
