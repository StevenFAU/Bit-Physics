"""Shared fixtures + paths for the neural-ca test suite."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from numpy.typing import NDArray

# Repo root: packages/neural-ca/python/tests -> up 4.
REPO_ROOT = Path(__file__).resolve().parents[4]
CHECKPOINT_PATH = REPO_ROOT / "tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors"
D_INFERENCE_CAPTURE = REPO_ROOT / "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.h5"
B_INFERENCE_CAPTURE = (
    REPO_ROOT / "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.h5"
)
WGSL_BUFFER = REPO_ROOT / "tools/testkit/golden/checkpoints/neural-ca-emoji-disk-wgsl.bin"
WGSL_LAYOUT = REPO_ROOT / "tools/testkit/golden/checkpoints/neural-ca-emoji-disk-wgsl.layout.json"

# A small synthetic 4-channel RGBA target for fast convergence tests (a centered
# filled square) — independent of any vendored asset.
SMALL_GRID = 32


@pytest.fixture
def small_target() -> NDArray[np.float32]:
    """A 32x32 RGBA target: an opaque red square in the center on transparent
    background (premultiplied alpha). Deterministic, asset-free."""
    g = SMALL_GRID
    target = np.zeros((g, g, 4), dtype=np.float32)
    lo, hi = g // 4, 3 * g // 4
    target[lo:hi, lo:hi, 0] = 1.0  # red
    target[lo:hi, lo:hi, 3] = 1.0  # alpha
    return target
