"""Property-based invariants for the render-similarity metrics (Gate 11).

≥ 2 PBT invariants per spec § 2.14 / `docs/phases/phase-3-plan.md:1044`. Three
shipped:

- ``test_psnr_identity_is_sentinel`` — ``psnr(x, x)`` is the +inf sentinel for
  any valid float32 image (D-ANCHOR Anchor-1 grounding: ``MSE = 0`` → sentinel).
- ``test_ssim_identity_is_one`` — ``ssim(x, x) == 1.0`` for any valid float32
  image (Wang 2004 reflexivity).
- ``test_psnr_symmetry`` — ``psnr(a, b) == psnr(b, a)`` (MSE is symmetric in
  its arguments; the PSNR transform is bijective with MSE).

Settings carry ``derandomize=True`` + ``database=None`` so the failing-output
hash is reproducible across runs (gate-13 replay, mirroring common-3dgs Stage
1a precedent — see commit `ed4e501`).
"""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra import numpy as hnp

from render_similarity import psnr, ssim

# Shared image strategy: (H, W, C) float32 in [0, 1], small canvas so the
# in-process LPIPS forward pass (Stage 1b) stays well under the testkit's 300 s
# per-test pytest-timeout ceiling.
_IMAGE_STRATEGY = hnp.arrays(
    dtype=np.float32,
    shape=st.tuples(
        st.integers(min_value=8, max_value=16),
        st.integers(min_value=8, max_value=16),
        st.just(3),
    ),
    elements=st.floats(
        min_value=0.0,
        max_value=1.0,
        allow_nan=False,
        allow_infinity=False,
        width=32,
    ),
)


@settings(max_examples=30, deadline=None, derandomize=True, database=None)
@given(image=_IMAGE_STRATEGY)
def test_psnr_identity_is_sentinel(image: np.ndarray) -> None:
    """psnr(x, x) is the +inf sentinel for any in-domain image."""
    out = psnr(image, image.copy())
    assert out == float("inf"), f"PSNR(x, x) must be +inf sentinel; got {out!r}"


@settings(max_examples=30, deadline=None, derandomize=True, database=None)
@given(image=_IMAGE_STRATEGY)
def test_ssim_identity_is_one(image: np.ndarray) -> None:
    """ssim(x, x) == 1.0 for any in-domain image (Wang 2004 reflexivity)."""
    out = ssim(image, image.copy())
    assert abs(out - 1.0) <= 1e-12, f"SSIM(x, x) must be 1.0; got {out!r}"


@settings(max_examples=20, deadline=None, derandomize=True, database=None)
@given(a=_IMAGE_STRATEGY, b=_IMAGE_STRATEGY)
def test_psnr_symmetry(a: np.ndarray, b: np.ndarray) -> None:
    """psnr(a, b) == psnr(b, a) — MSE is symmetric, so PSNR is symmetric."""
    # Shape-align: PBT may draw distinct (H, W); skip mismatches to keep this
    # invariant about commutativity, not about validation.
    if a.shape != b.shape:
        return
    out_ab = psnr(a, b)
    out_ba = psnr(b, a)
    if out_ab == float("inf") or out_ba == float("inf"):
        # Identical-by-coincidence under PBT — both sides agree on the sentinel.
        assert out_ab == out_ba, f"sentinel mismatch: {out_ab!r} vs {out_ba!r}"
        return
    assert out_ab == out_ba, f"PSNR not symmetric: {out_ab!r} vs {out_ba!r}"
