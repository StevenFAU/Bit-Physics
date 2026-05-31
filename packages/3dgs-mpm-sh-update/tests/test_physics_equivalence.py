"""Physics-equivalence vs the parent (spec §5.11: the underlying physics verification runs).

The SH-update changes ONLY the SH coefficients — the MPM kernels, constants, and particle
positions are identical to the parent ``gs_mpm``. So the per-frame particle positions and
deformation gradients MUST be bit-equal to the parent's canonical run (the SH-update adds no
new physics axis). RED at Stage 1a (the sim raises ``NotImplementedError``); GREEN at 1b.
"""

from __future__ import annotations

import numpy as np

from gs_mpm_sh_update.scene import build_sh_update_scene
from gs_mpm_sh_update.sim import (
    CANONICAL_CAPTURE_INTERVAL,
    CANONICAL_IMAGE_HW,
    CANONICAL_N_STEPS,
    run_sh_update_sim,
)


def test_mpm_trajectory_matches_parent() -> None:
    """particle_pos + particle_F per frame are bit-equal to gs_mpm's canonical MPM run."""
    from gs_mpm.scene import build_canonical_scene
    from gs_mpm.sim import run_canonical_sim

    parent_frames = run_canonical_sim(scene=build_canonical_scene(seed=0), seed=0)
    sh_frames = run_sh_update_sim(
        build_sh_update_scene(seed=0),
        n_steps=CANONICAL_N_STEPS,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        image_height=CANONICAL_IMAGE_HW,
        image_width=CANONICAL_IMAGE_HW,
        seed=0,
    )
    assert len(sh_frames) == len(parent_frames)
    for a, b in zip(sh_frames, parent_frames, strict=True):
        assert a.step == b.step
        assert np.array_equal(a.particle_pos, b.particle_pos), f"pos mismatch @{a.step}"
        assert np.array_equal(a.particle_F, b.particle_F), f"F mismatch @{a.step}"
