"""Sparse-volume infrastructure — Warp ``wp.Volume`` + NanoVDB (Phase 4.0 WU-B).

- :class:`SparseVolume` — loads a ``.nvdb`` grid (host C++ ``bit_physics::nanovdb``
  writer) into a ``wp.Volume`` and exposes index-space lookups (``.wp_volume``
  escape hatch).
- :class:`ActiveMask` — dense active-cell mask + content hash + the capture-manifest
  ``active_mask`` entry (schema 1.1.0, spec § 4.3).

Consumed by Phase 4.2's sparse-variant sims and the tier-2 sparse diagnostics
(:mod:`diagnostics.tier2`). CPU loads + samples; grid *allocation* needs CUDA
(Warp constraint — see :class:`SparseVolume`).
"""

from __future__ import annotations

from .mask import ActiveMask, topology_hash
from .volume import SparseVolume

__all__ = ["ActiveMask", "SparseVolume", "topology_hash"]
