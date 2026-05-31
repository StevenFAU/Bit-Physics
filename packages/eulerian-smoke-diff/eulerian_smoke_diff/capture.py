# mypy: ignore-errors
"""Inverse-solution capture with the schema-1.1.0 ``gradient_fields`` key (Stack E / Warp).

The canonical capture is the inverse-problem solution: the recovered initial smoke field plus the
autodiff gradient ``∂Loss/∂u₀`` at the recovered point — a consumer of the WU-A ``gradient_fields``
capture key (schema 1.1.0). Built via ``common_warp.capture.write_frames_capture`` (the Stack-E
convention; the manifest is a raw dict carrying ``gradient_fields``).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from common_warp.capture import write_frames_capture

from .forward import SmokeDiffConfig
from .sim import InverseSolution, solve_recovery

__all__ = ["CANONICAL_DESCRIPTOR", "default_capture", "write_inverse_capture"]

CANONICAL_DESCRIPTOR = "eulerian-smoke-diff-recover-u0-16sq-seed42"

_STACK = {"name": "warp-stack-e", "version": "1.13", "build_id": "phase-4-batch-1-smoke-diff"}


def write_inverse_capture(
    solution: InverseSolution,
    out_dir: str | Path,
    *,
    descriptor: str = CANONICAL_DESCRIPTOR,
    start_utc: str = "2026-05-31T00:00:00Z",
) -> Path:
    """Write the inverse-solution capture (recovered field + ``gradient_fields``).

    Returns the manifest ``.json`` path. The payload ``.h5`` carries the recovered initial field
    and the ``dLoss_du0`` gradient; the manifest declares the gradient via the schema-1.1.0
    ``gradient_fields`` key. ``start_utc`` is fixed for a byte-reproducible committed fixture."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    grad = np.asarray(solution.grad_fields["dLoss_du0"], dtype=np.float64)
    field = np.asarray(solution.recovered_field, dtype=np.float64)
    n = field.shape[0]

    manifest = {
        "schema_version": "1.1.0",
        "sim": {"name": "eulerian-smoke-diff", "category": "volumetric-grid", "variant": "diff"},
        "stack": dict(_STACK),
        "config": {
            "tier": "reference",
            "dims": [n, n],
            "dtype": "f64",
            "seed": 42,
            "params": {
                "iterations": len(solution.loss_trajectory),
                "final_loss": float(solution.loss_trajectory[-1]),
            },
        },
        "run": {
            "step_count": 1,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": start_utc,
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": True, "subgroup_ops": False},
        "gradient_fields": [
            {"name": "dLoss_du0", "shape": list(grad.shape), "dtype": "float64", "wrt": "u0"},
        ],
    }

    frames = [(0, {"smoke_density": field, "dLoss_du0": grad}, {})]
    return write_frames_capture(frames, manifest, out, schema_version="1.1.0")


def default_capture(out_dir: str | Path) -> Path:
    """Solve the canonical inverse problem and write its capture."""
    sol = solve_recovery(SmokeDiffConfig())
    return write_inverse_capture(sol, out_dir)
