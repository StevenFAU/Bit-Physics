"""Smoke-density -> Gaussian coupling (spec § 5.11 3dgs-smoke).

One Gaussian per sampled smoke voxel: position = voxel centre, opacity = the WU-C
Beer-Lambert map ``1 - exp(-density)`` (``common_3dgs.default_density_to_opacity``),
isotropic covariance (MVP), degree-0 DC SH = a fixed smoke colour. The K densest voxels are
selected (deterministic argsort) to keep the Gaussian count CPU-tractable.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from numpy.typing import NDArray


def select_active_voxels(density: NDArray[np.floating], max_gaussians: int) -> NDArray[np.intp]:
    """Return the flat indices of the ``max_gaussians`` densest voxels (deterministic)."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


def build_smoke_gaussians(
    density: NDArray[np.floating],
    *,
    max_gaussians: int = 256,
    voxel_scale: float | None = None,
    color: tuple[float, float, float] = (0.85, 0.85, 0.9),
) -> Any:
    """Build a ``GaussianSplatModel`` from a 3D smoke ``density`` field ``(n, n, n)``.

    Positions = centres of the ``max_gaussians`` densest voxels; opacities =
    ``default_density_to_opacity(density)`` at those voxels (Beer-Lambert); isotropic scales
    (``voxel_scale`` or ``~0.5/n``); identity rotations; degree-0 DC SH from ``color``.
    """
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


__all__ = ["build_smoke_gaussians", "select_active_voxels"]
