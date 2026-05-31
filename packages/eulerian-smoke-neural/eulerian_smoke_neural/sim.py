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
    from common_3dgs import Camera, render
    from eulerian_smoke_stack_e.reference import canonical_params_3d, stable_fluids_step_3d
    from eulerian_smoke_stack_e.sim import _taylor_green_initial_condition

    from .coupling import build_smoke_gaussians

    params = canonical_params_3d()
    if n != int(params["n"]):
        params = {**params, "n": n, "dx": 1.0 / n}
    u, v, w, density = _taylor_green_initial_condition(n, seed)

    # Fixed canonical camera looking at the smoke cube centre from outside (-Z), up = +Y.
    camera = Camera.look_at(
        (0.5, 0.5, -1.5),
        (0.5, 0.5, 0.5),
        (0.0, 1.0, 0.0),
        fov_y=0.9,
        image_height=image_height,
        image_width=image_width,
    )
    frames: list[Frame] = []

    def _emit(step: int, dens: np.ndarray) -> None:
        model = build_smoke_gaussians(dens, max_gaussians=max_gaussians)
        npy = model.to_numpy()
        image = render(
            model,
            camera,
            image_height=image_height,
            image_width=image_width,
            background=(0.0, 0.0, 0.0),
        )
        frames.append(
            Frame(
                step=step,
                image=np.asarray(image, dtype=np.float32),
                gaussian_positions=npy["positions"].astype(np.float32),
                gaussian_opacities=npy["opacities"].astype(np.float32),
                density=dens.copy(),
            )
        )

    _emit(0, density)
    for step in range(1, n_steps + 1):
        u, v, w, density, _p = stable_fluids_step_3d(u, v, w, density, params)
        if step % capture_interval == 0 or step == n_steps:
            _emit(step, density)
    return frames


def run_canonical_smoke_neural_sim(*, seed: int = 0) -> list[Frame]:
    """Run the canonical 3dgs-smoke sim on the canonical schedule (golden / test / CLI shared)."""
    return run_smoke_neural_sim(
        n=CANONICAL_N,
        n_steps=CANONICAL_N_STEPS,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        image_height=CANONICAL_IMAGE_HW,
        image_width=CANONICAL_IMAGE_HW,
        max_gaussians=CANONICAL_MAX_GAUSSIANS,
        seed=seed,
    )


def write_capture_file(frames: list[Frame], path: str | Path) -> Path:
    """Write the capture (.h5 + .json) with the smoke density AND gaussian-transform history."""
    from typing import Any

    from common_warp import Capture, write_capture
    from common_warp.capture.model import state_key

    if not frames:
        raise ValueError("no frames to capture")
    n = int(frames[0].density.shape[0])
    payload: dict[str, np.ndarray] = {}
    for fr in frames:
        payload[state_key(fr.step, "density")] = fr.density.astype(np.float64)
        payload[state_key(fr.step, "gaussian_positions")] = fr.gaussian_positions.astype(np.float32)
        payload[state_key(fr.step, "gaussian_opacities")] = fr.gaussian_opacities.astype(np.float32)

    manifest: dict[str, Any] = {
        "schema_version": "1.0.0",
        "sim": {
            "category": "neural-rendered",
            "name": "eulerian-smoke-neural",
            "variant": "3dgs-smoke",
        },
        "stack": {"build_id": "phase-4-batch-2", "name": "warp-cpu", "version": "0.0.0"},
        "config": {
            "dims": [n, n, n],
            "dtype": "f64",
            "seed": CANONICAL_SEED,
            "tier": "reference",
            "params": {"n_gaussians": int(frames[0].gaussian_positions.shape[0]), "grid_n": n},
        },
        "run": {
            "capture_interval": CANONICAL_CAPTURE_INTERVAL,
            "start_utc": "2026-05-31T00:00:00Z",
            "step_count": int(frames[-1].step),
            "wall_clock_seconds": 0.0,
        },
        "payload": {"format": "hdf5"},
        "determinism": {"atomic_ops": False, "claimed": "bit-exact-same-hw", "subgroup_ops": False},
    }
    write_capture(Capture(manifest=manifest, payload=payload), path)
    return Path(path)


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
