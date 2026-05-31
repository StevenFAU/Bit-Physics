"""Bit-Physics 3dgs-mpm-sh-update — Phase-4 batch-2 Sim A (neural-rendered frontier).

The SH-update deferred from Phase-3 task-8 (``3dgs-mpm``): per-frame spherical-harmonic
rotation under the MPM deformation's rotation part (polar decomposition ``F = R S``;
PhysGaussian Eq. (9), arXiv:2311.12198, CITE-ONLY). SIBLING of ``packages/3dgs-mpm`` — it
imports (does NOT mutate) ``gs_mpm.couple_gaussians`` (the covariance ``Sigma'=F A F^T``
path) + the MPM kernels, and ADDS the degree-1 Wigner-D SH rotation ``D1(R)=P R P^T``
(``P`` from the landed common-3dgs real-SH basis). The import package is ``gs_mpm_sh_update``
(the on-disk dir ``3dgs-mpm-sh-update`` is digit-leading; PEP 8 forbids a leading-digit
module).
"""

from __future__ import annotations

from .scene import SHUpdateScene, build_sh_update_scene
from .sh_rotation import polar_rotation, rotate_sh_degree1
from .sim import Frame, run_canonical_sh_update_sim, run_sh_update_sim, write_capture_file

__version__ = "0.0.0"

__all__ = [
    "Frame",
    "SHUpdateScene",
    "__version__",
    "build_sh_update_scene",
    "polar_rotation",
    "rotate_sh_degree1",
    "run_canonical_sh_update_sim",
    "run_sh_update_sim",
    "write_capture_file",
]
