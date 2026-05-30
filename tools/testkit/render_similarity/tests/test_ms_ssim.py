"""``ms_ssim`` value + property tests (Wang, Simoncelli & Bovik 2003).

Mutation-kill coverage for the multi-scale-SSIM math: identity sentinel,
symmetry, monotonic degradation, bounded range, dtype branch, small-image guard,
adaptive scale count.
"""

from __future__ import annotations

import numpy as np
import pytest

from render_similarity import ms_ssim


def _img(seed: int, hw: int = 32) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.random((hw, hw, 3), dtype=np.float32)


def test_identity_is_one_float32() -> None:
    a = _img(0)
    assert ms_ssim(a, a) == pytest.approx(1.0, abs=1e-6)


def test_identity_is_one_uint8() -> None:
    a = (_img(1) * 255).astype(np.uint8)
    assert ms_ssim(a, a) == pytest.approx(1.0, abs=1e-6)


def test_symmetric() -> None:
    a, b = _img(2), _img(3)
    assert ms_ssim(a, b) == pytest.approx(ms_ssim(b, a), abs=1e-9)


def test_bounded_below_one_for_distinct() -> None:
    a, b = _img(4), _img(5)
    v = ms_ssim(a, b)
    assert -1.0 <= v < 1.0


def test_monotone_more_noise_lower_score() -> None:
    a = _img(6)
    rng = np.random.default_rng(7)
    small = np.clip(a + 0.05 * rng.standard_normal(a.shape).astype(np.float32), 0.0, 1.0)
    large = np.clip(a + 0.30 * rng.standard_normal(a.shape).astype(np.float32), 0.0, 1.0)
    assert ms_ssim(a, small) > ms_ssim(a, large)


def test_blur_reduces_score() -> None:
    from scipy.ndimage import gaussian_filter

    a = _img(8)
    blurred = gaussian_filter(a, sigma=(2.0, 2.0, 0.0)).astype(np.float32)
    assert ms_ssim(a, blurred) < 1.0


def test_small_image_raises() -> None:
    tiny = np.zeros((1, 1, 3), np.float32)
    with pytest.raises(ValueError, match="too small"):
        ms_ssim(tiny, tiny)


def test_adapts_scales_for_small_but_valid_image() -> None:
    # 4x4 → floor(log2(4)) = 2 scales; identity still 1.0, distinct < 1.0.
    a = _img(9, hw=4)
    assert ms_ssim(a, a) == pytest.approx(1.0, abs=1e-6)
    assert ms_ssim(a, _img(10, hw=4)) < 1.0
