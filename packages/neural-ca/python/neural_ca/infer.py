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
from numpy.typing import NDArray

from .model import NCAModel


def run_inference(
    model: NCAModel,
    *,
    grid_size: int,
    steps: int,
    seed: int = 42,
    capture_every: int = 1,
) -> NDArray[np.float32]:
    """Roll ``model`` forward from the seed; return an ``(n_frames, H, W, 4)``
    RGBA float32 stack in [0, 1].

    Stage 1b-D implements this.
    """
    raise NotImplementedError("neural_ca.infer.run_inference — Stage 1b-D")
