"""Checkpoint conversion: ``.safetensors`` -> WGSL-loadable flat-f32 artifact.

Reads the trained PyTorch checkpoint (``.safetensors``) and emits a
WGSL-loadable artifact: a flat little-endian f32 buffer plus a documented JSON
layout sidecar (tensor name -> offset/shape/transpose). The conversion MUST be
EXACT — a round-trip weights-equality test asserts bit-identical float values
pre/post (D-CHECKPOINT-CONVERSION); a lossy conversion breaks the D↔B gate
(HARD RULE 2).

Stage 1a: :func:`convert_checkpoint` / :func:`load_wgsl_weights` raise
``NotImplementedError``; implemented at Stage 1b-B.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from numpy.typing import NDArray


def convert_checkpoint(safetensors_path: Path, out_dir: Path) -> tuple[Path, Path]:
    """Convert a ``.safetensors`` checkpoint to a WGSL-loadable
    ``(buffer.bin, layout.json)`` pair. Returns the two output paths.

    Stage 1b-B implements this.
    """
    raise NotImplementedError("neural_ca.convert_checkpoint.convert_checkpoint — Stage 1b-B")


def load_wgsl_weights(buffer_path: Path, layout_path: Path) -> dict[str, NDArray[np.float32]]:
    """Load the converted flat-f32 buffer + layout back into named f32 arrays
    (the inverse of :func:`convert_checkpoint`, used by the round-trip test and
    the NumPy oracle).

    Stage 1b-B implements this.
    """
    raise NotImplementedError("neural_ca.convert_checkpoint.load_wgsl_weights — Stage 1b-B")
