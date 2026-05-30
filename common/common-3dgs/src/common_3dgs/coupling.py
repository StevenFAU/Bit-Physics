"""``PhysicsCoupling`` — bind physics state to a :class:`GaussianSplatModel` (§4.2.C).

The coupling primitive promoted from Phase-3 task-8 (3dgs-mpm) into common-3dgs
so the Phase-4.3 neural-rendered sims (4.11-4.14) share one implementation
(spec § 7.10 Rule-of-Three: ≥3 coming consumers). One Gaussian per physics
primitive (PhysGaussian / Gaussian Splashing convention); ``N ==
model.num_gaussians``.

Covariance transform — **PhysGaussian Eq. (8)** (Xie, Zong, Qiu et al.,
*PhysGaussian: Physics-Integrated 3D Gaussians for Generative Dynamics*, CVPR
2024; `docs/architecture.md:1217`):

    Σ' = F Σ Fᵀ

where the per-Gaussian covariance is reconstructed from the model's stored
``(scales, rotations)`` as ``Σ = R diag(s)² Rᵀ`` (``R`` from the wxyz
quaternion), deformed, then re-decomposed (symmetric eigendecomposition) back to
the ``(scale, rotation)`` representation the model stores. Derived independently
from the cited formulation (spec § 2.4 symmetric-bug guard); not imported from
the NON-COMMERCIAL Inria upstream.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import numpy as np
import warp as wp

from .model import GaussianSplatModel


def _quat_wxyz_to_matrix(q: np.ndarray) -> np.ndarray:
    """Convert (N, 4) unit wxyz quaternions to (N, 3, 3) rotation matrices."""
    q = q / np.clip(np.linalg.norm(q, axis=1, keepdims=True), 1e-12, None)
    w, x, y, z = q[:, 0], q[:, 1], q[:, 2], q[:, 3]
    n = q.shape[0]
    m = np.empty((n, 3, 3), dtype=np.float64)
    m[:, 0, 0] = 1.0 - 2.0 * (y * y + z * z)
    m[:, 0, 1] = 2.0 * (x * y - w * z)
    m[:, 0, 2] = 2.0 * (x * z + w * y)
    m[:, 1, 0] = 2.0 * (x * y + w * z)
    m[:, 1, 1] = 1.0 - 2.0 * (x * x + z * z)
    m[:, 1, 2] = 2.0 * (y * z - w * x)
    m[:, 2, 0] = 2.0 * (x * z - w * y)
    m[:, 2, 1] = 2.0 * (y * z + w * x)
    m[:, 2, 2] = 1.0 - 2.0 * (x * x + y * y)
    return m


def _matrix_to_quat_wxyz(m: np.ndarray) -> np.ndarray:
    """Convert (N, 3, 3) proper-rotation matrices to (N, 4) unit wxyz quaternions."""
    n = m.shape[0]
    q = np.empty((n, 4), dtype=np.float64)
    trace = m[:, 0, 0] + m[:, 1, 1] + m[:, 2, 2]
    for i in range(n):
        tr = trace[i]
        r = m[i]
        if tr > 0.0:
            s = np.sqrt(tr + 1.0) * 2.0
            q[i] = (
                0.25 * s,
                (r[2, 1] - r[1, 2]) / s,
                (r[0, 2] - r[2, 0]) / s,
                (r[1, 0] - r[0, 1]) / s,
            )
        elif r[0, 0] >= r[1, 1] and r[0, 0] >= r[2, 2]:
            s = np.sqrt(1.0 + r[0, 0] - r[1, 1] - r[2, 2]) * 2.0
            q[i] = (
                (r[2, 1] - r[1, 2]) / s,
                0.25 * s,
                (r[0, 1] + r[1, 0]) / s,
                (r[0, 2] + r[2, 0]) / s,
            )
        elif r[1, 1] >= r[2, 2]:
            s = np.sqrt(1.0 + r[1, 1] - r[0, 0] - r[2, 2]) * 2.0
            q[i] = (
                (r[0, 2] - r[2, 0]) / s,
                (r[0, 1] + r[1, 0]) / s,
                0.25 * s,
                (r[1, 2] + r[2, 1]) / s,
            )
        else:
            s = np.sqrt(1.0 + r[2, 2] - r[0, 0] - r[1, 1]) * 2.0
            q[i] = (
                (r[1, 0] - r[0, 1]) / s,
                (r[0, 2] + r[2, 0]) / s,
                (r[1, 2] + r[2, 1]) / s,
                0.25 * s,
            )
    return np.asarray(
        q / np.clip(np.linalg.norm(q, axis=1, keepdims=True), 1e-12, None), np.float64
    )


def default_density_to_opacity(density: np.ndarray) -> np.ndarray:
    """Beer-Lambert-style monotone density → opacity map: ``1 - exp(-density)``.

    Bounded in ``[0, 1)`` for non-negative density; monotone increasing.
    """
    return np.asarray(1.0 - np.exp(-np.clip(density, 0.0, None)), np.float64)


class PhysicsCoupling:
    """Bind physics state to a :class:`GaussianSplatModel` (one Gaussian per primitive)."""

    def __init__(self, model: GaussianSplatModel) -> None:
        self.model = model
        self._device = getattr(model, "_device", "cpu")

    def _check_n(self, arr: np.ndarray, what: str) -> None:
        if arr.shape[0] != self.model.num_gaussians:
            raise ValueError(
                f"{what}: leading dim {arr.shape[0]} != model.num_gaussians "
                f"{self.model.num_gaussians} (one Gaussian per physics primitive)"
            )

    def update_positions_from_particles(self, particle_positions: Any) -> None:
        """Set Gaussian centres from particle positions ``(N, 3)``."""
        pos = np.ascontiguousarray(particle_positions, dtype=np.float32)
        if pos.ndim != 2 or pos.shape[1] != 3:
            raise ValueError(f"particle_positions must be (N, 3); got {pos.shape}")
        self._check_n(pos, "particle_positions")
        self.model.positions = wp.array(pos, dtype=wp.vec3, device=self._device)

    def update_covariance_from_deformation(self, deformation_gradient: Any) -> None:
        """Apply PhysGaussian Eq. (8) Σ' = F Σ Fᵀ to every Gaussian covariance.

        ``deformation_gradient`` is ``(N, 3, 3)``. The stored ``(scales,
        rotations)`` are reconstructed into covariances, deformed, and
        re-decomposed via a symmetric eigendecomposition.
        """
        f = np.ascontiguousarray(deformation_gradient, dtype=np.float64)
        if f.ndim != 3 or f.shape[1:] != (3, 3):
            raise ValueError(f"deformation_gradient must be (N, 3, 3); got {f.shape}")
        self._check_n(f, "deformation_gradient")

        npy = self.model.to_numpy()
        scales = npy["scales"].astype(np.float64)
        rot = _quat_wxyz_to_matrix(npy["rotations"].astype(np.float64))
        # Σ = R diag(s)² Rᵀ
        s2 = scales**2
        sigma = np.einsum("nij,nj,nkj->nik", rot, s2, rot)
        # Σ' = F Σ Fᵀ
        sigma_p = np.einsum("nij,njk,nlk->nil", f, sigma, f)
        # Symmetrise (guard FP drift) then eigendecompose (eigh → ascending eigvals).
        sigma_p = 0.5 * (sigma_p + np.transpose(sigma_p, (0, 2, 1)))
        eigvals, eigvecs = np.linalg.eigh(sigma_p)
        new_scales = np.sqrt(np.clip(eigvals, 0.0, None))
        # Ensure proper rotations (det = +1): flip the first column sign where needed.
        dets = np.linalg.det(eigvecs)
        eigvecs[dets < 0.0, :, 0] *= -1.0
        new_rot = _matrix_to_quat_wxyz(eigvecs)

        self.model.scales = wp.array(
            new_scales.astype(np.float32), dtype=wp.vec3, device=self._device
        )
        self.model.rotations = wp.array(
            new_rot.astype(np.float32), dtype=wp.float32, device=self._device
        )

    def update_opacity_from_density(
        self,
        density: Any,
        *,
        density_to_opacity_fn: Callable[[np.ndarray], np.ndarray] | None = None,
    ) -> None:
        """Set Gaussian opacities from per-primitive density ``(N,)``."""
        d = np.ascontiguousarray(density, dtype=np.float64).reshape(-1)
        self._check_n(d, "density")
        fn = (
            density_to_opacity_fn
            if density_to_opacity_fn is not None
            else default_density_to_opacity
        )
        opacity = np.asarray(fn(d), dtype=np.float32).reshape(-1)
        if opacity.shape[0] != self.model.num_gaussians:
            raise ValueError("density_to_opacity_fn must preserve the (N,) shape")
        self.model.opacities = wp.array(opacity, dtype=wp.float32, device=self._device)
