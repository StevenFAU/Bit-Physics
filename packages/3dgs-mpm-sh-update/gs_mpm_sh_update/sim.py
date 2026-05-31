"""MPM-step -> covariance coupling -> **SH rotation** -> render pipeline (the sim driver).

Reuses the parent ``gs_mpm`` building blocks UNCHANGED — the Phase-2 MPM kernels +
constants (imported via the ``gs_mpm.sim`` module so the physics is bit-identical),
``gs_mpm.couple_gaussians`` (the covariance ``Sigma'=F A F^T`` path), and the common-3dgs
``render`` — and ADDS the per-frame SH rotation: ``R = polar_rotation(F)`` then
``sh' = rotate_sh_degree1(scene.sh, R)`` before building the ``GaussianSplatModel``. Because
the MPM kernels / constants / particle positions are identical to ``gs_mpm``, the MPM
trajectory + covariance are bit-equal to the parent (physics-equivalence-vs-parent holds by
construction); the ONLY delta is the rotated SH.

Determinism (D-DET): MPM is bit-exact-same-hw (serial ``wp.launch`` f64), the polar rotation
(SVD + ``P R P^T``) is deterministic NumPy, and common-3dgs ``render`` is bit-exact-same-hw
-> the end-to-end pipeline is deterministic run-to-run on a fixed host (MEASURED at Stage 1b).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .scene import SHUpdateScene, build_sh_update_scene
from .sh_rotation import polar_rotation, rotate_sh_degree1

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
    import gs_mpm.sim as mvp  # the parent's exact kernels + constants (physics-equivalence)
    from common_3dgs import GaussianSplatModel, render
    from gs_mpm.coupling import couple_gaussians

    n = scene.n
    grid_n = mvp.GRID_N
    grid_dx = 1.0 / grid_n

    # MPM particle state — initialised identically to gs_mpm.run_coupled_sim.
    pos = scene.mpm_positions.copy()
    vel = np.zeros((n, 3), dtype=np.float64)
    vel[:, 2] = mvp.BLOB_INITIAL_VZ
    mass = np.full(n, mvp.DENSITY * mvp.BLOB_RADIUS_VOLUME / n, dtype=np.float64)
    material_id = np.zeros(n, dtype=np.int32)
    affine_c = np.zeros((n, 3, 3), dtype=np.float64)
    fgrad = np.tile(np.eye(3, dtype=np.float64), (n, 1, 1))
    stress = np.zeros((n, 3, 3), dtype=np.float64)
    volume_p = np.full(n, mvp.BLOB_RADIUS_VOLUME / n, dtype=np.float64)

    grid_mass = np.zeros((grid_n, grid_n, grid_n), dtype=np.float64)
    grid_mom = np.zeros((grid_n, grid_n, grid_n, 3), dtype=np.float64)
    vel_new = np.zeros_like(vel)
    affine_c_new = np.zeros_like(affine_c)

    camera = mvp._canonical_camera(image_height, image_width)
    rest_scales = scene.scales.astype(np.float64)
    rest_quats = scene.rotations.astype(np.float64)
    rest_sh = scene.sh_coefficients.astype(np.float64)

    frames: list[Frame] = []

    def _emit(step: int) -> None:
        g_scales, g_quats = couple_gaussians(rest_scales, rest_quats, fgrad)
        rot = polar_rotation(fgrad)  # R from F = R S (PhysGaussian Eq. (9))
        g_sh = rotate_sh_degree1(rest_sh, rot).astype(np.float32)  # the NEW delta
        model = GaussianSplatModel(
            positions=pos.astype(np.float32),
            scales=g_scales.astype(np.float32),
            rotations=g_quats.astype(np.float32),
            opacities=scene.opacities,
            sh_coefficients=g_sh,
        )
        image = render(
            model,
            camera,
            image_height=image_height,
            image_width=image_width,
            background=mvp.BACKGROUND,
        )
        frames.append(
            Frame(
                step=step,
                image=np.asarray(image, dtype=np.float32),
                gaussian_positions=pos.copy().astype(np.float32),
                gaussian_scales=g_scales.astype(np.float32),
                gaussian_rotations=g_quats.astype(np.float32),
                gaussian_sh=g_sh,
                particle_pos=pos.copy(),
                particle_F=fgrad.copy(),
            )
        )

    _emit(0)
    for step in range(1, n_steps + 1):
        mvp.compute_particle_stresses(
            fgrad, material_id, mvp.CANONICAL_MU, mvp.CANONICAL_LAMBDA, stress
        )
        grid_mass.fill(0.0)
        grid_mom.fill(0.0)
        mvp.p2g_with_stress(
            pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, grid_dx, mvp.DT
        )
        mvp.grid_update(grid_mass, grid_mom, mvp.GRAVITY_Z, mvp.DT, mvp.FLOOR_Z_INDEX)
        mvp.g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, grid_dx)
        vel[:] = vel_new
        affine_c[:] = affine_c_new
        mvp.deformation_update(fgrad, affine_c, mvp.DT)
        mvp.advect_particles(pos, vel, mvp.DT, grid_n, grid_dx)
        if step % capture_interval == 0 or step == n_steps:
            _emit(step)

    return frames


def run_canonical_sh_update_sim(
    scene: SHUpdateScene | None = None, *, seed: int = 0
) -> list[Frame]:
    """Run the canonical SH-update sim on the canonical schedule (golden / test / CLI shared)."""
    if scene is None:
        scene = build_sh_update_scene(seed=seed)
    return run_sh_update_sim(
        scene,
        n_steps=CANONICAL_N_STEPS,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        image_height=CANONICAL_IMAGE_HW,
        image_width=CANONICAL_IMAGE_HW,
        seed=seed,
    )


def write_capture_file(frames: list[Frame], path: str | Path) -> Path:
    """Write the capture (.h5 + .json) with MPM state AND the gaussian-transform history."""
    from common_warp import Capture, write_capture
    from common_warp.capture.model import state_key

    if not frames:
        raise ValueError("no frames to capture")
    n_g = int(frames[0].gaussian_scales.shape[0])
    n_p = int(frames[0].particle_pos.shape[0])
    import gs_mpm.sim as mvp

    grid_n = mvp.GRID_N
    payload: dict[str, np.ndarray] = {}
    for fr in frames:
        payload[state_key(fr.step, "particle_pos")] = fr.particle_pos.astype(np.float64)
        payload[state_key(fr.step, "particle_F")] = fr.particle_F.astype(np.float64)
        payload[state_key(fr.step, "gaussian_positions")] = fr.gaussian_positions.astype(np.float32)
        payload[state_key(fr.step, "gaussian_scales")] = fr.gaussian_scales.astype(np.float32)
        payload[state_key(fr.step, "gaussian_rotations")] = fr.gaussian_rotations.astype(np.float32)
        payload[state_key(fr.step, "gaussian_sh")] = fr.gaussian_sh.astype(np.float32)

    manifest: dict[str, Any] = {
        "schema_version": "1.0.0",
        "sim": {
            "category": "neural-rendered",
            "name": "3dgs-mpm-sh-update",
            "variant": "physgaussian-sh-update",
        },
        "stack": {"build_id": "phase-4-batch-2", "name": "warp-cpu", "version": "0.0.0"},
        "config": {
            "dims": [grid_n, grid_n, grid_n],
            "dtype": "f64",
            "seed": 0,
            "tier": "reference",
            "params": {"n_gaussians": n_g, "n_particles": n_p, "grid_n": grid_n},
        },
        "run": {
            "capture_interval": CANONICAL_CAPTURE_INTERVAL,
            "start_utc": "2026-05-31T00:00:00Z",
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


__all__ = [
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_IMAGE_HW",
    "CANONICAL_N_STEPS",
    "Frame",
    "run_canonical_sh_update_sim",
    "run_sh_update_sim",
    "write_capture_file",
]
