"""Smoke-contract tests for the render-similarity metric module.

Stage 1a posture: RED. The metric bodies raise ``NotImplementedError`` (the
correct failure mode per `docs/phases/phase-3-plan.md:1032`); Stage 1b flips
GREEN. Coverage shape per the §3.2.2 socket contract:

- one test per public symbol (`psnr`, `ssim`, `lpips`, `ms_ssim`) for an
  identity pair (sentinel return);
- one test per public symbol for a known-perturbation pair (the metric is
  finite, monotonic-with-noise where applicable);
- error-case tests (shape mismatch → `ValueError`; unsupported dtype →
  `ValueError`).

`ms_ssim` ships as a Phase-4-WU-C shell — even at Stage 1b it raises
`NotImplementedError`. Smoke tests assert that explicit posture.

PBT invariants live in `test_metrics_pbt.py` (Gate 11 + §6.0 item 7).
"""

from __future__ import annotations

import numpy as np
import pytest

from render_similarity import lpips, ms_ssim, psnr, ssim

# ----------------------------------------------------------------------------
# Fixtures: small deterministic image pairs in both supported dtypes.
# ----------------------------------------------------------------------------


def _identity_pair_uint8() -> tuple[np.ndarray, np.ndarray]:
    """A deterministic (H,W,C)=(8,8,3) uint8 image and its identical copy."""
    rng = np.random.default_rng(0)
    a = rng.integers(0, 256, size=(8, 8, 3), dtype=np.uint8)
    return a, a.copy()


def _identity_pair_float32() -> tuple[np.ndarray, np.ndarray]:
    """A deterministic (H,W,C)=(8,8,3) float32 image and its identical copy."""
    rng = np.random.default_rng(0)
    a = rng.random(size=(8, 8, 3), dtype=np.float32)
    return a, a.copy()


def _perturbed_pair_float32() -> tuple[np.ndarray, np.ndarray]:
    """A known-perturbation pair: same base, then b = a + 0.1 (clipped)."""
    rng = np.random.default_rng(1)
    a = rng.random(size=(8, 8, 3), dtype=np.float32)
    b = np.clip(a + np.float32(0.1), 0.0, 1.0).astype(np.float32)
    return a, b


# ----------------------------------------------------------------------------
# Identity-pair contracts — sentinel values for byte-identical inputs.
# ----------------------------------------------------------------------------


def test_psnr_identity_returns_sentinel_uint8() -> None:
    a, b = _identity_pair_uint8()
    out = psnr(a, b)
    # PSNR(x, x) — MSE = 0, formula diverges → contract returns float('inf')
    # as the sentinel for identical pairs (Stage 1b lands).
    assert out == float("inf"), f"PSNR identity must be +inf sentinel; got {out!r}"


def test_psnr_identity_returns_sentinel_float32() -> None:
    a, b = _identity_pair_float32()
    out = psnr(a, b)
    assert out == float("inf"), f"PSNR identity must be +inf sentinel; got {out!r}"


def test_ssim_identity_returns_one() -> None:
    a, b = _identity_pair_float32()
    out = ssim(a, b)
    assert out == pytest.approx(1.0, abs=1e-12), f"SSIM identity must be 1.0; got {out!r}"


def test_lpips_identity_near_zero() -> None:
    a, b = _identity_pair_float32()
    out = lpips(a, b)
    # LPIPS(x, x) ≈ 0 within the network's floating-point floor; Stage 1b
    # establishes the exact bound via D-ANCHOR self-consistency.
    assert out == pytest.approx(0.0, abs=1e-4), f"LPIPS identity must be ≈0; got {out!r}"


# ----------------------------------------------------------------------------
# Known-perturbation contracts — finite, ordered correctly.
# ----------------------------------------------------------------------------


def test_psnr_perturbed_pair_finite_and_positive() -> None:
    a, b = _perturbed_pair_float32()
    out = psnr(a, b)
    # Non-identical pair → finite, positive (PSNR is always ≥ 0 for normalized
    # inputs and finite when MSE > 0).
    assert np.isfinite(out), f"PSNR non-identity must be finite; got {out!r}"
    assert out > 0.0


def test_ssim_perturbed_pair_in_unit_interval() -> None:
    a, b = _perturbed_pair_float32()
    out = ssim(a, b)
    # SSIM is in [-1, 1] (Wang 2004 §3.B); for non-pathological natural pairs
    # in [0, 1] it stays in [0, 1] — Stage 1b lands the exact value.
    assert -1.0 <= out <= 1.0, f"SSIM must be in [-1, 1]; got {out!r}"
    assert out < 1.0, "SSIM of perturbed pair must be < 1.0 (non-identical)"


def test_lpips_perturbed_pair_positive() -> None:
    a, b = _perturbed_pair_float32()
    out = lpips(a, b)
    # LPIPS ≥ 0 by definition; non-identical pair → > 0.
    assert out >= 0.0, f"LPIPS must be ≥ 0; got {out!r}"
    assert out > 0.0, "LPIPS of perturbed pair must be > 0 (non-identical)"


# ----------------------------------------------------------------------------
# `ms_ssim` shell contract — explicit NotImplementedError until Phase 4 WU-C.
# ----------------------------------------------------------------------------


def test_ms_ssim_raises_not_implemented() -> None:
    a, b = _identity_pair_float32()
    with pytest.raises(NotImplementedError, match=r"Phase 4 WU-C|ms_ssim"):
        ms_ssim(a, b)


# ----------------------------------------------------------------------------
# Error-case contracts — shape mismatch → ValueError; dtype mismatch → ValueError.
# ----------------------------------------------------------------------------


@pytest.mark.parametrize("metric", [psnr, ssim, lpips])
def test_shape_mismatch_raises_value_error(metric: object) -> None:
    a = np.zeros((8, 8, 3), dtype=np.float32)
    b = np.zeros((16, 16, 3), dtype=np.float32)
    with pytest.raises(ValueError, match=r"shape|size|dimensions"):
        metric(a, b)  # type: ignore[operator]


@pytest.mark.parametrize("metric", [psnr, ssim, lpips])
def test_unsupported_dtype_raises_value_error(metric: object) -> None:
    a = np.zeros((8, 8, 3), dtype=np.float64)  # float64 not supported
    b = np.zeros((8, 8, 3), dtype=np.float64)
    with pytest.raises(ValueError, match=r"dtype|float64|uint8|float32"):
        metric(a, b)  # type: ignore[operator]
