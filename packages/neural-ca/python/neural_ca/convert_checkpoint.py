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

import json
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from safetensors.numpy import load_file

# Layout schema version for the WGSL artifact sidecar.
LAYOUT_VERSION = "1.0.0"


def convert_checkpoint(safetensors_path: Path, out_dir: Path) -> tuple[Path, Path]:
    """Convert a ``.safetensors`` checkpoint to a WGSL-loadable
    ``(buffer.bin, layout.json)`` pair. Returns ``(buffer_path, layout_path)``.

    The buffer is the concatenation of every weight tensor, each flattened
    C-contiguous (row-major) and written as little-endian f32 — exactly the
    bytes a WGSL ``array<f32>`` storage buffer reads. The layout sidecar records
    each tensor's element offset + shape so the WGSL shader (and the round-trip
    loader / NumPy oracle) index the buffer identically. EXACT — no quantization,
    no dtype change (the PyTorch weights are already f32).
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(safetensors_path).stem
    buffer_path = out_dir / f"{stem}-wgsl.bin"
    layout_path = out_dir / f"{stem}-wgsl.layout.json"

    tensors = load_file(str(safetensors_path))
    chunks: list[NDArray[np.float32]] = []
    layout: dict[str, object] = {"version": LAYOUT_VERSION, "dtype": "f32", "tensors": {}}
    offset = 0
    for name in sorted(tensors):  # deterministic order
        arr = np.ascontiguousarray(tensors[name], dtype="<f4").reshape(-1)
        layout["tensors"][name] = {  # type: ignore[index]
            "offset": offset,
            "count": int(arr.size),
            "shape": list(tensors[name].shape),
        }
        chunks.append(arr)
        offset += int(arr.size)

    buffer = np.concatenate(chunks) if chunks else np.zeros(0, dtype="<f4")
    buffer.astype("<f4").tofile(str(buffer_path))
    layout_path.write_text(json.dumps(layout, indent=2, sort_keys=True), encoding="utf-8")
    return buffer_path, layout_path


def load_wgsl_weights(buffer_path: Path, layout_path: Path) -> dict[str, NDArray[np.float32]]:
    """Load the converted flat-f32 buffer + layout back into named f32 arrays
    (the inverse of :func:`convert_checkpoint`; used by the round-trip test and
    the NumPy oracle). Arrays are returned reshaped to their original shape."""
    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    buffer = np.fromfile(str(buffer_path), dtype="<f4")
    out: dict[str, NDArray[np.float32]] = {}
    for name, spec in layout["tensors"].items():
        start = int(spec["offset"])
        count = int(spec["count"])
        out[name] = buffer[start : start + count].reshape(spec["shape"]).astype(np.float32)
    return out
