"""Smoke-step -> density->Gaussian coupling -> render pipeline (the 3dgs-smoke driver).

Reuses the parent ``eulerian-smoke-stack-e`` building blocks UNCHANGED — ``stable_fluids_step_3d``
+ the Taylor-Green IC + ``canonical_params_3d`` — so the ``density`` field is bit-equal to a direct
``eulerian-smoke-stack-e`` rollout at the same grid/seed (physics-equivalence-vs-parent holds by
construction). Per captured frame: ``build_smoke_gaussians(density)`` -> ``common_3dgs.render``.

Determinism (D-DET): the smoke step is bit-exact-same-hw (serial ``wp.launch`` f64), the coupling
is deterministic NumPy (argsort + Beer-Lambert), and ``render`` is bit-exact-same-hw -> the
end-to-end pipeline is deterministic run-to-run on a fixed host (MEASURED at Stage 1b).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

#: Canonical schedule — small grid so the per-voxel Gaussian render is CPU-tractable + det.
CANONICAL_N = 24
CANONICAL_N_STEPS = 40
CANONICAL_CAPTURE_INTERVAL = 20
CANONICAL_IMAGE_HW = 96  # >= 64 so LPIPS-AlexNet accepts the render-similarity input
CANONICAL_MAX_GAUSSIANS = 256
CANONICAL_SEED = 0


@dataclass(frozen=True)
class Frame:
    """One rendered + state-captured frame of the 3dgs-smoke coupled sim."""

    step: int
    image: np.ndarray
    gaussian_positions: np.ndarray
    gaussian_opacities: np.ndarray
    density: np.ndarray


def run_smoke_neural_sim(
    *,
    n: int,
    n_steps: int,
    capture_interval: int,
    image_height: int,
    image_width: int,
    max_gaussians: int,
    seed: int = 0,
) -> list[Frame]:
    """Run the coupled smoke -> density->Gaussian -> render sim; return frames."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


def run_canonical_smoke_neural_sim(*, seed: int = 0) -> list[Frame]:
    """Run the canonical 3dgs-smoke sim on the canonical schedule (golden / test / CLI shared)."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


def write_capture_file(frames: list[Frame], path: str | Path) -> Path:
    """Write the capture (.h5 + .json) with the smoke density AND gaussian-transform history."""
    raise NotImplementedError("Stage 1b — implemented after the failing-tests commit")


__all__ = [
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_IMAGE_HW",
    "CANONICAL_MAX_GAUSSIANS",
    "CANONICAL_N",
    "CANONICAL_N_STEPS",
    "CANONICAL_SEED",
    "Frame",
    "run_canonical_smoke_neural_sim",
    "run_smoke_neural_sim",
    "write_capture_file",
]
