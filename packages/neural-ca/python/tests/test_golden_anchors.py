"""Gate-4 — golden anchor: ``golden_checkpoint_match`` (re-shaped D-ANCHOR).

The Distill reference publishes NO PSNR/SSIM/LPIPS (verified Stage 0 — L2 only),
so the training golden is: the trained checkpoint reconstructs the target RGBA to
a measured pixel-wise-L2 bound, AND the pattern persists (the pool-trained model
holds the target as a stable fixed point — it does NOT overgrow like the Growing
variant). Bound read from ``tolerance.toml``
``[golden_tolerance.continuous-ca.neural-ca-python].golden_checkpoint_l2_max``.

The §2.12 perceptual floors (PSNR≥28/SSIM≥0.85/LPIPS≤0.15) + the MEASURED D↔B
render-similarity are the other two anchors, exercised by the gate-14 test at
Stage 1c (``test_cross_stack_equivalence``).
"""

from __future__ import annotations

import tomllib

import numpy as np
import pytest
from safetensors.torch import load_file

from neural_ca import NCAConfig, NCAModel, run_inference
from neural_ca.target import make_emoji_target

from .conftest import CHECKPOINT_PATH, REPO_ROOT

# The model reaches its stable reconstruction by this horizon; the pool training
# holds it (no overgrowth). Evaluate the golden L2 here.
_REPR_HORIZON = 200

pytestmark = pytest.mark.skipif(
    not CHECKPOINT_PATH.exists(),
    reason="canonical checkpoint not present (run `python -m neural_ca train`)",
)


def _golden_l2_bound() -> float:
    toml = tomllib.loads(
        (REPO_ROOT / "tools/testkit/equivalence/tolerance.toml").read_text(encoding="utf-8")
    )
    row = toml["golden_tolerance"]["continuous-ca"]["neural-ca-python"]
    return float(row["golden_checkpoint_l2_max"])


def test_checkpoint_reconstructs_target_within_l2_bound() -> None:
    grid = 64
    model = NCAModel(NCAConfig(grid_size=grid))
    model.load_state_dict(load_file(str(CHECKPOINT_PATH)))
    target = make_emoji_target(grid)

    frame = run_inference(
        model, grid_size=grid, steps=_REPR_HORIZON, seed=42, capture_every=_REPR_HORIZON
    )[-1]
    l2 = float(np.mean((frame - target) ** 2))
    bound = _golden_l2_bound()
    assert l2 <= bound, (
        f"golden_checkpoint_match: recon L2 {l2:.4f} > bound {bound} at step {_REPR_HORIZON}"
    )


def test_pattern_persists_to_step1000() -> None:
    """Persistence: the pool-trained model holds the pattern (alpha coverage stays
    bounded, NOT the Growing-variant overgrowth to a filled grid) through step 1000."""
    grid = 64
    model = NCAModel(NCAConfig(grid_size=grid))
    model.load_state_dict(load_file(str(CHECKPOINT_PATH)))
    target = make_emoji_target(grid)
    target_cov = float((target[..., 3] > 0.1).mean())

    frame = run_inference(model, grid_size=grid, steps=1000, seed=42, capture_every=1000)[-1]
    cov = float((frame[..., 3] > 0.1).mean())
    # Coverage must stay within a band of the target (NOT overgrow toward 1.0).
    assert cov <= target_cov + 0.30, (
        f"overgrowth: step-1000 coverage {cov:.3f} >> target {target_cov:.3f}"
    )
