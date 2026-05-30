"""Bit-Physics common-3dgs — Stack-E (Python / NVIDIA Warp) 3DGS surface.

Top-level public-API re-exports per the phase-3-plan §3.2.1 interface contract
(``docs/phases/phase-3-plan.md`` §3.2.1). task-8 (3dgs-mpm) and Phase-4 WU-C
consume ``GaussianSplatModel`` / ``render`` / ``Camera`` from here unchanged.

Phase-4 WU-C (§4.2.C) extends this surface with the optimisation loop
(``TrainingLoop`` / ``TrainingHistory``), physics coupling (``PhysicsCoupling``),
and the viewer (``render_to_image`` / ``launch_interactive_viewer``). The Phase-3
symbols are imported UNCHANGED.
"""

from __future__ import annotations

from .camera import Camera
from .coupling import PhysicsCoupling
from .image_io import save_png
from .model import GaussianSplatModel
from .render import render
from .training import TrainingHistory, TrainingLoop
from .viewer import launch_interactive_viewer, render_to_image

__version__ = "0.2.0"

__all__ = [
    "Camera",
    "GaussianSplatModel",
    "PhysicsCoupling",
    "TrainingHistory",
    "TrainingLoop",
    "__version__",
    "launch_interactive_viewer",
    "render",
    "render_to_image",
    "save_png",
]
