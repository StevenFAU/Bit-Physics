"""MPM-step -> covariance coupling -> **SH rotation** -> render pipeline (the sim driver).

Reuses the parent ``gs_mpm`` building blocks UNCHANGED — the Phase-2 MPM kernels
(``mpm_multimaterial_stack_e.reference.mls_mpm_warp``), ``gs_mpm.couple_gaussians`` (the
covariance ``Sigma'=F A F^T`` path), and the common-3dgs ``render`` — and ADDS the per-frame
SH rotation: ``R = polar_rotation(F)`` then ``sh' = rotate_sh_degree1(scene.sh, R)`` before
building the ``GaussianSplatModel``. Because the MPM kernels / constants / particle positions
are identical to ``gs_mpm``, the MPM trajectory + covariance are bit-equal to the parent
(physics-equivalence-vs-parent holds by construction); the ONLY delta is the rotated SH.

Determinism (D-DET): MPM is bit-exact-same-hw (serial ``wp.launch`` f64), the polar rotation
(SVD + ``P R P^T``) is deterministic NumPy, and common-3dgs ``render`` is bit-exact-same-hw
-> the end-to-end pipeline is deterministic run-to-run on a fixed host (MEASURED at Stage 1b).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .scene import SHUpdateScene

#: Canonical coupled-sim schedule — mirrors ``gs_mpm.sim`` exactly (physics-equivalence).
CANONICAL_N_STEPS = 300
CANONICAL_CAPTURE_INTERVAL = 100
CANONICAL_IMAGE_HW = 96  # >= 64 so LPIPS-AlexNet accepts the render-similarity input


@dataclass(frozen=True)
class Frame:
    """One rendered + state-captured frame of the SH-update coupled sim."""

    step: int
    image: np.ndarray
    gaussian_positions: np.ndarray
    gaussian_scales: np.ndarray
    gaussian_rotations: np.ndarray
    gaussian_sh: np.ndarray
    particle_pos: np.ndarray
    particle_F: np.ndarray


def run_sh_update_sim(
    scene: SHUpdateScene,
    *,
    n_steps: int,
    capture_interval: int,
    image_height: int,
    image_width: int,
    seed: int = 0,
) -> list[Frame]:
    """Run the coupled MPM -> covariance -> SH-rotation -> render sim; return frames."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


def run_canonical_sh_update_sim(
    scene: SHUpdateScene | None = None, *, seed: int = 0
) -> list[Frame]:
    """Run the canonical SH-update sim on the canonical schedule (golden / test / CLI shared)."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


def write_capture_file(frames: list[Frame], path: str | Path) -> Path:
    """Write the capture (.h5 + .json) with MPM state AND the gaussian-transform history."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


__all__ = [
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_IMAGE_HW",
    "CANONICAL_N_STEPS",
    "Frame",
    "run_canonical_sh_update_sim",
    "run_sh_update_sim",
    "write_capture_file",
]
