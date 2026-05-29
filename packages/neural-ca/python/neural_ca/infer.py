"""NCA forward inference (Stack D, PyTorch).

Rolls a frozen :class:`~neural_ca.model.NCAModel` forward from the canonical
seed for a fixed number of steps, returning the RGB(A) frame stack — the
payload of the canonical D-inference capture
``growing-emoji-64sq-seed42-step1000`` (spec Appendix D.2.3).

Inference is **bit-exact same-stack-same-hw** (with a pinned RNG seed for the
stochastic fire mask): the same weights + seed + input reproduce byte-identical
output across runs on the same hardware (determinism registry
``[continuous-ca.neural-ca.inference]``). This single-stack reproducibility is
the foundation for the D↔B (PyTorch↔WGSL) cross-stack render-similarity gate —
which is statistical, NOT bit-exact (different f32 conv reductions).

Stage 1a: :func:`run_inference` raises ``NotImplementedError``; implemented at
Stage 1b-D.
"""

from __future__ import annotations

import numpy as np
import torch
from numpy.typing import NDArray

from .model import NCAModel, seed_state


def run_inference(
    model: NCAModel,
    *,
    grid_size: int,
    steps: int,
    seed: int = 42,
    capture_every: int = 1,
) -> NDArray[np.float32]:
    """Roll ``model`` forward from the seed for ``steps`` steps; return an
    ``(n_frames, H, W, 4)`` RGBA float32 stack clamped to [0, 1]. Frame 0 is the
    seed; thereafter a frame is captured every ``capture_every`` steps.

    Bit-exact same-stack-same-hw with the pinned ``seed`` (torch RNG drives the
    stochastic fire mask).
    """
    torch.manual_seed(seed)
    model.eval()
    x = seed_state(grid_size, model.config.channel_n)

    def rgba(state: torch.Tensor) -> NDArray[np.float32]:
        frame = state[0, :4].clamp(0.0, 1.0).permute(1, 2, 0).contiguous()
        return frame.numpy().astype(np.float32)

    frames: list[NDArray[np.float32]] = [rgba(x)]
    with torch.no_grad():
        for t in range(steps):
            x = model(x)
            if (t + 1) % capture_every == 0:
                frames.append(rgba(x))
    return np.stack(frames, axis=0)
