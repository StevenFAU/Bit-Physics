"""Inverse-solution capture with the schema-1.1.0 ``gradient_fields`` key.

The canonical capture is the WU-A inverse-problem solution: the recovered final soft
state plus the autodiff gradient ``dLoss/dalpha`` at the recovered point (the U-1 /
batch-1 diff-capture shape). The hard GoL trajectory is exercised by the golden tests
(blinker / glider / exhaustive-512), not stored as the canonical capture.
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from .forward import DiffLogicConfig
from .sim import InverseSolution, solve_recovery

__all__ = ["CANONICAL_DESCRIPTOR", "default_capture", "write_inverse_capture"]

CANONICAL_DESCRIPTOR = "neural-ca-difflogic-recover-alpha-16sq-seed42"


def write_inverse_capture(
    solution: InverseSolution,
    out_dir: str | Path,
    *,
    descriptor: str = CANONICAL_DESCRIPTOR,
    start_utc: str | None = None,
) -> Path:
    """Write the inverse-solution capture (recovered final state + ``gradient_fields``).

    Returns the manifest ``.json`` path. Pass a fixed ``start_utc`` for a
    byte-reproducible committed fixture (U-1 precedent)."""
    from common_py.capture import (
        ConfigMeta,
        DeterminismMeta,
        Manifest,
        PayloadMeta,
        RunMeta,
        SimMeta,
        StackMeta,
        StepData,
        Writer,
    )

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / f"{descriptor}.json"
    payload_path = out / f"{descriptor}.h5"

    grad = np.asarray(solution.grad_fields["dLoss_dalpha"], dtype=np.float64)
    final = np.asarray(solution.final_state, dtype=np.float64)
    n = final.shape[0]

    manifest = Manifest(
        schema_version="1.1.0",
        sim=SimMeta(name="neural-ca", category="continuous-ca", variant="frontier-difflogic"),
        stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
        config=ConfigMeta(
            tier="reference",
            dims=[n, n],
            dtype="f64",
            seed=42,
            params={
                "planted_alpha": float(solution.planted_alpha),
                "recovered_alpha": float(solution.recovered_alpha),
                "iterations": len(solution.loss_trajectory),
            },
        ),
        run=RunMeta(
            step_count=1,
            capture_interval=1,
            wall_clock_seconds=0.0,
            start_utc=start_utc or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        ),
        payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
        determinism=DeterminismMeta(
            claimed="bit-exact-same-hw", atomic_ops=True, subgroup_ops=False
        ),
        gradient_fields=[
            {
                "name": "dLoss_dalpha",
                "shape": list(grad.shape),
                "dtype": "float64",
                "wrt": "alpha",
            },
        ],
    )

    writer = Writer(manifest_path, manifest)
    writer.write_step(
        0,
        StepData(fields={"final_state": final, "dLoss_dalpha": grad}),
    )
    writer.finalize()
    return manifest_path


def default_capture(out_dir: str | Path) -> Path:
    """Solve the canonical inverse problem and write its capture."""
    cfg = DiffLogicConfig()
    sol = solve_recovery(cfg, planted=0.60, init=0.30)
    return write_inverse_capture(sol, out_dir)
