"""Particle momentum-conservation check (IC-5).

For a closed particle system, total momentum ``sum_i m_i v_i`` should
be conserved between two snapshots (subject to any external force
impulse, which this check assumes is zero). The check computes the
relative drift component-wise and reports ``passed`` iff the maximum
per-component relative drift stays at or below ``tolerance_rel``.

Zero-magnitude reference (initial total momentum is the zero vector)
falls back to absolute-difference comparison against
``tolerance_rel``.
"""

from __future__ import annotations

import numpy as np

from .._types import CheckResult


def check_momentum_conservation(
    velocities_t0: np.ndarray,
    velocities_t1: np.ndarray,
    masses: np.ndarray,
    tolerance_rel: float = 1e-5,
) -> CheckResult:
    """See module docstring."""
    v0 = np.asarray(velocities_t0, dtype=np.float64)
    v1 = np.asarray(velocities_t1, dtype=np.float64)
    m = np.asarray(masses, dtype=np.float64)
    if v0.shape != v1.shape:
        raise ValueError(f"velocities_t0 shape {v0.shape} != velocities_t1 shape {v1.shape}")
    if v0.ndim != 2:
        raise ValueError(f"expected velocities of shape (N, D), got ndim={v0.ndim}")
    if m.shape != (v0.shape[0],):
        raise ValueError(f"masses shape {m.shape} != expected ({v0.shape[0]},)")
    if tolerance_rel < 0.0:
        raise ValueError(f"tolerance_rel={tolerance_rel!r} must be non-negative")

    p0 = (m[:, None] * v0).sum(axis=0)
    p1 = (m[:, None] * v1).sum(axis=0)
    abs_drift = np.abs(p1 - p0)
    ref_mag = np.abs(p0)
    safe = np.where(ref_mag > 0.0, ref_mag, 1.0)
    rel_drift = np.where(ref_mag > 0.0, abs_drift / safe, abs_drift)
    max_rel = float(rel_drift.max()) if rel_drift.size else 0.0
    return CheckResult(
        passed=max_rel <= tolerance_rel,
        value=max_rel,
        tolerance=float(tolerance_rel),
        details={
            "p_initial": p0.tolist(),
            "p_final": p1.tolist(),
            "abs_drift": abs_drift.tolist(),
            "max_rel_drift": max_rel,
            "n_particles": int(v0.shape[0]),
        },
    )
