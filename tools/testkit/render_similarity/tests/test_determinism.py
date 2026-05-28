"""D-DET measurement (charter § 5 + Stage-0 amendment block + Stage-1b §).

Stage-1b lean: **bit-exact / same-stack-same-hw**, CPU-only LPIPS
(``model.eval()`` + ``torch.no_grad()`` + pinned weights). PSNR and SSIM are
pure numpy / skimage pipelines — trivially bit-exact when called in the same
process with the same op-order. LPIPS is a torch forward pass through
pretrained AlexNet / VGG features; CPU-only avoids the non-associative CUDA
parallel reductions that would break bit-exactness.

This test MEASURES the claim. STOP-DET only fires if the measurement
falsifies *and* the EFECT bound is un-derivable; the bit-exact result here
locks the registry declaration (charter § 2 Stage 1b acceptance).

R-4 caveat: a consumer running LPIPS on GPU will produce a different value
(different reduction order). The CPU value is the determinism *gate*; the
docstring in `metrics.py` documents this for callers.
"""

from __future__ import annotations

import numpy as np

from render_similarity import lpips, psnr, ssim


def _make_pair() -> tuple[np.ndarray, np.ndarray]:
    """Deterministic perturbed image pair (64x64x3 float32)."""
    rng = np.random.default_rng(42)
    a = rng.random(size=(64, 64, 3), dtype=np.float32)
    b = np.clip(a + np.float32(0.1), 0.0, 1.0).astype(np.float32)
    return a, b


def test_psnr_bit_exact_same_stack_same_hw() -> None:
    """PSNR is bit-exact across two calls on the same inputs."""
    a, b = _make_pair()
    out_1 = psnr(a, b)
    out_2 = psnr(a, b)
    # `==` (not approx) — pure numpy MSE + math.log10 is op-order-stable.
    assert out_1 == out_2, f"PSNR not bit-exact across runs: {out_1!r} vs {out_2!r}"


def test_ssim_bit_exact_same_stack_same_hw() -> None:
    """SSIM (skimage) is bit-exact across two calls on the same inputs."""
    a, b = _make_pair()
    out_1 = ssim(a, b)
    out_2 = ssim(a, b)
    assert out_1 == out_2, f"SSIM not bit-exact across runs: {out_1!r} vs {out_2!r}"


def test_lpips_bit_exact_same_stack_same_hw_cpu_eval_alex() -> None:
    """LPIPS (CPU eval + no_grad + pinned bundled weights) bit-exact across runs.

    The D-DET declaration is **bit-exact / same-stack-same-hw**. Two
    LPIPS calls on the same (image_a, image_b) pair must produce
    byte-identical floats. STOP-DET fires if this fails and the EFECT
    bound is un-derivable.
    """
    a, b = _make_pair()
    out_1 = lpips(a, b, net="alex")
    out_2 = lpips(a, b, net="alex")
    assert out_1 == out_2, (
        f"LPIPS not bit-exact across CPU runs: {out_1!r} vs {out_2!r}; "
        "STOP-DET would fire if EFECT bound cannot be derived "
        "(charter § 6 STOP-DET)."
    )


def test_lpips_bit_exact_vgg_net() -> None:
    """LPIPS bit-exactness extends to net='vgg' (D-DET covers both)."""
    a, b = _make_pair()
    out_1 = lpips(a, b, net="vgg")
    out_2 = lpips(a, b, net="vgg")
    assert out_1 == out_2, f"LPIPS(net='vgg') not bit-exact across CPU runs: {out_1!r} vs {out_2!r}"
