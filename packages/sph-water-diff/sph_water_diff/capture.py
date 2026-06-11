"""Inverse-solution capture with the schema-1.1.0 ``gradient_fields`` key.

The canonical capture is the inverse-problem solution: the recovered final particle
positions plus the autodiff gradient ``dLoss/dv0z`` at the recovered point - a consumer of
the WU-A ``gradient_fields`` capture key (schema 1.1.0). Built via ``common_py.capture``
(Stack-D Taichi convention; the mpm-diff precedent shape).
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from .forward import SphDiffConfig
from .sim import InverseSolution, solve_recovery

__all__ = ["CANONICAL_DESCRIPTOR", "default_capture", "write_inverse_capture"]

CANONICAL_DESCRIPTOR = "sph-water-diff-recover-v0z-8part-seed42"


def write_inverse_capture(
    solution: InverseSolution,
    out_dir: str | Path,
    *,
    descriptor: str = CANONICAL_DESCRIPTOR,
    start_utc: str | None = None,
) -> Path:
    """Write the inverse-solution capture (recovered positions + ``gradient_fields``).

    Returns the manifest ``.json`` path. The payload ``.h5`` carries the recovered final
    particle positions and the ``dLoss_dv0z`` gradient; the manifest declares the gradient
    via the schema-1.1.0 ``gradient_fields`` key. Pass a fixed ``start_utc`` for a
    byte-reproducible committed fixture (lenia/mpm precedent)."""
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

    grad = np.asarray(solution.grad_fields["dLoss_dv0z"], dtype=np.float64)
    pos = np.asarray(solution.final_positions, dtype=np.float64)
    n = pos.shape[0]

    manifest = Manifest(
        schema_version="1.1.0",
        sim=SimMeta(name="sph-water-diff", category="particle-fluids", variant="diff"),
        stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
        config=ConfigMeta(
            tier="reference",
            dims=[n, 3],
            dtype="f64",
            seed=42,
            params={
                "planted_v0z": float(solution.planted_v0z),
                "recovered_v0z": float(solution.recovered_v0z),
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
                "name": "dLoss_dv0z",
                "shape": list(grad.shape),
                "dtype": "float64",
                "wrt": "v0z",
            },
        ],
    )

    writer = Writer(manifest_path, manifest)
    writer.write_step(
        0,
        StepData(fields={"particle_pos": pos, "dLoss_dv0z": grad}),
    )
    writer.finalize()
    return manifest_path


def default_capture(out_dir: str | Path) -> Path:
    """Solve the canonical inverse problem and write its capture."""
    cfg = SphDiffConfig()
    sol = solve_recovery(cfg, planted=-0.20, init=-0.12)
    return write_inverse_capture(sol, out_dir)
