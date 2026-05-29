"""MPM-step -> coupling -> render pipeline (the sim driver).

Consumes the Phase-2 MPM kernel sequence (``compute_particle_stresses -> p2g_with_stress
-> grid_update -> g2p -> deformation_update -> advect_particles``; per-particle ``F (N,3,3)
f64`` read after ``deformation_update``) + :mod:`gs_mpm.coupling` + common-3dgs ``render``.

Scaffolded at Stage 1a (signatures + docstrings; bodies raise ``NotImplementedError``).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .scene import CanonicalScene


@dataclass(frozen=True)
class Frame:
    """One rendered + state-captured frame of the coupled sim."""

    step: int
    image: np.ndarray  # (H, W, 3) float32 in [0, 1]
    gaussian_positions: np.ndarray
    gaussian_scales: np.ndarray
    gaussian_rotations: np.ndarray
    particle_pos: np.ndarray
    particle_F: np.ndarray


def run_coupled_sim(
    scene: CanonicalScene,
    *,
    n_steps: int,
    capture_interval: int,
    image_height: int,
    image_width: int,
    seed: int = 0,
) -> list[Frame]:
    """Run the coupled MPM->3DGS sim; return the captured/rendered frames.

    Deterministic given fixed inputs (D-DET): MPM is bit-exact-same-hw (serial wp.launch),
    the coupling is sign-fixed, and common-3dgs render() is bit-exact-same-hw.
    """
    raise NotImplementedError("Stage 1b")


def write_capture_file(frames: list[Frame], path: str | Path) -> Path:
    """Write the capture (.h5 + .json, schema 1.0.0) with BOTH MPM particle state AND
    Gaussian-set state (spec-ref § 7). Returns the base path."""
    raise NotImplementedError("Stage 1b")
