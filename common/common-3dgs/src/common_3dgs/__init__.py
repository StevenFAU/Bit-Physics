"""Bit-Physics common-3dgs — Stack-E (Python / NVIDIA Warp) 3DGS surface.

Top-level public-API re-exports per the phase-3-plan §3.2.1 interface contract
(``docs/phases/phase-3-plan.md`` §3.2.1). task-8 (3dgs-mpm) and Phase-4 WU-C
consume ``GaussianSplatModel`` / ``render`` / ``Camera`` from here unchanged.

Scaffolded at Stage 1a (signatures + docstrings; bodies raise
``NotImplementedError``). Implementation lands at Stage 1b.
"""

from __future__ import annotations

from .camera import Camera
from .image_io import save_png
from .model import GaussianSplatModel
from .render import render

__version__ = "0.1.0"

__all__ = [
    "Camera",
    "GaussianSplatModel",
    "__version__",
    "render",
    "save_png",
]
