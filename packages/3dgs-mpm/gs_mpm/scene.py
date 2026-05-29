"""Synthetic canonical 3DGS scene (D-SCENE: small synthetic, ~200-500 Gaussians).

A deterministically-seeded Gaussian blob (NOT a vendored photorealistic Inria scene) —
CPU-tractable, render-deterministic, and LFS-light. Each Gaussian is bound 1:1 to an MPM
particle so the per-particle deformation gradient ``F`` drives the matching Gaussian.

The blob mirrors the Phase-2 MPM canonical drop geometry (centre, radius, initial downward
velocity) at a SMALL particle count + coarse grid so the coupled sim renders quickly and
deterministically on CPU.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# common-3dgs SH degree-0 DC normalization (1 / (2*sqrt(pi))).
_SH_C0 = 0.28209479177387814

#: Canonical scene parameters (mirrors the Phase-2 MPM drop blob, scaled down).
BLOB_CENTER = (0.5, 0.5, 0.65)
BLOB_RADIUS = 0.15
BLOB_INITIAL_VZ = -2.0
GRID_N = 32
DEFAULT_N_GAUSSIANS = 256


@dataclass(frozen=True)
class CanonicalScene:
    """A small synthetic 3DGS scene + its MPM particle binding (1:1).

    ``positions/scales/rotations/opacities/sh_coefficients`` are the common-3dgs Gaussian
    fields (float32); ``mpm_positions`` are the matching MPM particle positions (float64).
    """

    positions: np.ndarray
    scales: np.ndarray
    rotations: np.ndarray
    opacities: np.ndarray
    sh_coefficients: np.ndarray
    mpm_positions: np.ndarray

    @property
    def n(self) -> int:
        return int(self.positions.shape[0])


def _sample_sphere(
    rng: np.random.Generator, n: int, center: np.ndarray, radius: float
) -> np.ndarray:
    """Deterministically sample ``n`` points uniformly inside a sphere (rejection-free)."""
    # Uniform-in-ball via direction * radius * U^(1/3).
    dirs = rng.standard_normal((n, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    radii = radius * np.cbrt(rng.random(n))
    return center[None, :] + dirs * radii[:, None]


def build_canonical_scene(
    *, seed: int = 0, n_gaussians: int = DEFAULT_N_GAUSSIANS
) -> CanonicalScene:
    """Build the deterministic synthetic Gaussian blob (seeded; ``n`` in [200, 500])."""
    if not (200 <= n_gaussians <= 500):
        raise ValueError(f"n_gaussians must be in [200, 500]; got {n_gaussians}")
    rng = np.random.default_rng(seed)
    center = np.asarray(BLOB_CENTER, dtype=np.float64)
    pts = _sample_sphere(rng, n_gaussians, center, BLOB_RADIUS)

    positions = pts.astype(np.float32)
    scales = np.full((n_gaussians, 3), 0.025, dtype=np.float32)
    rotations = np.tile(np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32), (n_gaussians, 1))
    opacities = np.full(n_gaussians, 0.9, dtype=np.float32)

    # Degree-0 SH (K=1): colour each Gaussian by its normalized position so the render
    # carries deterministic spatial structure. DC coeff c_dc = (rgb - 0.5) / C0.
    rgb = np.clip((pts - (center - BLOB_RADIUS)) / (2.0 * BLOB_RADIUS), 0.0, 1.0)
    sh = ((rgb - 0.5) / _SH_C0).astype(np.float32).reshape(n_gaussians, 1, 3)

    return CanonicalScene(
        positions=positions,
        scales=scales,
        rotations=rotations,
        opacities=opacities,
        sh_coefficients=sh,
        mpm_positions=pts.astype(np.float64),
    )
