"""Passive-tracer advection (RK2/RK4) + determinism witness.

The gated state is a pure per-point gather: each tracer reads only its
own position and evaluates the analytic field (no scatter, no atomics),
so the f64 evaluator is run-twice bit-identical on fixed hardware. The
2-run bit-identity witness is asserted INSIDE ``advect`` before any
capture write (spec-ref § 8; witness run #2 is the returned run).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np

from .fields import CurlNoiseConfig, velocity
from .manifold import iso_value_residual, iso_values, reproject


@dataclass
class CurlResult:
    """Advection result at capture checkpoints."""

    checkpoint_steps: list[int]
    positions: np.ndarray  # (n_checkpoints, M, 3) f64
    iso_residual_max: np.ndarray  # (n_checkpoints,) — crossprod only, else 0
    iso_f0: np.ndarray | None  # (M, 2) initial iso values (crossprod)
    determinism_witness_sha256: str


def _step_rk2(x: np.ndarray, cfg: CurlNoiseConfig, dt: float) -> np.ndarray:
    k1 = velocity(x, cfg)
    k2 = velocity(x + 0.5 * dt * k1, cfg)
    return x + dt * k2


def _step_rk4(x: np.ndarray, cfg: CurlNoiseConfig, dt: float) -> np.ndarray:
    k1 = velocity(x, cfg)
    k2 = velocity(x + 0.5 * dt * k1, cfg)
    k3 = velocity(x + 0.5 * dt * k2, cfg)
    k4 = velocity(x + dt * k3, cfg)
    return x + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


def _run(
    points0: np.ndarray,
    cfg: CurlNoiseConfig,
    *,
    n_steps: int,
    dt: float,
    integrator: str,
    reproject_iters: int,
    capture_interval: int,
) -> tuple[list[int], np.ndarray, np.ndarray, np.ndarray | None]:
    step_fn = _step_rk4 if integrator == "rk4" else _step_rk2
    x = np.array(points0, dtype=np.float64, copy=True)
    crossprod = cfg.construction == "crossprod"
    f0 = iso_values(x, cfg) if crossprod else None

    checkpoint_steps = [0]
    checkpoints = [x.copy()]
    residuals = [0.0]
    for step in range(1, n_steps + 1):
        x = step_fn(x, cfg, dt)
        if crossprod and reproject_iters > 0:
            x = reproject(x, f0, cfg, iterations=reproject_iters)
        if step % capture_interval == 0 or step == n_steps:
            checkpoint_steps.append(step)
            checkpoints.append(x.copy())
            residuals.append(
                float(iso_value_residual(x, f0, cfg).max()) if crossprod else 0.0
            )
    return checkpoint_steps, np.stack(checkpoints, 0), np.asarray(residuals), f0


def advect(
    points0: np.ndarray,
    cfg: CurlNoiseConfig,
    *,
    n_steps: int,
    dt: float,
    integrator: str = "rk4",
    reproject_iters: int = 1,
    capture_interval: int = 8,
) -> CurlResult:
    """Advect tracers; assert the 2-run bit-identity witness; return run #2."""
    run1 = _run(
        points0,
        cfg,
        n_steps=n_steps,
        dt=dt,
        integrator=integrator,
        reproject_iters=reproject_iters,
        capture_interval=capture_interval,
    )
    run2 = _run(
        points0,
        cfg,
        n_steps=n_steps,
        dt=dt,
        integrator=integrator,
        reproject_iters=reproject_iters,
        capture_interval=capture_interval,
    )
    if not np.array_equal(run1[1], run2[1]):
        raise AssertionError(
            "determinism witness failed: two identical f64 advections "
            "produced different bytes (spec-ref § 8 claims a pure gather)"
        )
    steps, positions, residuals, f0 = run2
    sha = hashlib.sha256(np.ascontiguousarray(positions).tobytes()).hexdigest()
    return CurlResult(
        checkpoint_steps=steps,
        positions=positions,
        iso_residual_max=residuals,
        iso_f0=f0,
        determinism_witness_sha256=sha,
    )
