"""Canonical degree-1 directional-SH scene for the SH-update sim.

The landed ``gs_mpm`` canonical scene is **degree-0 (DC-only)** SH, on which an SH rotation
is a NO-OP — so it cannot exercise (or perceptually witness) the SH-update. This module
authors a NEW **degree-1** (K=4) scene: the SAME blob geometry as ``gs_mpm`` (so the MPM
physics is bit-comparable to the parent) but with a directional degree-1 band, so a Gaussian
that ROTATES under the MPM deformation renders a visibly different view-dependent colour
(the Prong-2 render-similarity gate is non-vacuous).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class SHUpdateScene:
    """A small synthetic degree-1 3DGS scene + its MPM particle binding (1:1).

    ``positions/scales/rotations/opacities`` mirror ``gs_mpm.CanonicalScene``;
    ``sh_coefficients`` is ``(N, 4, 3)`` (degree 1: DC + 3 directional terms);
    ``mpm_positions`` are the matching MPM particle positions (float64).
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


def build_sh_update_scene(*, seed: int = 0, n_gaussians: int = 256) -> SHUpdateScene:
    """Build the deterministic degree-1 directional-SH blob (seeded; ``n`` in [200, 500]).

    Geometry (positions / scales / rotations / opacities / mpm_positions) mirrors
    ``gs_mpm.build_canonical_scene`` exactly (same seed, sampler, blob params) so the MPM
    trajectory is bit-identical to the parent. The DC band reuses the parent's
    position-coloured DC; the degree-1 band encodes a directional gradient so rotation is
    observable.
    """
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


__all__ = ["SHUpdateScene", "build_sh_update_scene"]
