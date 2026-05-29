"""Pure-NumPy NCA forward pass — the CI-visible oracle for the WGSL capture.

Mirrors the WGSL forward inference (Stack B) in float32 NumPy: fixed
[identity, Sobel-x, Sobel-y] depthwise perception, the per-cell update MLP
(relu then linear), the stochastic fire mask (seeded), and alpha alive-masking.
Loads the SAME flat-f32 weight layout that ``convert_checkpoint.py`` emits for
WGSL, so the two stacks share one weight source.

Stage 1a: :func:`nca_forward_numpy` raises ``NotImplementedError``; implemented
at Stage 1b-B.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def nca_forward_numpy(
    weights: dict[str, NDArray[np.float32]],
    *,
    grid_size: int,
    steps: int,
    seed: int = 42,
    fire_rate: float = 0.5,
    capture_every: int = 1,
) -> NDArray[np.float32]:
    """Roll the NCA forward in NumPy f32 from the canonical seed using the
    converted ``weights``; return an ``(n_frames, H, W, 4)`` RGBA stack.

    Stage 1b-B implements this.
    """
    raise NotImplementedError("neural_ca.reference.nca_numpy.nca_forward_numpy — Stage 1b-B")
