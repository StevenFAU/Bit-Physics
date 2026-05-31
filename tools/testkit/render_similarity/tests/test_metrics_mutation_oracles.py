"""Oracle-grounded mutation-hardening tests for ``render_similarity.metrics``.

Phase-4.1 foundation-hardening pass (`docs/_audits/phase-4/foundation-hardening-*.md`).
Every assertion here is grounded in an INDEPENDENT ORACLE — a published constant,
a cited anchor equation re-derived in-test, or a hand-computed value — NEVER a
snapshot of the code's current output. The mutation score is a proxy for
verification strength; these tests strengthen the thing it proxies.

Oracle provenance:
- ``_MS_SSIM_WEIGHTS``: Wang, Simoncelli & Bovik 2003 ("Multiscale structural
  similarity for image quality assessment", IEEE Asilomar) Table 1 standard
  5-scale weights.
- ``_to_luminance``: ITU-R BT.601 luma coefficients (0.299 R, 0.587 G, 0.114 B).
- ``_downsample_2x``: 2x2 box average — hand-computed on a constructed array.
- ``_ssim_l_cs``: Wang et al. 2004 ("Image Quality Assessment", IEEE TIP) Eq. 6
  luminance/contrast/structure, with the canonical SSIM Gaussian window
  (sigma=1.5, truncate=3.5) and K1=0.01, K2=0.03 stabilizers — re-derived
  in-test independently of the implementation.
- ``ms_ssim``: Wang/Simoncelli/Bovik 2003 Eq. 7 weighted-geometric-mean
  assembly — re-derived from the independently-validated component functions.
- ``lpips`` input normalization: Zhang et al. 2018 / the ``lpips`` package input
  convention (tensors in [-1, 1] via ``x_in = (x / MAX_I) * 2 - 1``).
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from render_similarity import lpips, ms_ssim
from render_similarity.metrics import (
    _MS_SSIM_WEIGHTS,
    _downsample_2x,
    _ssim_l_cs,
    _to_luminance,
)

# ----------------------------------------------------------------------------
# MS-SSIM per-scale weights — Wang/Simoncelli/Bovik 2003 Table 1 (published).
# ----------------------------------------------------------------------------


def test_ms_ssim_weights_match_wang2003_table1() -> None:
    """The 5 per-scale weights are the published Wang/Simoncelli/Bovik 2003 Table-1 values.

    Anchored to the external reference, not to the code: a mutated weight
    constant is detected here. The standard weights sum to ~1 (the algorithm
    renormalises the used prefix, but the canonical 5-scale set is ~1.0001).
    """
    assert _MS_SSIM_WEIGHTS == (0.0448, 0.2856, 0.3001, 0.2363, 0.1333)
    assert sum(_MS_SSIM_WEIGHTS) == pytest.approx(1.0, abs=2e-4)


# ----------------------------------------------------------------------------
# BT.601 luminance — pure-primary + white anchors (hand-derived).
# ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("channel", "expected"),
    [(0, 0.299), (1, 0.587), (2, 0.114)],
)
def test_to_luminance_bt601_primaries(channel: int, expected: float) -> None:
    """A pure-R / pure-G / pure-B image has luminance = the BT.601 coefficient.

    Kills coefficient-value, channel-index, and operator (x//, +/-) mutations on
    the luminance line: a pure primary isolates exactly one coefficient.
    """
    img = np.zeros((4, 4, 3), dtype=np.float32)
    img[..., channel] = 1.0
    lum = _to_luminance(img)
    assert lum.shape == (4, 4)
    assert float(lum[0, 0]) == pytest.approx(expected, abs=1e-12)


def test_to_luminance_white_is_unit_sum() -> None:
    """White (R=G=B=1) → 0.299 + 0.587 + 0.114 = 1.0 (catches +/- sign flips)."""
    lum = _to_luminance(np.ones((4, 4, 3), dtype=np.float32))
    assert float(lum[0, 0]) == pytest.approx(1.0, abs=1e-12)


# ----------------------------------------------------------------------------
# 2x2 box-downsample — hand-computed average + crop-dimension shapes.
# ----------------------------------------------------------------------------


def test_downsample_2x_hand_averaged() -> None:
    """A 2x2 block of 4 distinct values downsamples to their exact mean.

    ``[[1, 2], [3, 4]]`` → ``(1 + 2 + 3 + 4) / 4 = 2.5``. Kills the 0.25 factor,
    the operator (x vs /), and every per-corner term swap/duplicate/sign mutation
    (each corner is distinct, so any reshuffle changes the sum).
    """
    block = np.array([[1.0, 2.0], [3.0, 4.0]], dtype=np.float64)
    out = _downsample_2x(block)
    assert out.shape == (1, 1)
    assert float(out[0, 0]) == pytest.approx(2.5, abs=1e-12)


@pytest.mark.parametrize(
    ("shape", "expected_shape"),
    [((5, 8), (2, 4)), ((8, 5), (4, 2)), ((3, 8), (1, 4)), ((4, 6), (2, 3))],
)
def test_downsample_2x_crop_dims(shape: tuple[int, int], expected_shape: tuple[int, int]) -> None:
    """Odd / non-square inputs crop to even (H//2*2, W//2*2) then halve.

    Output shape = (H//2, W//2). Kills the crop-dimension mutations
    (``shape[0]`` <-> ``shape[1]`` swap; ``*2`` → ``*3``): under those the strided
    even/odd row (or column) slices become length-mismatched and the add raises.
    """
    arr = np.arange(shape[0] * shape[1], dtype=np.float64).reshape(shape)
    out = _downsample_2x(arr)
    assert out.shape == expected_shape


# ----------------------------------------------------------------------------
# _ssim_l_cs — independent Wang 2004 Eq. 6 re-derivation.
# ----------------------------------------------------------------------------


@pytest.mark.parametrize("data_range", [1.0, 255.0])
def test_ssim_l_cs_matches_wang2004_rederivation(data_range: float) -> None:
    """``_ssim_l_cs`` reproduces an independent Wang-2004 Eq.6 re-derivation.

    The luminance-contrast-structure (full SSIM) and contrast-structure maps are
    re-computed in-test from the canonical SSIM Gaussian window (sigma=1.5,
    truncate=3.5) and K1=0.01 / K2=0.03 stabilizers. This pins the c1, c2,
    gaussian-window, and ``luminance * cs`` (vs ``/``) arithmetic — a mutation in
    any of them diverges from the published-formula re-derivation.

    Parametrised over ``data_range`` in {1.0 (float32), 255.0 (uint8)}: at
    data_range=1.0 the stabilizers ``(0.01 * dr)`` and ``(0.01 / dr)`` coincide,
    so the multiply-vs-divide mutation is only observable at dr != 1 (the uint8
    case pins the ``* data_range`` operator in c1 / c2).
    """
    from scipy.ndimage import gaussian_filter

    rng = np.random.default_rng(11)
    x = (rng.random((32, 32)) * 0.8 + 0.1) * data_range
    y = np.clip(x + 0.15 * data_range * rng.standard_normal((32, 32)), 0.05, 0.95 * data_range)

    c1 = (0.01 * data_range) ** 2  # Wang 2004 §3.B, K1 = 0.01
    c2 = (0.03 * data_range) ** 2  # Wang 2004 §3.B, K2 = 0.03

    def g(arr: np.ndarray) -> np.ndarray:
        return gaussian_filter(arr, sigma=1.5, truncate=3.5)

    mu_x, mu_y = g(x), g(y)
    sigma_xx = g(x * x) - mu_x * mu_x
    sigma_yy = g(y * y) - mu_y * mu_y
    sigma_xy = g(x * y) - mu_x * mu_y
    luminance = (2.0 * mu_x * mu_y + c1) / (mu_x * mu_x + mu_y * mu_y + c1)
    cs = (2.0 * sigma_xy + c2) / (sigma_xx + sigma_yy + c2)
    exp_mssim = float(np.mean(luminance * cs))
    exp_mcs = float(np.mean(cs))

    mssim, mcs = _ssim_l_cs(x, y, data_range)
    assert mssim == pytest.approx(exp_mssim, rel=1e-12, abs=1e-12)
    assert mcs == pytest.approx(exp_mcs, rel=1e-12, abs=1e-12)


# ----------------------------------------------------------------------------
# ms_ssim — full Wang 2003 Eq. 7 assembly re-derivation (square + non-square).
# ----------------------------------------------------------------------------


def _rederive_ms_ssim(a: np.ndarray, b: np.ndarray, max_i: float = 1.0) -> float:
    """Independent Wang/Simoncelli/Bovik 2003 Eq. 7 assembly from validated parts.

    Weighted geometric mean of per-scale contrast-structure (mcs), with the
    luminance term applied only at the coarsest scale; weights are the published
    Table-1 prefix, renormalised. Uses the component functions (independently
    validated above) but assembles them per the published algorithm structure —
    so a mutation in the top-level assembly (scale branch, clip, weight
    indexing/normalisation, ``*=`` accumulation) diverges from this re-derivation.
    """
    x = _to_luminance(a)
    y = _to_luminance(b)
    n_scales = min(len(_MS_SSIM_WEIGHTS), math.floor(math.log2(min(x.shape[0], x.shape[1]))))
    weights = np.array(_MS_SSIM_WEIGHTS[:n_scales], dtype=np.float64)
    weights = weights / weights.sum()
    mcs_per_scale: list[float] = []
    mssim_final = 1.0
    for scale in range(n_scales):
        mssim, mcs = _ssim_l_cs(x, y, max_i)
        if scale == n_scales - 1:
            mssim_final = mssim
        else:
            mcs_per_scale.append(mcs)
            x = _downsample_2x(x)
            y = _downsample_2x(y)
    cs_clamped = np.clip(np.array(mcs_per_scale, dtype=np.float64), 0.0, 1.0)
    product = float(np.prod(cs_clamped ** weights[:-1]))
    product *= float(max(mssim_final, 0.0) ** weights[-1])
    return product


@pytest.mark.parametrize("shape", [(8, 8), (4, 16), (16, 4)])
def test_ms_ssim_full_assembly_rederivation(shape: tuple[int, int]) -> None:
    """``ms_ssim`` reproduces the independent Eq.7 assembly on square + non-square inputs.

    The non-square cases (4x16, 16x4) pin ``min_dim = min(shape[0], shape[1])``
    (the scale-count selector): a ``shape[1], shape[1]`` mutation picks the wrong
    dimension → wrong scale count → divergence. The 8x8 (3-scale) case pins the
    scale-branch, clip, weight indexing/renormalisation, and ``*=`` accumulation.
    """
    rng = np.random.default_rng(13)
    a = rng.random((*shape, 3), dtype=np.float32)
    b = np.clip(a + 0.2 * rng.standard_normal((*shape, 3)).astype(np.float32), 0.0, 1.0).astype(
        np.float32
    )
    expected = _rederive_ms_ssim(a, b)
    assert ms_ssim(a, b) == pytest.approx(expected, rel=1e-9, abs=1e-12)


def test_ms_ssim_min_dim_two_does_not_raise() -> None:
    """A min-dimension-2 image is valid (need >= 2): ms_ssim returns, identity = 1.

    Pins the ``min_dim < 2`` guard boundary: ``<= 2`` or ``< 3`` would wrongly
    reject a 2-row image. floor(log2(2)) = 1 scale.
    """
    a = np.random.default_rng(5).random((2, 8, 3), dtype=np.float32)
    assert ms_ssim(a, a) == pytest.approx(1.0, abs=1e-6)
    b = np.random.default_rng(6).random((2, 8, 3), dtype=np.float32)
    assert ms_ssim(a, b) < 1.0


# ----------------------------------------------------------------------------
# LPIPS input normalization — Zhang 2018 / lpips package [-1, 1] convention.
# ----------------------------------------------------------------------------


def test_lpips_input_normalization_matches_zhang_convention() -> None:
    """``lpips`` normalises inputs by the documented ``(x/MAX_I)*2 - 1`` convention.

    Independent oracle: build the [-1, 1] tensors by the Zhang-2018 / lpips
    package input convention and call the cached model directly; ``lpips()`` must
    match. A mutated normalisation constant (``*2`` → ``/2`` or ``*3``; ``-1`` →
    ``+1``) sends inputs off [-1, 1] and diverges from the convention-correct
    value. (Identity tests cannot catch this — both images transform identically.)
    """
    import torch

    from render_similarity.metrics import _load_lpips_model

    rng = np.random.default_rng(3)
    a = rng.random((64, 64, 3), dtype=np.float32)
    b = rng.random((64, 64, 3), dtype=np.float32)
    max_i = np.float32(1.0)  # float32 inputs → MAX_I = 1.0

    def convention_correct(img: np.ndarray) -> "torch.Tensor":  # noqa: UP037
        # Zhang 2018 / lpips: tensors in [-1, 1] via (x / MAX_I) * 2 - 1.
        n = (img.astype(np.float32) / max_i) * np.float32(2.0) - np.float32(1.0)
        return torch.from_numpy(np.ascontiguousarray(n.transpose(2, 0, 1)))[None, ...]

    model = _load_lpips_model("alex")
    with torch.no_grad():
        expected = float(model(convention_correct(a), convention_correct(b)).item())
    assert lpips(a, b) == expected


def test_lpips_model_params_frozen_for_determinism() -> None:
    """The cached LPIPS model has all parameters frozen (D-DET: no backward graph).

    Pins ``requires_grad_(False)``: leaving params trainable violates the
    determinism contract documented in the module/function docstrings.
    """
    from render_similarity.metrics import _load_lpips_model

    model = _load_lpips_model("alex")
    assert all(not p.requires_grad for p in model.parameters())  # type: ignore[attr-defined]
