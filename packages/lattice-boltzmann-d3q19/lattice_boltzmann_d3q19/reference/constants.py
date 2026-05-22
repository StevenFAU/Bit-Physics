"""D3Q19 lattice constants (canonical ordering).

The 19-direction velocity set + Gauss-Hermite weights per
``tools/testkit/golden/derivations/d3q19.md`` § 1 + § 2. The order
MUST match the golden table at
``tools/testkit/golden/tables/lattice/d3q19-equilibrium.json``
verbatim — the velocity_indexing string of that table is the
authoritative source for index → vector mapping.

Sound speed and weights are first-principles values (Gauss-Hermite
quadrature on the D3Q19 sub-lattice; Qian et al. 1992 § 2; Krüger
2017 Ch. 3 Table 3.4); they are NOT re-derived at runtime.

Canonical-capture descriptors per `docs/architecture.md`
Appendix D § D.2.3:

  - Poiseuille channel flow on a 64x32 cross-section, 1000 steps.
  - Couette parallel-plate flow on a 32x16 cross-section, 500 steps.

The Appendix D labels are 2D channel-flow conventions; D3Q19 requires
3D discretization. The third-dimension `N_z = 3` z-periodic depth-3
slab convention is the Stage 0 (per
``docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-checkpoint-2026-05-22T21-33-08Z.md``
§ 4.4) operator-routed resolution: minimum extent that exercises the
19-direction streaming with non-degenerate periodic z-wraparound,
while preserving the translation-invariant-in-z benchmark identity.
"""

from __future__ import annotations

from typing import Final

import numpy as np
from numpy.typing import NDArray

# Lex-ordered 19 velocity vectors. Order matches the golden JSON's
# velocity_indexing field verbatim (and `tools/testkit/golden/generator/
# d3q19_equilibrium.py` VELOCITIES list).
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

CS2: Final[float] = 1.0 / 3.0  # speed-of-sound² in lattice units


def _velocities_array() -> NDArray[np.int64]:
    """Return the 19×3 velocity matrix as an integer NumPy array."""
    return np.asarray(VELOCITIES, dtype=np.int64)


def _weights_array() -> NDArray[np.float64]:
    """Return the 19-element weight vector as a float64 array."""
    return np.asarray(WEIGHTS, dtype=np.float64)


C: Final[NDArray[np.int64]] = _velocities_array()
W: Final[NDArray[np.float64]] = _weights_array()


# Canonical capture descriptors per Appendix D § D.2.3.
CANONICAL_DESCRIPTOR_POISEUILLE: Final[str] = "poiseuille-64x32-seed42-step1000"
CANONICAL_DESCRIPTOR_COUETTE: Final[str] = "couette-32x16-seed42-step500"
CANONICAL_SEED: Final[int] = 42
CANONICAL_NZ: Final[int] = 3  # depth-3 z-periodic slab (Stage 0 Task 0.4 routing).

# Poiseuille: 64 (flow-x) × 32 (wall-normal y) × 3 (periodic z), 1000 steps.
CANONICAL_POISEUILLE_NX: Final[int] = 64
CANONICAL_POISEUILLE_NY: Final[int] = 32
CANONICAL_POISEUILLE_STEPS: Final[int] = 1000

# Couette: 32 (flow-x) × 16 (wall-normal y) × 3 (periodic z), 500 steps.
CANONICAL_COUETTE_NX: Final[int] = 32
CANONICAL_COUETTE_NY: Final[int] = 16
CANONICAL_COUETTE_STEPS: Final[int] = 500


__all__ = [
    "C",
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
    "W",
    "WEIGHTS",
]
