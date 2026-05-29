"""MPM-step -> coupling -> render pipeline (the sim driver).

Consumes the Phase-2 MPM kernel sequence (``compute_particle_stresses -> p2g_with_stress ->
grid_update -> g2p -> deformation_update -> advect_particles``; per-particle ``F (N,3,3)
f64`` read after ``deformation_update``), :mod:`gs_mpm.coupling`, and common-3dgs ``render``.

Determinism (D-DET): MPM is bit-exact-same-hw (serial ``wp.launch`` f64), the coupling is
sign-fixed, and common-3dgs ``render`` is bit-exact-same-hw -> the end-to-end pipeline is
deterministic run-to-run on a fixed host.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from common_3dgs import Camera, GaussianSplatModel, render
from mpm_multimaterial_stack_e.reference.mls_mpm_warp import (
    CANONICAL_LAMBDA,
    CANONICAL_MU,
    advect_particles,
    compute_particle_stresses,
    deformation_update,
    g2p,
    grid_update,
    p2g_with_stress,
)

from .scene import BLOB_CENTER, BLOB_INITIAL_VZ, GRID_N, CanonicalScene

# Coupled-sim physics (small/coarse for CPU tractability + render determinism). dt/steps
# tuned so the blob impacts the floor and visibly deforms (the coupling is observable in
# the Gaussian scale/rotation) while det(F) stays > 0 throughout (no element inversion ->
# the def_grad_determinant_positive PBT holds for this canonical IC).
DT = 1.0e-3
GRAVITY_Z = -9.81
FLOOR_Z_INDEX = 4
DENSITY = 1.0e3
BLOB_RADIUS_VOLUME = (4.0 / 3.0) * np.pi * 0.15**3

#: Canonical coupled-sim schedule (used by the CLI, golden generation, and tests).
CANONICAL_N_STEPS = 300
CANONICAL_CAPTURE_INTERVAL = 100
CANONICAL_IMAGE_HW = 96  # >= 64 so LPIPS-AlexNet accepts the render-similarity input

# Canonical render camera (looks down +Z toward the blob; up = +Y, non-degenerate).
CAMERA_EYE = (0.5, 0.5, -1.0)
CAMERA_FOV_Y = 0.8
BACKGROUND = (0.0, 0.0, 0.0)


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


def _canonical_camera(image_height: int, image_width: int) -> Camera:
    return Camera.look_at(
        CAMERA_EYE,
        BLOB_CENTER,
        fov_y=CAMERA_FOV_Y,
        image_height=image_height,
        image_width=image_width,
    )


def run_coupled_sim(
    scene: CanonicalScene,
    *,
    n_steps: int,
    capture_interval: int,
    image_height: int,
    image_width: int,
    seed: int = 0,
) -> list[Frame]:
    """Run the coupled MPM->3DGS sim; return the captured/rendered frames."""
    n = scene.n
    grid_n = GRID_N
    grid_dx = 1.0 / grid_n

    # MPM particle state (1:1 with the Gaussians).
    pos = scene.mpm_positions.copy()
    vel = np.zeros((n, 3), dtype=np.float64)
    vel[:, 2] = BLOB_INITIAL_VZ
    mass = np.full(n, DENSITY * BLOB_RADIUS_VOLUME / n, dtype=np.float64)
    material_id = np.zeros(n, dtype=np.int32)
    affine_c = np.zeros((n, 3, 3), dtype=np.float64)
    fgrad = np.tile(np.eye(3, dtype=np.float64), (n, 1, 1))
    stress = np.zeros((n, 3, 3), dtype=np.float64)
    volume_p = np.full(n, BLOB_RADIUS_VOLUME / n, dtype=np.float64)

    grid_mass = np.zeros((grid_n, grid_n, grid_n), dtype=np.float64)
    grid_mom = np.zeros((grid_n, grid_n, grid_n, 3), dtype=np.float64)
    vel_new = np.zeros_like(vel)
    affine_c_new = np.zeros_like(affine_c)

    camera = _canonical_camera(image_height, image_width)
    rest_scales = scene.scales.astype(np.float64)
    rest_quats = scene.rotations.astype(np.float64)

    frames: list[Frame] = []

    def _emit(step: int) -> None:
        from .coupling import couple_gaussians

        g_scales, g_quats = couple_gaussians(rest_scales, rest_quats, fgrad)
        model = GaussianSplatModel(
            positions=pos.astype(np.float32),
            scales=g_scales.astype(np.float32),
            rotations=g_quats.astype(np.float32),
            opacities=scene.opacities,
            sh_coefficients=scene.sh_coefficients,
        )
        image = render(
            model, camera, image_height=image_height, image_width=image_width, background=BACKGROUND
        )
        frames.append(
            Frame(
                step=step,
                image=np.asarray(image, dtype=np.float32),
                gaussian_positions=pos.copy().astype(np.float32),
                gaussian_scales=g_scales.astype(np.float32),
                gaussian_rotations=g_quats.astype(np.float32),
                particle_pos=pos.copy(),
                particle_F=fgrad.copy(),
            )
        )

    _emit(0)
    for step in range(1, n_steps + 1):
        compute_particle_stresses(fgrad, material_id, CANONICAL_MU, CANONICAL_LAMBDA, stress)
        grid_mass.fill(0.0)
        grid_mom.fill(0.0)
        p2g_with_stress(
            pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, grid_dx, DT
        )
        grid_update(grid_mass, grid_mom, GRAVITY_Z, DT, FLOOR_Z_INDEX)
        g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, grid_dx)
        vel[:] = vel_new
        affine_c[:] = affine_c_new
        deformation_update(fgrad, affine_c, DT)
        advect_particles(pos, vel, DT, grid_n, grid_dx)
        if step % capture_interval == 0 or step == n_steps:
            _emit(step)

    return frames


def run_canonical_sim(scene: CanonicalScene | None = None, *, seed: int = 0) -> list[Frame]:
    """Run the canonical coupled sim on the canonical schedule (golden / test / CLI shared)."""
    if scene is None:
        from .scene import build_canonical_scene

        scene = build_canonical_scene(seed=seed)
    return run_coupled_sim(
        scene,
        n_steps=CANONICAL_N_STEPS,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        image_height=CANONICAL_IMAGE_HW,
        image_width=CANONICAL_IMAGE_HW,
        seed=seed,
    )


def write_capture_file(frames: list[Frame], path: str | Path) -> Path:
    """Write the capture (.h5 + .json, schema 1.0.0) with BOTH MPM particle state AND
    Gaussian-set state (spec-ref § 7). Returns the base path."""
    from common_warp import Capture, write_capture
    from common_warp.capture.model import state_key

    if not frames:
        raise ValueError("no frames to capture")
    n_g = int(frames[0].gaussian_scales.shape[0])
    n_p = int(frames[0].particle_pos.shape[0])
    payload: dict[str, np.ndarray] = {}
    for fr in frames:
        payload[state_key(fr.step, "particle_pos")] = fr.particle_pos.astype(np.float64)
        payload[state_key(fr.step, "particle_F")] = fr.particle_F.astype(np.float64)
        payload[state_key(fr.step, "gaussian_positions")] = fr.gaussian_positions.astype(np.float32)
        payload[state_key(fr.step, "gaussian_scales")] = fr.gaussian_scales.astype(np.float32)
        payload[state_key(fr.step, "gaussian_rotations")] = fr.gaussian_rotations.astype(np.float32)

    manifest = {
        "schema_version": "1.0.0",
        "sim": {
            "category": "neural-rendered",
            "name": "3dgs-mpm",
            "variant": "physgaussian-coupling",
        },
        "stack": {"build_id": "phase-3", "name": "warp-cpu", "version": "0.0.0"},
        "config": {
            "dims": [GRID_N, GRID_N, GRID_N],
            "dtype": "f64",
            "seed": 0,
            "tier": "reference",
            "params": {
                "n_gaussians": n_g,
                "n_particles": n_p,
                "grid_n": GRID_N,
                "dt": DT,
                "gravity_z": GRAVITY_Z,
                "floor_z_index": FLOOR_Z_INDEX,
            },
        },
        "run": {
            "capture_interval": CANONICAL_CAPTURE_INTERVAL,
            # Fixed (NOT wall-clock) so the capture is byte-reproducible (D-DET).
            "start_utc": "2026-05-29T00:00:00Z",
            "step_count": int(frames[-1].step),
            "wall_clock_seconds": 0.0,
        },
        "payload": {"format": "hdf5"},
        "determinism": {
            "atomic_ops": False,
            "claimed": "bit-exact-same-hw",
            "subgroup_ops": False,
        },
    }
    write_capture(Capture(manifest=manifest, payload=payload), path)
    return Path(path)
