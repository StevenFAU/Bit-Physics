"""``common_warp.learned`` — Warp<->PyTorch interop + PhysicsNeMo adapter (§4.2.E).

``warp_to_torch`` / ``torch_to_warp`` zero-copy bridges (always available) plus
``PhysicsNeMoAdapter`` (lazy-imports nvidia-physicsnemo 2.1.0). Consumed by the
Phase-4.6 learned-dynamics sims (4.26-4.27).
"""

from __future__ import annotations

from .bridges import torch_to_warp, warp_to_torch
from .physicsnemo_adapter import PhysicsNeMoAdapter

__all__ = ["PhysicsNeMoAdapter", "torch_to_warp", "warp_to_torch"]
