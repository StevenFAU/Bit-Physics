"""Inverse-solution capture with the schema-1.1.0 ``gradient_fields`` key.

The canonical capture is the inverse-problem solution: the recovered final field plus the
autodiff gradient ``∂Loss/∂mu`` / ``∂Loss/∂sigma`` at the recovered point — a consumer of the
WU-A ``gradient_fields`` capture key (schema 1.1.0). Built via ``common_py.capture``
(Stack-D Taichi convention; IC-2 ``write_step`` + ``finalize``).
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from .forward import LeniaDiffConfig
from .sim import InverseSolution, smooth_initial_condition, solve_growth_id

__all__ = ["CANONICAL_DESCRIPTOR", "default_capture", "write_inverse_capture"]

CANONICAL_DESCRIPTOR = "lenia-diff-recover-mu-sigma-16sq-seed42"


def write_inverse_capture(
    solution: InverseSolution,
    out_dir: str | Path,
    *,
    descriptor: str = CANONICAL_DESCRIPTOR,
    start_utc: str | None = None,
) -> Path:
    """Write the inverse-solution capture (recovered field + ``gradient_fields``).

    Returns the manifest ``.json`` path. The payload ``.h5`` carries the recovered final
    field and the ``dLoss_dmu``/``dLoss_dsigma`` gradient arrays; the manifest declares them
    via the schema-1.1.0 ``gradient_fields`` key. Pass a fixed ``start_utc`` for a
    byte-reproducible committed fixture (lenia precedent).
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

    grad_mu = np.asarray(solution.grad_fields["dLoss_dmu"], dtype=np.float64)
    grad_sigma = np.asarray(solution.grad_fields["dLoss_dsigma"], dtype=np.float64)
    n = solution.final_field.shape[0]

    manifest = Manifest(
        schema_version="1.1.0",
        sim=SimMeta(name="lenia-diff", category="continuous-ca", variant="diff"),
        stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
        config=ConfigMeta(
            tier="reference",
            dims=[n, n],
            dtype="f64",
            seed=42,
            params={
                "planted_mu": float(solution.planted_mu),
                "planted_sigma": float(solution.planted_sigma),
                "recovered_mu": float(solution.recovered_mu),
                "recovered_sigma": float(solution.recovered_sigma),
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
            {"name": "dLoss_dmu", "shape": list(grad_mu.shape), "dtype": "float64", "wrt": "mu"},
            {
                "name": "dLoss_dsigma",
                "shape": list(grad_sigma.shape),
                "dtype": "float64",
                "wrt": "sigma",
            },
        ],
    )

    writer = Writer(manifest_path, manifest)
    writer.write_step(
        0,
        StepData(
            fields={
                "A": np.asarray(solution.final_field),
                "dLoss_dmu": grad_mu,
                "dLoss_dsigma": grad_sigma,
            }
        ),
    )
    writer.finalize()
    return manifest_path


def default_capture(out_dir: str | Path) -> Path:
    """Solve the canonical inverse problem and write its capture."""
    cfg = LeniaDiffConfig(grid=16, steps=4)
    a0 = smooth_initial_condition(cfg.grid, cfg.mu)
    sol = solve_growth_id(cfg, planted=(0.30, 0.15), init=(0.26, 0.13), seed=42)
    _ = a0
    return write_inverse_capture(sol, out_dir)
