"""Python NumPy reference implementation for sph-water.

Phase 1 sub-phase scope: small-N DFSPH primitives + canonical capture
helpers. Algorithmic references (cited by name only — no imports from
the vendored upstream at ``references/SPlisHSPlasH/``):

- Bender, J. & Koschier, D. (2015), "Divergence-free smoothed
  particle hydrodynamics", SCA '15, 147–155.
  DOI 10.1145/2786784.2786796.
- Monaghan, J. J. (1992), "Smoothed particle hydrodynamics",
  Annu. Rev. Astron. Astrophys. 30, 543–574.
  DOI 10.1146/annurev.aa.30.090192.002551.
- Monaghan, J. J. (2005), "Smoothed particle hydrodynamics",
  Rep. Prog. Phys. 68 (8), 1703–1759.
  DOI 10.1088/0034-4885/68/8/R01.
"""

from __future__ import annotations

from . import dfsph

__all__ = ["dfsph"]
