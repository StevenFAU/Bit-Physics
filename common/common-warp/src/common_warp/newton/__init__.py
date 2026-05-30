"""``common_warp.newton`` — NVIDIA Newton 1.0 GA backend wrapper (§4.2.D).

Consumed by Phase-4.5 rigid-body sims (4.23-4.25). The runtime (solver stepping)
is CUDA-gated + lazy-imported; the metadata surface resolves on any host. See
``backend.py`` for the CPU-fallback BLOCKED posture (spec §12.8 + plan §7.5).
"""

from __future__ import annotations

from .backend import NewtonBackend
from .determinism import DeterminismDeclaration
from .state import NewtonState

__all__ = ["DeterminismDeclaration", "NewtonBackend", "NewtonState"]
