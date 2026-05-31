"""Prong 2 — perceptual render-similarity golden (gate-4 Cat-3).

Renders the canonical SH-update coupled sim and compares each frame to the project's OWN
committed golden renders (``tools/testkit/golden/renders/3dgs-mpm-sh-update-canonical-frame-*``)
via the ``render_similarity`` harness. DETERMINISTIC own-pipeline regression (common-3dgs's
rasterizer + the deterministic SH rotation): the metrics MUST clear the §2.12 floors
(PSNR >= 28 / SSIM >= 0.85 / LPIPS <= 0.15). Below-floor = STOP-RENDER-FLOOR (a coupling /
rotation / rasterization-determinism bug), NOT a quality-flag close.

RED at Stage 1a (the sim raises ``NotImplementedError`` + goldens not yet committed); GREEN
at Stage 1b once the goldens are committed.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from render_similarity import lpips, psnr, ssim

from gs_mpm_sh_update.sim import run_canonical_sh_update_sim


def _load_png(path: Path) -> np.ndarray:
    from PIL import Image

    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0


def test_golden_renders_exist(golden_renders_dir: Path) -> None:
    frames = sorted(golden_renders_dir.glob("3dgs-mpm-sh-update-canonical-frame-*.png"))
    assert len(frames) >= 2, f"expected >= 2 golden renders in {golden_renders_dir}"


def test_render_similarity_clears_floors(
    golden_renders_dir: Path, render_similarity_tolerance: dict[str, float]
) -> None:
    frames = run_canonical_sh_update_sim(seed=0)
    assert frames, "no frames rendered"
    checked = 0
    for fr in frames:
        golden_path = golden_renders_dir / f"3dgs-mpm-sh-update-canonical-frame-{fr.step}.png"
        if not golden_path.exists():
            continue
        golden = _load_png(golden_path)
        got = np.asarray(fr.image, dtype=np.float32)
        assert got.shape == golden.shape
        tol = render_similarity_tolerance
        assert psnr(got, golden) >= tol["psnr_min"], f"PSNR below floor @frame {fr.step}"
        assert ssim(got, golden) >= tol["ssim_min"], f"SSIM below floor @frame {fr.step}"
        assert lpips(got, golden, net="alex") <= tol["lpips_max"], f"LPIPS @frame {fr.step}"
        checked += 1
    assert checked >= 2, "fewer than 2 frames matched a committed golden"
