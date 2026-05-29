"""Prong 2 — perceptual render-similarity golden (gate-4 Cat-3).

Renders the canonical coupled sim's frames and compares them to the project's OWN committed
golden renders (``tools/testkit/golden/renders/3dgs-mpm-canonical-frame-{N}.png``) via
task-2's ``render_similarity`` harness. This is a DETERMINISTIC own-pipeline regression
(common-3dgs's rasterizer is bit-exact/same-hw): the metrics MUST clear the §2.12 floors
(PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15) and should be byte-identical (PSNR = inf). A
below-floor result is a STOP-RENDER-FLOOR (rasterization non-determinism or a coupling bug),
NOT a quality-flag close (charter §1.3-8 / §6 D-RENDER-DET).

At Stage 1a these are RED (the sim raises ``NotImplementedError`` and the goldens are not yet
generated); they go GREEN at Stage 1b-3 once the goldens are committed.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from render_similarity import lpips, psnr, ssim

from gs_mpm.scene import build_canonical_scene
from gs_mpm.sim import run_coupled_sim

CANONICAL_STEPS = 64
CAPTURE_INTERVAL = 32
IMAGE_HW = 96  # >= 64 so LPIPS-AlexNet accepts the input (render-similarity lesson)


def _load_png(path: Path) -> np.ndarray:
    from PIL import Image

    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0


def _render_canonical_frames() -> list:
    scene = build_canonical_scene(seed=0)
    return run_coupled_sim(
        scene,
        n_steps=CANONICAL_STEPS,
        capture_interval=CAPTURE_INTERVAL,
        image_height=IMAGE_HW,
        image_width=IMAGE_HW,
        seed=0,
    )


def test_golden_renders_exist(golden_renders_dir: Path) -> None:
    """The committed golden renders are present (LFS-tracked)."""
    frames = sorted(golden_renders_dir.glob("3dgs-mpm-canonical-frame-*.png"))
    assert len(frames) >= 2, f"expected >= 2 golden renders in {golden_renders_dir}"


def test_render_similarity_clears_floors(
    golden_renders_dir: Path,
    render_similarity_tolerance: dict[str, float],
) -> None:
    """Each rendered canonical frame clears the §2.12 floors vs its committed golden."""
    frames = _render_canonical_frames()
    assert frames, "no frames rendered"
    checked = 0
    for fr in frames:
        golden_path = golden_renders_dir / f"3dgs-mpm-canonical-frame-{fr.step}.png"
        if not golden_path.exists():
            continue
        golden = _load_png(golden_path)
        got = np.asarray(fr.image, dtype=np.float32)
        assert got.shape == golden.shape
        p = psnr(got, golden)
        s = ssim(got, golden)
        lp = lpips(got, golden, net="alex")
        tol = render_similarity_tolerance
        step = fr.step
        assert p >= tol["psnr_min"], f"PSNR {p} below floor @frame {step}"
        assert s >= tol["ssim_min"], f"SSIM {s} below floor @frame {step}"
        assert lp <= tol["lpips_max"], f"LPIPS {lp} above ceiling @frame {step}"
        checked += 1
    assert checked >= 2, "fewer than 2 frames matched a committed golden"
