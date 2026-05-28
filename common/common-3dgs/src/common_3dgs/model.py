"""``GaussianSplatModel`` — the 3DGS scene data abstraction (§3.2.1).

A Gaussian-splat scene is a set of N anisotropic 3D Gaussians, each carrying a
center, an anisotropic scale, an orientation quaternion, an opacity, and a bank
of spherical-harmonic colour coefficients. State is Warp-array-backed for
Stack-E (GPU-resident) residency, with NumPy accessors for host-side use and
verification.

Field shapes / dtypes (§3.2.1; ``docs/phases/phase-3-plan.md`` §3.2.1):

- ``positions``       — ``(N, 3) float32`` centres in world coordinates.
- ``scales``          — ``(N, 3) float32`` per-axis scales (covariance eigen-diag).
- ``rotations``       — ``(N, 4) float32`` unit quaternions, **wxyz** convention.
- ``opacities``       — ``(N,)  float32`` in ``[0, 1]``.
- ``sh_coefficients`` — ``(N, K, 3) float32`` SH coefficients per RGB channel,
  where ``K = (sh_degree + 1) ** 2`` (degree 3 → ``K = 16``).

The loader/saver speak Inria's .ply 3DGS scene format (attribute layout cited
from the vendored ``references/3DGS-reference/`` ``scene/gaussian_model.py``); the
parser is derived independently per spec § 2.4 (symmetric-bug guard).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import warp as wp

#: Default spherical-harmonic degree (Inria 3DGS ships degree 3 → K = 16).
SH_DEGREE_DEFAULT = 3

_NOT_IMPL = "common-3dgs Stage 1a scaffold: implementation lands at Stage 1b"


class GaussianSplatModel:
    """A 3D-Gaussian-Splatting scene (N anisotropic Gaussians)."""

    #: Warp arrays (set in ``__init__`` at Stage 1b).
    positions: wp.array[Any]
    scales: wp.array[Any]
    rotations: wp.array[Any]
    opacities: wp.array[Any]
    sh_coefficients: wp.array[Any]

    def __init__(
        self,
        positions: wp.array[Any] | np.ndarray,
        scales: wp.array[Any] | np.ndarray,
        rotations: wp.array[Any] | np.ndarray,
        opacities: wp.array[Any] | np.ndarray,
        sh_coefficients: wp.array[Any] | np.ndarray,
        *,
        device: str = "cpu",
    ) -> None:
        """Construct from per-field arrays; validates shapes + dtypes.

        Accepts NumPy or Warp arrays; stores Warp arrays on ``device``. Raises
        ``ValueError`` on shape/dtype mismatch (Stage 1b).
        """
        raise NotImplementedError(_NOT_IMPL)

    @classmethod
    def load_ply(cls, path: str | Path, *, device: str = "cpu") -> GaussianSplatModel:
        """Load an Inria .ply 3DGS scene; validate SH degree, vertex count, attrs."""
        raise NotImplementedError(_NOT_IMPL)

    def save_ply(self, path: str | Path) -> None:
        """Write this model to an Inria-compatible .ply 3DGS scene file."""
        raise NotImplementedError(_NOT_IMPL)

    @property
    def num_gaussians(self) -> int:
        """Number of Gaussians N in the scene."""
        raise NotImplementedError(_NOT_IMPL)

    @property
    def sh_degree(self) -> int:
        """Spherical-harmonic degree (``K = (sh_degree + 1) ** 2``)."""
        raise NotImplementedError(_NOT_IMPL)

    def to_numpy(self) -> dict[str, np.ndarray]:
        """Host-side accessor: every field as a NumPy array, keyed by name."""
        raise NotImplementedError(_NOT_IMPL)

    def __len__(self) -> int:
        raise NotImplementedError(_NOT_IMPL)
