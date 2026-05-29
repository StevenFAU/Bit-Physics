"""Gate-14 — STATISTICAL cross-stack equivalence (D-inference ↔ B-inference).

The load-bearing cross-stack gate: the Stack-D (PyTorch) D-inference capture vs
the Stack-B (WGSL) B-inference capture of the SAME trained checkpoint, compared
by **render-similarity** (PSNR/SSIM/LPIPS via the task-2 metric module, direct
import) frame-paired by step index — NOT ``compare_captures``. A learned model
run in PyTorch f32 vs WGSL f32 is NOT bit-equivalent (different conv reductions +
a different stochastic fire RNG), so the gate is STATISTICAL (spec § 2.6 learned
row = distributional; § 5.12).

Bounds read from ``tolerance.toml`` ``[render_similarity.continuous-ca.neural-ca]``
(MEASURED then LOCKED at Stage 1c). A measured value below a § 2.12 floor
(PSNR≥28 / SSIM≥0.85 / LPIPS≤0.15) is a QUALITY-CONCERN flag in the landing
report § 6 — NOT an auto-fail (learned = distributional). The assertion here is
against the LOCKED measured bounds, not the floors.
"""

from __future__ import annotations

import tomllib

import numpy as np
import pytest
from capture import load_capture
from render_similarity import lpips, psnr, ssim

from .conftest import B_INFERENCE_CAPTURE, D_INFERENCE_CAPTURE, REPO_ROOT

pytestmark = pytest.mark.skipif(
    not (D_INFERENCE_CAPTURE.exists() and B_INFERENCE_CAPTURE.exists()),
    reason="D/B-inference captures not present (Stage 1b-D/1b-B generate them)",
)


def _rgb_frames(manifest_path) -> dict[int, np.ndarray]:
    """Map step index -> composited RGB (H, W, 3) float32 [0, 1]."""
    cap = load_capture(manifest_path.with_suffix(".json"))
    frames: dict[int, np.ndarray] = {}
    for stp in cap.steps():
        rgba = np.asarray(stp.state["rgba"], dtype=np.float32)
        alpha = rgba[..., 3:4]
        rgb = np.clip(1.0 - alpha + rgba[..., :3], 0.0, 1.0).astype(np.float32)
        frames[stp.step] = rgb
    return frames


def _locked_bounds() -> dict[str, float]:
    toml = tomllib.loads(
        (REPO_ROOT / "tools/testkit/equivalence/tolerance.toml").read_text(encoding="utf-8")
    )
    return toml["render_similarity"]["continuous-ca"]["neural-ca"]


def test_d_vs_b_render_similarity_within_locked_bounds() -> None:
    d_frames = _rgb_frames(D_INFERENCE_CAPTURE)
    b_frames = _rgb_frames(B_INFERENCE_CAPTURE)
    shared = sorted(set(d_frames) & set(b_frames))
    assert shared, "no shared frame indices between D and B captures"

    # Skip the identical seed frame (step 0) — both stacks share the exact seed,
    # so it would give PSNR=inf and bias the aggregate.
    eval_steps = [s for s in shared if s > 0]
    psnrs = [psnr(d_frames[s], b_frames[s]) for s in eval_steps]
    ssims = [ssim(d_frames[s], b_frames[s]) for s in eval_steps]
    lpipss = [lpips(d_frames[s], b_frames[s], net="alex") for s in eval_steps]

    mean_psnr = float(np.mean(psnrs))
    mean_ssim = float(np.mean(ssims))
    mean_lpips = float(np.mean(lpipss))

    b = _locked_bounds()
    assert mean_psnr >= b["psnr_min"], f"mean PSNR {mean_psnr:.2f} < {b['psnr_min']}"
    assert mean_ssim >= b["ssim_min"], f"mean SSIM {mean_ssim:.4f} < {b['ssim_min']}"
    assert mean_lpips <= b["lpips_max"], f"mean LPIPS {mean_lpips:.4f} > {b['lpips_max']}"
