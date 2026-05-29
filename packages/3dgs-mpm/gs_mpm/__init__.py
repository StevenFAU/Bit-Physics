"""Bit-Physics 3dgs-mpm — Phase-3 task-8 PhysGaussian-style MPM->3DGS coupling.

FIRST neural-rendered-CATEGORY sim and the Phase-3 FINALE. Single-stack Stack E
(NVIDIA Warp + Python), CPU-only. The Phase-2 MPM solver
(``packages/mpm-multimaterial-stack-e``) is CONSUMED (stepped via its modular kernel
sequence); the NOVEL work is the sim-local :mod:`gs_mpm.coupling` (per-frame: MPM step
-> per-particle deformation gradient ``F`` -> Gaussian covariance ``Sigma' = F A F^T``
(PhysGaussian Eq. (8)) -> Gaussian scale/rotation; SH frozen for MVP) followed by a
render via common-3dgs.

The import package is ``gs_mpm`` because the on-disk package dir ``packages/3dgs-mpm``
is digit-leading (PEP 8 forbids a leading-digit module name); the sim identity and the
distribution name remain ``3dgs-mpm``.

Scaffolded at Stage 1a (signatures + docstrings; bodies raise ``NotImplementedError``).
Implementation lands at Stage 1b.
"""

from __future__ import annotations

from .coupling import (
    apply_deformation,
    couple_gaussians,
    extract_scale_rotation,
    reconstruct_covariance,
)

__version__ = "0.0.0"

__all__ = [
    "__version__",
    "apply_deformation",
    "couple_gaussians",
    "extract_scale_rotation",
    "reconstruct_covariance",
]
