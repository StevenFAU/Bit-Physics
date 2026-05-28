"""Render-similarity metric functions (`docs/phases/phase-3-plan.md:373-405`).

Stage 1b implementation per the §3.2.2 socket. Functions:

- ``psnr(a, b) -> float`` — peak signal-to-noise ratio in dB. Hand-derivation:
  ``PSNR = 20 * log10(MAX_I / sqrt(MSE))`` (D-ANCHOR Anchor 1; the only
  closed-form metric in this module — no library dependency on the numeric
  path, so it is *the* test fixture for the validation chain). Sentinel:
  ``float('inf')`` for identical inputs (MSE == 0).
- ``ssim(a, b) -> float`` — structural similarity (Wang et al. 2004
  "Image Quality Assessment: From Error Visibility to Structural Similarity",
  Eq. 13; D-ANCHOR Anchor 2). Delegates to
  ``skimage.metrics.structural_similarity`` with ``channel_axis=-1`` and the
  dtype-appropriate ``data_range``. Returns scalar in ``[-1, 1]``; ``1.0`` is
  identical for any non-pathological in-range input.
- ``lpips(a, b, net) -> float`` — learned perceptual similarity (Zhang et al.
  2018 "The Unreasonable Effectiveness of Deep Features as a Perceptual
  Metric"; D-ANCHOR Anchor 3). Delegates to the ``lpips`` PyPI package
  (``lpips==0.1.4`` pinned). CPU-only, ``model.eval()`` + ``torch.no_grad()`` +
  pinned linear-head weights (sha256 asserted on first call per R-3).
  Returns scalar ``>= 0``; ``0`` is identical (within the network's float32
  floor; typical reproducible identity value is ``<1e-4`` for AlexNet).
- ``ms_ssim(a, b) -> float`` — multi-scale SSIM SHELL only; raises
  ``NotImplementedError`` until Phase 4 WU-C (`docs/phases/phase-3-plan.md:380`).

Input validation (`(H, W, C)`, ``uint8 [0, 255]`` OR ``float32 [0, 1]``,
auto-detected by dtype):

- shape mismatch → ``ValueError``;
- dtype outside ``{uint8, float32}`` → ``ValueError``;
- non-3-D input → ``ValueError``;
- non-3-channel input → ``ValueError`` (RGB images only; alpha and grayscale
  flagged as scope-creep into Phase 4).

Determinism (D-DET; charter § 5 / Stage-0 amendment block / Stage-1b §):
**bit-exact / same-stack-same-hw**, CPU-only LPIPS (atomic CUDA reductions
ruled out by D-DET). PSNR/SSIM are pure numeric pipelines (numpy / skimage)
and trivially bit-exact same-op-order. LPIPS bit-exactness measured at
Stage-1b in ``tests/test_determinism.py``; STOP-DET only re-characterizes if
the measurement falsifies.

R-3 mitigation (charter § 7): on first ``lpips`` call we assert the bundled
linear-head ``.pth`` file's sha256 matches a recorded constant
(``_BUNDLED_WEIGHT_HASHES``). The backbone weights (AlexNet ~243 MB / VGG
~530 MB) download via torchvision into ``~/.cache/torch/hub/checkpoints/``;
their integrity is governed by the ``torch``/``torchvision`` lockfile pin
(URL-based, CDN-served; we do NOT vendor them per D-WEIGHTS).
"""

from __future__ import annotations

import hashlib
import math
import threading
import warnings
from pathlib import Path
from typing import Literal

import numpy as np
from numpy.typing import NDArray

# ----------------------------------------------------------------------------
# Internal constants — D-WEIGHTS R-3 mitigation.
# ----------------------------------------------------------------------------

#: sha256 of the lpips==0.1.4 bundled v0.1 linear-head weight files
#: (``site-packages/lpips/weights/v0.1/<net>.pth``). These ship INSIDE the
#: lpips wheel and are bit-identical across Python versions / OSs because they
#: are wheel-embedded content; the pin discipline (``lpips==0.1.4`` in
#: ``tools/testkit/pyproject.toml``) is the version invariant, and this hash
#: is the load-time integrity check (R-3 mitigation: cache corruption /
#: silent bundle change → AssertionError on next call rather than silently
#: divergent perceptual values).
_BUNDLED_WEIGHT_HASHES: dict[str, str] = {
    "alex": "df73285e35b22355a2df87cdb6b70b343713b667eddbda73e1977e0c860835c0",
    "vgg": "a78928a0af1e5f0fcb1f3b9e8f8c3a2a5a3de244d830ad5c1feddc79b8432868",
}

# Lazy-loaded LPIPS network cache (one per net choice); thread-safe init.
_LPIPS_MODEL_CACHE: dict[str, object] = {}
_LPIPS_LOCK = threading.Lock()


def _bundled_weight_path(net: str) -> Path:
    """Locate the lpips-bundled v0.1 linear-head weight file for ``net``."""
    import lpips as _lpips_pkg

    pkg_root = Path(_lpips_pkg.__file__).resolve().parent
    return pkg_root / "weights" / "v0.1" / f"{net}.pth"


def _assert_bundled_weights_hash(net: str) -> None:
    """R-3: assert the bundled linear-head ``.pth`` sha256 matches the pin."""
    expected = _BUNDLED_WEIGHT_HASHES.get(net)
    if expected is None:
        # net is restricted by the Literal type at the public surface; this
        # path is unreachable from typed callers but is the defensive guard.
        raise ValueError(f"unknown LPIPS net {net!r}; choose 'alex' or 'vgg'")
    path = _bundled_weight_path(net)
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise AssertionError(
            f"LPIPS bundled weight {path.name!r} sha256 mismatch — "
            f"got {actual!r}, expected {expected!r}. The lpips package bundle "
            "diverged from the pinned lpips==0.1.4 baseline (R-3 fired)."
        )


def _load_lpips_model(net: str) -> object:
    """Lazy-load + cache the lpips network in CPU-eval mode (D-DET)."""
    with _LPIPS_LOCK:
        if net not in _LPIPS_MODEL_CACHE:
            _assert_bundled_weights_hash(net)
            import lpips as _lpips_pkg
            import torch

            # Suppress lpips==0.1.4's transitive torchvision>=0.13 deprecation
            # UserWarnings — lpips bundles the legacy backbone-load call
            # (`pretrained=True` and positional weight arg). The pin
            # discipline (lpips==0.1.4 + R-3 bundled-weights hash) already
            # gates the integrity of the underlying weights, and the testkit's
            # pytest filterwarnings=["error"] would otherwise turn each
            # transitive deprecation into a hard fail for every LPIPS call
            # site (incl. consumer test code at task-6/task-8). Suppression
            # is module-load-scoped: a real-warning regression (mismatched
            # shape, NaN input) at call-site still escalates because the
            # `with warnings.catch_warnings()` block exits before the forward
            # pass runs.
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    category=UserWarning,
                    module=r"torchvision\.models\._utils",
                )
                model = _lpips_pkg.LPIPS(net=net, verbose=False)
            model.eval()
            # D-DET: CPU-only — atomic CUDA reductions break bit-exactness;
            # consumer code may use GPU for performance but the determinism
            # gate is the CPU value (R-4 cross-hardware caveat).
            for param in model.parameters():
                param.requires_grad_(False)
            _ = torch  # silence "unused" — torch.no_grad context is at call site
            _LPIPS_MODEL_CACHE[net] = model
        return _LPIPS_MODEL_CACHE[net]


# ----------------------------------------------------------------------------
# Input-validation helpers (shared across psnr / ssim / lpips).
# ----------------------------------------------------------------------------


def _validate_pair(a: NDArray[np.generic], b: NDArray[np.generic]) -> None:
    """Validate that ``a`` and ``b`` are compatible (H, W, 3) uint8/float32 pairs."""
    if a.shape != b.shape:
        raise ValueError(f"shape mismatch: a.shape={a.shape} != b.shape={b.shape}")
    if a.ndim != 3:
        raise ValueError(f"expected (H, W, C) 3-D arrays; got a.ndim={a.ndim} dimensions")
    if a.shape[2] != 3:
        raise ValueError(f"expected 3-channel RGB images; got C={a.shape[2]} channels")
    if a.dtype != b.dtype:
        raise ValueError(f"dtype mismatch: a.dtype={a.dtype} != b.dtype={b.dtype}")
    if a.dtype not in (np.dtype(np.uint8), np.dtype(np.float32)):
        raise ValueError(
            f"unsupported dtype {a.dtype}; only uint8 [0, 255] or float32 "
            "[0, 1] are accepted (auto-detected by dtype)"
        )


def _max_intensity(dtype: np.dtype) -> float:
    """Return the per-channel maximum intensity for a supported dtype."""
    # _validate_pair has filtered to {uint8, float32} already.
    if dtype == np.dtype(np.uint8):
        return 255.0
    return 1.0


# ----------------------------------------------------------------------------
# Public surface (§3.2.2).
# ----------------------------------------------------------------------------


def psnr(image_a: NDArray[np.generic], image_b: NDArray[np.generic]) -> float:
    """Peak signal-to-noise ratio (dB).

    Hand-derived formula (D-ANCHOR Anchor 1):

        PSNR = 20 * log10(MAX_I / sqrt(MSE))
             = 10 * log10(MAX_I ** 2 / MSE)

    where ``MAX_I = 255`` for ``uint8`` images and ``MAX_I = 1.0`` for
    ``float32`` images (auto-detected by dtype). For byte-identical inputs
    MSE = 0 and the formula diverges — the contract returns ``float('inf')``
    as the identity sentinel (`docs/phases/phase-3-plan.md:377`).
    """
    _validate_pair(image_a, image_b)
    max_i = _max_intensity(image_a.dtype)
    # Promote to float64 for numerically-stable MSE on uint8 inputs;
    # bit-exactness across runs is trivial (no parallel reductions).
    a64 = image_a.astype(np.float64)
    b64 = image_b.astype(np.float64)
    diff = a64 - b64
    mse = float(np.mean(diff * diff))
    if mse == 0.0:
        return float("inf")
    return float(10.0 * math.log10((max_i * max_i) / mse))


def ssim(image_a: NDArray[np.generic], image_b: NDArray[np.generic]) -> float:
    """Structural similarity (Wang et al. 2004, Eq. 13).

    Delegates to ``skimage.metrics.structural_similarity`` with
    ``channel_axis=-1`` and the dtype-appropriate ``data_range``. Returns a
    scalar in ``[-1, 1]`` (Wang 2004 §3.B); ``1.0`` for identical inputs.
    """
    _validate_pair(image_a, image_b)
    # Local import keeps the package importable even if scikit-image is
    # missing (e.g. during a partial environment); the validation contract
    # is checked first, so import-error surfaces cleanly on first use.
    from skimage.metrics import structural_similarity

    max_i = _max_intensity(image_a.dtype)
    score = structural_similarity(  # type: ignore[no-untyped-call]
        image_a,
        image_b,
        channel_axis=-1,
        data_range=max_i,
    )
    return float(score)


def lpips(
    image_a: NDArray[np.generic],
    image_b: NDArray[np.generic],
    net: Literal["alex", "vgg"] = "alex",
) -> float:
    """Learned perceptual image patch similarity (Zhang et al. 2018).

    Delegates to the ``lpips`` PyPI package (``lpips==0.1.4`` pinned). Returns
    a scalar ``>= 0``; ``0`` indicates identical (within ``torch.float32``
    floor — typical reproducible identity value is ``< 1e-4`` for AlexNet).
    ``net='alex'`` (default; Zhang 2018 reports comparable correlation with
    human judgement vs ``'vgg'``); ``net='vgg'`` available.

    Determinism (D-DET):

    - CPU-only — no CUDA atomic reductions, so the forward pass is bit-exact
      same-stack-same-hw across runs.
    - ``model.eval()`` + ``torch.no_grad()`` — no dropout, no backward graph.
    - Pinned weights — the bundled linear-head ``.pth`` is sha256-asserted on
      first load (R-3 mitigation). Backbone weights download via torchvision
      into ``~/.cache/torch/hub/checkpoints/`` on first call; identity is
      governed by the ``torch``/``torchvision`` lockfile pin.

    R-4 caveat: a consumer running LPIPS on GPU will diverge from the CI CPU
    value (different reduction order). The determinism *gate* is the CPU
    value; see ``docs/testkit/equivalence.md`` for the rendered-similarity
    section.
    """
    _validate_pair(image_a, image_b)
    import torch

    model = _load_lpips_model(net)
    max_i = _max_intensity(image_a.dtype)

    # lpips expects (N, 3, H, W) tensors in [-1, 1]. Convert per its input
    # convention: x_in = (x / MAX_I) * 2 - 1.
    def _to_tensor(img: NDArray[np.generic]) -> "torch.Tensor":  # noqa: UP037
        as_f32 = (img.astype(np.float32) / np.float32(max_i)) * np.float32(2.0) - np.float32(1.0)
        # (H, W, C) → (C, H, W) → (1, C, H, W).
        return torch.from_numpy(np.ascontiguousarray(as_f32.transpose(2, 0, 1)))[None, ...]

    with torch.no_grad():
        ta = _to_tensor(image_a)
        tb = _to_tensor(image_b)
        out = model(ta, tb)  # type: ignore[operator]
    return float(out.item())


def ms_ssim(image_a: NDArray[np.generic], image_b: NDArray[np.generic]) -> float:
    """Multi-scale SSIM — SHELL only; lands at Phase 4 WU-C.

    Per `docs/phases/phase-3-plan.md:380`: task-2 ships the function shell so
    task-6/task-8 import-paths land here without code change at the Phase 4
    extension. Stage 1b keeps this raise — consumers using ``ms_ssim`` before
    Phase 4 fail loudly (no silent fallback to ``ssim``).

    Raises:
        NotImplementedError: always. Phase 4 WU-C extends.
    """
    raise NotImplementedError(
        "ms_ssim: multi-scale SSIM is a Phase 4 WU-C extension; shell only at Phase 3"
    )
