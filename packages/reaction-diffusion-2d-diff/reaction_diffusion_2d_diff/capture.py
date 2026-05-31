"""Inverse-solution capture with the schema-1.1.0 ``gradient_fields`` key.

The canonical capture is the inverse-problem solution: the recovered final ``u``
field plus the autodiff gradient ``dLoss/dD_u`` at the recovered point. This is the
**first real consumer of the WU-A ``gradient_fields``** capture key (schema 1.1.0).
Built via ``common_py.capture`` (Stack-D Taichi convention; IC-2 ``write_step`` +
``finalize``).
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from .forward import RD2DDiffConfig
from .sim import InverseSolution, solve_diffusion_id

__all__ = ["CANONICAL_DESCRIPTOR", "default_capture", "write_inverse_capture"]

CANONICAL_DESCRIPTOR = "rd2d-diff-recover-Du-16sq-seed42"


def write_inverse_capture(
    solution: InverseSolution,
    out_dir: str | Path,
    *,
    descriptor: str = CANONICAL_DESCRIPTOR,
    start_utc: str | None = None,
) -> Path:
    """Write the inverse-solution capture (recovered field + ``gradient_fields``).

    Returns the manifest ``.json`` path. The payload ``.h5`` carries the recovered
    final ``u`` field and the ``dLoss_dDu`` gradient array; the manifest declares the
    gradient via the schema-1.1.0 ``gradient_fields`` key. Pass a fixed ``start_utc``
    for a byte-reproducible committed fixture (lenia precedent).
    """
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

    grad = np.asarray(solution.grad_fields["dLoss_dDu"], dtype=np.float64)
    n = solution.final_u.shape[0]

    manifest = Manifest(
        schema_version="1.1.0",
        sim=SimMeta(name="reaction-diffusion-2d-diff", category="continuous-ca", variant="diff"),
        stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
        config=ConfigMeta(
            tier="reference",
            dims=[n, n],
            dtype="f64",
            seed=42,
            params={
                "planted_Du": float(solution.planted),
                "recovered_Du": float(solution.recovered),
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
            claimed="bit-exact-same-hw", atomic_ops=False, subgroup_ops=False
        ),
        gradient_fields=[
            {
                "name": "dLoss_dDu",
                "shape": list(grad.shape),
                "dtype": "float64",
                "wrt": "Du",
            }
        ],
    )

    writer = Writer(manifest_path, manifest)
    writer.write_step(0, StepData(fields={"u": np.asarray(solution.final_u), "dLoss_dDu": grad}))
    writer.finalize()
    return manifest_path


def default_capture(out_dir: str | Path) -> Path:
    """Solve the canonical inverse problem and write its capture."""
    cfg = RD2DDiffConfig(n=16, steps=8)
    sol = solve_diffusion_id(cfg, planted_du=0.16, init_du=0.10)
    return write_inverse_capture(sol, out_dir)
