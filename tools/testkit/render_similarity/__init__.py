"""Render-similarity metric module (`docs/architecture.md:673` Layer-0 testkit).

Public surface per `docs/phases/phase-3-plan.md:373-405` (§3.2.2 socket).
Consumed by task-6 (3.2 NCA D↔B golden-render equivalence) and task-8
(3.5 MPM-3DGS golden-render gate); Phase 4 WU-C extends `ms_ssim`.

Functions:
- `psnr(a, b) -> float` — peak signal-to-noise ratio (dB); sentinel for identical pairs.
- `ssim(a, b) -> float` — structural similarity (Wang 2004) in [0, 1]; 1 = identical.
- `lpips(a, b, net='alex'|'vgg') -> float` — learned perceptual similarity
  (Zhang 2018); ≥0; 0 = identical.
- `ms_ssim(a, b) -> float` — multi-scale SSIM (Wang, Simoncelli & Bovik 2003);
  landed at Phase 4 WU-C. 1.0 = identical.
- `RenderSimilarityReport` — aggregated four-metric report + threshold verdict
  (Phase 4 WU-C; §4.2.C).
"""

from __future__ import annotations

from .metrics import lpips, ms_ssim, psnr, ssim
from .report import RenderSimilarityReport

__all__ = ["RenderSimilarityReport", "lpips", "ms_ssim", "psnr", "ssim"]
