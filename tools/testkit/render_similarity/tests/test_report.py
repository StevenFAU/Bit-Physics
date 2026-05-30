"""``RenderSimilarityReport`` tests — construction + threshold verdict logic."""

from __future__ import annotations

import numpy as np

from render_similarity import RenderSimilarityReport


def _img(seed: int) -> np.ndarray:
    return np.random.default_rng(seed).random((32, 32, 3), dtype=np.float32)


def test_evaluate_identity_passes_reasonable_thresholds() -> None:
    a = _img(0)
    report = RenderSimilarityReport.evaluate(
        a, a, thresholds={"psnr_min": 30.0, "ssim_min": 0.9, "ms_ssim_min": 0.9, "lpips_max": 0.1}
    )
    assert report.passed is True
    assert report.psnr == float("inf")
    assert report.ssim == 1.0
    assert report.ms_ssim == 1.0
    assert report.lpips <= 0.1


def test_evaluate_fails_when_a_min_threshold_unmet() -> None:
    a = _img(1)
    # ssim of identical pair is 1.0; demand an impossible 1.5 → fail.
    report = RenderSimilarityReport.evaluate(a, a, thresholds={"ssim_min": 1.5})
    assert report.passed is False


def test_evaluate_fails_when_a_max_threshold_exceeded() -> None:
    a, b = _img(2), _img(3)
    # Distinct images → lpips well above 0; demand lpips_max 0.0 → fail.
    report = RenderSimilarityReport.evaluate(a, b, thresholds={"lpips_max": 0.0})
    assert report.passed is False


def test_unknown_threshold_keys_are_ignored() -> None:
    a = _img(4)
    report = RenderSimilarityReport.evaluate(a, a, thresholds={"nonexistent_min": 5.0})
    assert report.passed is True
    assert report.thresholds == {"nonexistent_min": 5.0}
