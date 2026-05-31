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

_SH_C0 = 0.28209479177387814  # common-3dgs SH degree-0 DC normalization (1/(2*sqrt(pi)))


def select_active_voxels(density: NDArray[np.floating], max_gaussians: int) -> NDArray[np.intp]:
    """Return the flat indices of the ``max_gaussians`` densest voxels (deterministic).

    Ties + ordering are resolved deterministically: a stable descending sort by density,
    take the top ``K``, then return the indices in ascending order (so the Gaussian set is a
    fixed function of the field, independent of sort-tie order).
    """
    flat = np.asarray(density, dtype=np.float64).reshape(-1)
    k = int(min(max_gaussians, flat.size))
    top = np.argsort(flat, kind="stable")[::-1][:k]
    return np.sort(top).astype(np.intp)


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
    from common_3dgs import GaussianSplatModel
    from common_3dgs.coupling import default_density_to_opacity

    d = np.asarray(density, dtype=np.float64)
    if d.ndim != 3:
        raise ValueError(f"density must be (nx, ny, nz); got shape {d.shape}")
    shape = d.shape
    active = select_active_voxels(d, max_gaussians)
    ijk = np.stack(np.unravel_index(active, shape), axis=1).astype(np.float64)  # (k, 3)
    # Voxel-centre positions in the unit cube, per-axis normalized.
    centres = (ijk + 0.5) / np.asarray(shape, dtype=np.float64)[None, :]
    opacities = default_density_to_opacity(d.reshape(-1)[active])
    scale = float(voxel_scale) if voxel_scale is not None else 0.5 / float(max(shape))
    k = active.shape[0]
    scales = np.full((k, 3), scale, dtype=np.float32)
    rotations = np.tile(np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32), (k, 1))
    dc = ((np.asarray(color, dtype=np.float64) - 0.5) / _SH_C0).astype(np.float32)
    sh = np.tile(dc.reshape(1, 1, 3), (k, 1, 1))
    return GaussianSplatModel(
        positions=centres.astype(np.float32),
        scales=scales,
        rotations=rotations,
        opacities=opacities.astype(np.float32),
        sh_coefficients=sh,
    )


__all__ = ["build_smoke_gaussians", "select_active_voxels"]
