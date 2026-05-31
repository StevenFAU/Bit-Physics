# mypy: ignore-errors
"""Inverse-solution capture with the schema-1.1.0 ``gradient_fields`` key (Stack E / Warp).

The canonical capture is the inverse-problem solution: the recovered initial state ``(q0, qd0)``
plus the autodiff gradient ``∂Loss/∂(q0, qd0)`` at the recovered point — a consumer of the WU-A
``gradient_fields`` capture key (schema 1.1.0). Built via ``common_warp.capture`` frames-writer
(the Stack-E convention; the manifest is a raw dict carrying ``gradient_fields``).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from articulated_pedagogical.model import make_simple_pendulum
from common_warp.capture import write_frames_capture

from .forward import ArticulatedDiffConfig
from .sim import InverseSolution, solve_recovery

__all__ = ["CANONICAL_DESCRIPTOR", "default_capture", "write_inverse_capture"]

CANONICAL_DESCRIPTOR = "articulated-pedagogical-diff-recover-state-seed42"

_STACK = {"name": "warp-stack-e", "version": "1.13", "build_id": "phase-4-batch-3-articulated-diff"}


def write_inverse_capture(
    solution: InverseSolution,
    out_dir: str | Path,
    *,
    descriptor: str = CANONICAL_DESCRIPTOR,
    start_utc: str = "2026-05-31T00:00:00Z",
) -> Path:
    """Write the inverse-solution capture (recovered state + ``gradient_fields``).

    Returns the manifest ``.json`` path. The payload ``.h5`` carries the recovered ``(q0, qd0)`` and
    the ``dLoss_dq0`` / ``dLoss_dqd0`` gradients; the manifest declares them via the schema-1.1.0
    ``gradient_fields`` key. ``start_utc`` is fixed for a byte-reproducible committed fixture."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    dq0 = np.asarray(solution.grad_fields["dLoss_dq0"], dtype=np.float64)
    dqd0 = np.asarray(solution.grad_fields["dLoss_dqd0"], dtype=np.float64)
    q0 = np.asarray(solution.recovered_q0, dtype=np.float64)
    qd0 = np.asarray(solution.recovered_qd0, dtype=np.float64)
    n = q0.shape[0]

    manifest = {
        "schema_version": "1.1.0",
        "sim": {
            "name": "articulated-pedagogical-diff",
            "category": "rigid-body",
            "variant": "diff",
        },
        "stack": dict(_STACK),
        "config": {
            "tier": "reference",
            "dims": [n],
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
            {"name": "dLoss_dq0", "shape": list(dq0.shape), "dtype": "float64", "wrt": "q0"},
            {"name": "dLoss_dqd0", "shape": list(dqd0.shape), "dtype": "float64", "wrt": "qd0"},
        ],
    }

    frames = [
        (0, {"recovered_q0": q0, "recovered_qd0": qd0, "dLoss_dq0": dq0, "dLoss_dqd0": dqd0}, {})
    ]
    return write_frames_capture(frames, manifest, out, schema_version="1.1.0")


def default_capture(out_dir: str | Path) -> Path:
    """Solve the canonical inverse problem and write its capture."""
    chain = make_simple_pendulum()
    sol = solve_recovery(chain, ArticulatedDiffConfig())
    return write_inverse_capture(sol, out_dir)
