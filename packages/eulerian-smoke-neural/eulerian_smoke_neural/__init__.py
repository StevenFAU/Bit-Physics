"""Bit-Physics eulerian-smoke-neural — Phase-4 batch-2 Sim B (spec § 5.11 "3dgs-smoke").

Couples the landed ``eulerian-smoke-stack-e`` volumetric smoke (Stam/Fedkiw stable fluids;
the 3D ``density`` field) to a Gaussian cloud via the WU-C density->opacity Beer-Lambert hook
(``common_3dgs.default_density_to_opacity``) and renders it (``common_3dgs.render``). The
``density`` field is bit-equal to a direct ``eulerian-smoke-stack-e`` rollout (same
``stable_fluids_step_3d``), so physics-equivalence-vs-parent holds by construction.
"""

from __future__ import annotations

from .coupling import build_smoke_gaussians, select_active_voxels
from .sim import (
    Frame,
    run_canonical_smoke_neural_sim,
    run_smoke_neural_sim,
    write_capture_file,
)

__version__ = "0.0.0"

__all__ = [
    "Frame",
    "__version__",
    "build_smoke_gaussians",
    "run_canonical_smoke_neural_sim",
    "run_smoke_neural_sim",
    "select_active_voxels",
    "write_capture_file",
]
