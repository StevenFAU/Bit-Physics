# mypy: ignore-errors
# F-RB-3 (rigid-body landing): Warp's @wp.kernel / wp.array / wp.from_torch are only
# partially typed; scope the strict-mypy relaxation to THIS Warp-touching module only
# (the rest of pinn_poisson stays under `strict = true`).
"""Inference + the torch->wp->Capture bridge + checkpoint I/O.

- ``save_checkpoint`` / ``load_checkpoint`` — safetensors weights + architecture
  metadata (LFS-tracked; neural-ca precedent).
- ``evaluate_on_grid`` — frozen-network field on an ``nxn`` grid (NumPy out, ``ij``).
- ``write_inference_capture`` — the **torch -> wp -> Capture bridge**:
  ``wp.from_torch(field_tensor)`` (CPU zero-copy, f64; D-WARP-TORCH-INTEROP) ->
  build a ``common_warp.Capture`` payload -> ``write_capture`` (capture-v1 HDF5 +
  sidecar manifest, ``claimed = bit-exact-same-hw``). The captured instance is the
  canonical descriptor ``poisson-sine-source-64sq-seed42-step1`` (the inhomogeneous-
  MMS field on a 64x64 grid; a steady BVP has no time axis, so ``step1`` denotes the
  single captured evaluation).
"""

from __future__ import annotations

import time
from pathlib import Path

import common_warp
import numpy as np
import warp as wp
from common_warp.capture.model import state_key
from safetensors.torch import load_file, save_file

from .model import PINNConfig, PINNModel, build_model, evaluate_grid
from .problems import PoissonProblem

_STACK = {
    "name": "warp-stack-e",
    "version": common_warp.__version__,
    "build_id": "sub-phase-phase-3-pinn-poisson",
}


def save_checkpoint(model: PINNModel, path: Path) -> Path:
    """Serialize the trained weights + architecture metadata to ``path`` (safetensors)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cfg = model.config
    metadata = {
        "seed": str(cfg.seed),
        "hidden_layers": str(cfg.hidden_layers),
        "hidden_units": str(cfg.hidden_units),
        "activation": cfg.activation,
    }
    save_file(model.state_dict(), str(path), metadata=metadata)
    return path


def load_checkpoint(path: Path, config: PINNConfig | None = None) -> PINNModel:
    """Reconstruct a :class:`PINNModel` and load weights from ``path``.

    If ``config`` is omitted the architecture is rebuilt from the safetensors
    metadata stored by :func:`save_checkpoint`.
    """
    path = Path(path)
    tensors = load_file(str(path))
    if config is None:
        from safetensors import safe_open

        with safe_open(str(path), framework="pt") as f:  # header carries the metadata
            meta = f.metadata() or {}
        config = PINNConfig(
            seed=int(meta.get("seed", 42)),
            hidden_layers=int(meta.get("hidden_layers", 4)),
            hidden_units=int(meta.get("hidden_units", 50)),
            activation=meta.get("activation", "tanh"),
        )
    model = build_model(config)
    model.load_state_dict(tensors)
    return model


def evaluate_on_grid(model: PINNModel, n: int) -> np.ndarray:
    """Evaluate the frozen network on an ``nxn`` uniform grid -> ``(n, n)`` NumPy (``ij``)."""
    return evaluate_grid(model, n).detach().numpy()


def _build_manifest(*, descriptor: str, seed: int, n: int, wall_clock_seconds: float) -> dict:
    return {
        "schema_version": "1.0.0",
        "sim": {
            "name": "pinn-poisson",
            "category": "learned-dynamics",
            "variant": "raissi-2019-soft-constraint-mms-sine-source",
        },
        "stack": dict(_STACK),
        "config": {
            "tier": "single-bvp",
            "dims": [n, n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": descriptor,
                "equation": "poisson-2d",
                "problem": "anchor3-mms-sine-source",
                "source": "-2*pi^2*sin(pi*x)*sin(pi*y)",
                "boundary": "zero-dirichlet",
                "grid": n,
            },
        },
        "run": {
            "step_count": 1,
            "capture_interval": 1,
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-29T00:00:00Z",
        },
        "payload": {
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        "determinism": {
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    }


def write_inference_capture(
    model: PINNModel, problem: PoissonProblem, n: int, out_dir: Path
) -> Path:
    """Produce the canonical inference capture via the torch->wp->Capture bridge.

    The frozen-network field crosses the torch/Warp boundary via
    ``wp.from_torch`` (CPU zero-copy, f64) before being written as a capture-v1
    payload — the load-bearing D-WARP-TORCH-INTEROP path.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    descriptor = f"poisson-sine-source-{n}sq-seed{model.config.seed}-step1"

    wp.init()
    t_start = time.perf_counter()
    field_torch = evaluate_grid(model, n).contiguous()  # (n, n) f64 torch
    warp_field = wp.from_torch(field_torch)  # torch -> wp (CPU zero-copy, f64)
    field_np = np.ascontiguousarray(warp_field.numpy(), dtype=np.float64)
    elapsed = time.perf_counter() - t_start

    payload = {state_key(1, "u"): field_np}
    manifest = _build_manifest(
        descriptor=descriptor, seed=model.config.seed, n=n, wall_clock_seconds=elapsed
    )
    capture = common_warp.Capture(manifest=manifest, payload=payload)
    common_warp.write_capture(capture, out_dir / descriptor)
    return out_dir / f"{descriptor}.json"
