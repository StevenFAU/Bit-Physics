"""Device resolution shared by the Particles / Grids / HashGrid subsystems.

The §1.9.1 allocate/from_capture signatures nominally default to the
zero-indexed CUDA device (GPU-first). The bootstrap reconciles this with
the D4 / R-W3 CPU posture established at Stage 1a
(``runtime.DEFAULT_DEVICE == "cpu"``): ``device=None`` resolves to the
**current** runtime device (CPU by default; whatever a prior ``init`` with
a CUDA device selected on a GPU host), WITHOUT resetting it. An explicit
``device`` string is used verbatim.
"""

from __future__ import annotations

from .. import runtime


def resolve_device(device: str | None = None) -> str:
    """Resolve an allocation device. ``None`` -> current runtime device.

    Calling ``runtime.get_device()`` also guarantees ``wp.init()`` has run
    (idempotent self-init), so callers can allocate Warp arrays immediately.
    """
    current = runtime.get_device()
    return current if device is None else device
