# mypy: ignore-errors
# F-RB-3 (rigid-body landing): Warp's @wp.kernel / wp.array / wp.from_torch are only
# partially typed; scope the strict-mypy relaxation to THIS Warp-touching module only
# (the rest of pinn_poisson stays under `strict = true`).
"""Inference + the torch->wp->Capture bridge + checkpoint I/O.

Stage 1a: shell. Stage 1b-PINN implements:

- ``save_checkpoint`` / ``load_checkpoint`` — safetensors weights (LFS-tracked).
- ``evaluate_on_grid`` — frozen-network field on an ``nxn`` grid (NumPy out).
- ``write_inference_capture`` — the **torch -> wp -> Capture bridge**:
  ``wp.from_torch(field_tensor)`` (CPU zero-copy, f64; D-WARP-TORCH-INTEROP) ->
  build a ``common_warp.Capture`` payload -> ``write_capture`` (capture-v1
  HDF5 + sidecar manifest, ``claimed = bit-exact-same-hw``). The captured
  instance is the canonical descriptor ``poisson-sine-source-64sq-seed42-step1``
  (the inhomogeneous-MMS field on a 64x64 grid; a steady BVP has no time axis, so
  ``step1`` denotes the single captured evaluation).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from .model import PINNModel
from .problems import PoissonProblem


def save_checkpoint(model: PINNModel, path: Path) -> Path:
    """Serialize the trained weights to ``path`` (safetensors; LFS-tracked)."""
    raise NotImplementedError("Stage 1b-PINN: safetensors.save_model(model, path).")


def load_checkpoint(path: Path, config=None) -> PINNModel:
    """Reconstruct a :class:`PINNModel` and load weights from ``path``."""
    raise NotImplementedError("Stage 1b-PINN: build_model + safetensors.load_model.")


def evaluate_on_grid(model: PINNModel, n: int) -> np.ndarray:
    """Evaluate the frozen network on an ``nxn`` uniform grid -> ``(n, n)`` NumPy."""
    raise NotImplementedError("Stage 1b-PINN: forward the frozen model on the grid.")


def write_inference_capture(
    model: PINNModel, problem: PoissonProblem, n: int, out_dir: Path
) -> Path:
    """Produce the canonical inference capture via the torch->wp->Capture bridge."""
    raise NotImplementedError(
        "Stage 1b-PINN: wp.from_torch(field) -> common_warp.Capture -> write_capture."
    )
