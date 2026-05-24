"""Bit-Physics common-warp — Stack-E (Python / NVIDIA Warp) surface.

Top-level public-API re-exports per the phase-2 plan §1.9.1 import
contract. Landed at Stage 1a: the Runtime subsystem (``init`` /
``get_device`` / ``set_device``) + the Determinism subsystem / W-2
mechanism (``set_seed`` / ``get_seed`` / ``deterministic_context`` /
``set_warp_deterministic`` / ``assert_deterministic_run``). Capture I/O,
Particles, Grids, and HashGrid land at Stage 1b; the hello smoke
simulator at Stage 1c.
"""

from __future__ import annotations

from .runtime import get_device, init, set_device
from .warp_harness import (
    assert_deterministic_run,
    deterministic_context,
    get_seed,
    set_seed,
    set_warp_deterministic,
)

__version__ = "0.1.0"

__all__ = [
    "__version__",
    "assert_deterministic_run",
    "deterministic_context",
    "get_device",
    "get_seed",
    "init",
    "set_device",
    "set_seed",
    "set_warp_deterministic",
]
