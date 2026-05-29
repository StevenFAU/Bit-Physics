"""Synthetic canonical 3DGS scene (D-SCENE: small synthetic, ~200-500 Gaussians).

A deterministically-seeded Gaussian object (NOT a vendored photorealistic Inria scene) —
CPU-tractable, render-deterministic, and LFS-light. Bound 1:1 to MPM particles so the
deformation gradient ``F`` per particle drives the corresponding Gaussian.

Scaffolded at Stage 1a (signature + docstring; body raises ``NotImplementedError``).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class CanonicalScene:
    """A small synthetic 3DGS scene + its MPM particle binding.

    ``positions/scales/rotations/opacities/sh_coefficients`` are the common-3dgs Gaussian
    fields; ``mpm_positions`` are the matching MPM particle positions (1:1 binding).
    """

    positions: np.ndarray
    scales: np.ndarray
    rotations: np.ndarray
    opacities: np.ndarray
    sh_coefficients: np.ndarray
    mpm_positions: np.ndarray


def build_canonical_scene(*, seed: int = 0, n_gaussians: int = 256) -> CanonicalScene:
    """Build the deterministic synthetic Gaussian object (seeded; ``n`` in [200, 500])."""
    raise NotImplementedError("Stage 1b")
