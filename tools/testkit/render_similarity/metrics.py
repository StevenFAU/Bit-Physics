"""Render-similarity metric functions (`docs/phases/phase-3-plan.md:373-405`).

Stage 1a: scaffold + RED. All bodies raise `NotImplementedError`. Stage 1b
implements per the §3.2.2 contract:

- `psnr` — peak signal-to-noise ratio; `20 * log10(MAX_I / sqrt(MSE))` (PSNR anchor
  hand-derivation, Stage-1b D-ANCHOR Anchor 1). Returns `float('inf')` (sentinel)
  for byte-identical inputs (MSE = 0). Input accepts `(H, W, C)` NumPy arrays of
  `uint8 [0, 255]` OR `float32 [0, 1]` (auto-detect by dtype).
- `ssim` — structural similarity (Wang et al. 2004 "Image Quality Assessment:
  From Error Visibility to Structural Similarity", Eq. 13). Delegates to
  `skimage.metrics.structural_similarity`. Returns `[0, 1]`; `1.0` = identical.
- `lpips` — learned perceptual similarity (Zhang et al. 2018, "The Unreasonable
  Effectiveness of Deep Features as a Perceptual Metric"). Delegates to the
  `lpips` PyPI package. Returns `>= 0`; `0` = identical. `net='alex'` (default)
  or `net='vgg'`. Pretrained weights lazy-loaded on first call (D-WEIGHTS lean:
  runtime fetch + CI cache; see Stage-1b audit).
- `ms_ssim` — multi-scale SSIM SHELL only. Raises `NotImplementedError` until
  Phase 4 WU-C (`docs/phases/phase-3-plan.md:380`); Stage 1b ships the shape so
  task-6/task-8 import-paths land here without code change at Phase 4.

Input validation (Stage 1b lands; the test contract is RED at Stage 1a):
- shape mismatch → `ValueError`;
- dtype outside `{uint8, float32}` → `ValueError`.

Determinism (D-DET): bit-exact / same-stack-same-hw — PSNR and SSIM are pure
NumPy/scikit-image and trivially bit-exact; LPIPS forward pass uses `model.eval()`
+ `torch.no_grad()` + CPU-only + pinned weights (Stage 1b measurement gates the
declaration; STOP-DET re-characterizes if the measurement falsifies).
"""

from __future__ import annotations

from typing import Literal

import numpy as np
from numpy.typing import NDArray

_STAGE_1A_SHELL = "render-similarity Stage 1a scaffold: implementation lands at Stage 1b"


def psnr(image_a: NDArray[np.generic], image_b: NDArray[np.generic]) -> float:
    """Peak signal-to-noise ratio (dB).

    Returns `float('inf')` (sentinel) for byte-identical inputs (MSE = 0).
    Auto-detects scale by dtype: `uint8` → MAX_I = 255; `float32` → MAX_I = 1.0.
    Stage-1b D-ANCHOR Anchor 1 hand-derives `PSNR = 20 * log10(MAX_I / sqrt(MSE))`.

    Raises:
        ValueError: shape mismatch or unsupported dtype (Stage 1b lands; Stage
            1a body raises ``NotImplementedError`` first).
    """
    raise NotImplementedError(_STAGE_1A_SHELL)


def ssim(image_a: NDArray[np.generic], image_b: NDArray[np.generic]) -> float:
    """Structural similarity (Wang et al. 2004, Eq. 13).

    Delegates to `skimage.metrics.structural_similarity` at Stage 1b. Returns a
    scalar in `[0, 1]`; `1.0` indicates identical images.

    Raises:
        ValueError: shape mismatch or unsupported dtype (Stage 1b lands; Stage
            1a body raises ``NotImplementedError`` first).
    """
    raise NotImplementedError(_STAGE_1A_SHELL)


def lpips(
    image_a: NDArray[np.generic],
    image_b: NDArray[np.generic],
    net: Literal["alex", "vgg"] = "alex",
) -> float:
    """Learned perceptual image patch similarity (Zhang et al. 2018).

    Delegates to the `lpips` PyPI package at Stage 1b. Returns a scalar `>= 0`;
    `0` indicates identical (within `torch.float32` floor). `net='alex'` is the
    default (Zhang 2018 reports comparable correlation with human judgement vs
    `'vgg'`); the network choice is documented per consumer (task-6/task-8).
    Pretrained weights lazy-loaded on first call (D-WEIGHTS lean: runtime fetch
    + CI `actions/cache`; sha256-on-first-download per R-3).

    Raises:
        ValueError: shape mismatch or unsupported dtype (Stage 1b lands; Stage
            1a body raises ``NotImplementedError`` first).
    """
    raise NotImplementedError(_STAGE_1A_SHELL)


def ms_ssim(image_a: NDArray[np.generic], image_b: NDArray[np.generic]) -> float:
    """Multi-scale SSIM — SHELL only; lands at Phase 4 WU-C.

    Per `docs/phases/phase-3-plan.md:380`: task-2 ships the function shell so
    task-6/task-8 import-paths land here without code change at the Phase 4
    extension. Stage 1b ships this SHELL with a `NotImplementedError` raise
    distinct from the Stage-1a "scaffold" reason; consumers using `ms_ssim`
    before Phase 4 fail loudly (no silent fallback to `ssim`).

    Raises:
        NotImplementedError: always. Phase 4 WU-C extends.
    """
    raise NotImplementedError(
        "ms_ssim: multi-scale SSIM is a Phase 4 WU-C extension; shell only at Phase 3"
    )
