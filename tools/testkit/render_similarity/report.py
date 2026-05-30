"""``RenderSimilarityReport`` — aggregated render-similarity verdict (§4.2.C).

A small structured carrier bundling the four render-similarity metrics with a
pass/fail verdict against per-metric thresholds. Consumed by the Phase-4.3
neural-rendered sim stages (4.11-4.14) as the render-similarity gate-4 artifact.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from .metrics import lpips, ms_ssim, psnr, ssim


@dataclass
class RenderSimilarityReport:
    """Render-similarity metrics + threshold verdict.

    ``thresholds`` uses ``*_min`` keys for higher-is-better metrics (``psnr``,
    ``ssim``, ``ms_ssim``) and ``*_max`` keys for lower-is-better (``lpips``).
    Absent keys are not gated.
    """

    psnr: float
    ssim: float
    lpips: float
    ms_ssim: float
    passed: bool
    thresholds: dict[str, float]

    @classmethod
    def evaluate(
        cls,
        predicted: NDArray[np.generic],
        target: NDArray[np.generic],
        *,
        thresholds: Mapping[str, float],
        lpips_net: str = "alex",
    ) -> RenderSimilarityReport:
        """Compute all four metrics for ``predicted`` vs ``target`` and verdict."""
        p = psnr(predicted, target)
        s = ssim(predicted, target)
        lp = lpips(predicted, target, lpips_net)  # type: ignore[arg-type]
        ms = ms_ssim(predicted, target)
        values = {"psnr": p, "ssim": s, "ms_ssim": ms, "lpips": lp}
        passed = True
        for key, bound in thresholds.items():
            metric, _, kind = key.rpartition("_")
            if metric not in values:
                continue
            below_min = kind == "min" and values[metric] < bound
            above_max = kind == "max" and values[metric] > bound
            if below_min or above_max:
                passed = False
        return cls(psnr=p, ssim=s, lpips=lp, ms_ssim=ms, passed=passed, thresholds=dict(thresholds))
