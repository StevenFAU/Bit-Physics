"""Bit-Physics common-warp — Stack-E (Python / NVIDIA Warp) surface.

Top-level public-API re-exports per the phase-2 plan §1.9.1 import
contract. Landed across Stage 1a (Runtime + Determinism / W-2 mechanism)
and Stage 1b (Capture I/O + Particles + Grids + HashGrid). The hello smoke
simulator (examples/hello/) + docs/common/warp.md land at Stage 1c.
"""

from __future__ import annotations

from .capture import Capture, read_capture, write_capture
from .grids import (
    ScalarField3D,
    VectorField3D,
    allocate_scalar_field,
    allocate_vector_field,
)
from .hashgrid import HashGrid
from .particles import Particles, allocate_particles
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
    "Capture",
    "HashGrid",
    "Particles",
    "ScalarField3D",
    "VectorField3D",
    "__version__",
    "allocate_particles",
    "allocate_scalar_field",
    "allocate_vector_field",
    "assert_deterministic_run",
    "deterministic_context",
    "get_device",
    "get_seed",
    "init",
    "read_capture",
    "set_device",
    "set_seed",
    "set_warp_deterministic",
    "write_capture",
]
