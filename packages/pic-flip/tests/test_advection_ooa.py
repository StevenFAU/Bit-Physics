"""Advection order-of-accuracy (spec-ref § 6.1, Gagniere-protocol style).

A steady divergence-free shear field with quadratic profile
``u(y) = a (y - 1/2)^2`` (so ``Du/Dt = 0`` exactly — particles carry
their velocity along straight characteristics) is run through the full
transfer cycle (P2G -> G2P -> RK2 advect) on an ``N`` ladder with
``dt = dx / 2`` and fixed final time. The error is the max deviation
of the carried particle velocity from the exact profile at the
particle's (unchanged) height.

Measured order declared, not assumed: slope >= 0.9 asserted (spec-ref
§ 6.1 states the expected measured order ~1 for the resampling chain;
APIC's affine reconstruction typically measures better on smooth
fields — the assertion is the honest lower bound).
"""

from __future__ import annotations

import math

import numpy as np

from pic_flip.sim import transfer_cycle_step_2d

_A = 2.0


def _run_ladder_point(n: int, mode: str) -> float:
    dx = 1.0 / n
    dt = 0.5 * dx  # dt = dx refinement (fixed CFL fraction)
    t_final = 0.125
    n_steps = int(round(t_final / dt))
    # 2x2 particles per cell, strictly interior band.
    axes = np.arange(3 * dx + 0.25 * dx, (n - 3) * dx, 0.5 * dx)
    xx, yy = np.meshgrid(axes, axes, indexing="ij")
    pos = np.stack([xx.ravel(), yy.ravel()], axis=-1).astype(np.float64)
    vel = np.zeros_like(pos)
    vel[:, 0] = _A * (pos[:, 1] - 0.5) ** 2
    mass = np.ones((pos.shape[0],), dtype=np.float64)
    affine_c = np.zeros((pos.shape[0], 2, 2), dtype=np.float64)
    for _ in range(n_steps):
        transfer_cycle_step_2d(pos, vel, mass, affine_c, dx, dt, n, n, mode)
    exact = _A * (pos[:, 1] - 0.5) ** 2
    return float(np.max(np.abs(vel[:, 0] - exact)))


def test_transfer_advection_measured_order() -> None:
    """Measured 2026-07-04: errors 0.0149 / 0.00782 / 0.00373 at
    N = 32/64/128; pairwise slopes 0.93 / 1.07 (N=16 is
    pre-asymptotic at 0.58 and excluded). Pinned: finest-pair slope
    >= 0.9, monotone decrease."""
    ns = [32, 64, 128]
    errs = [_run_ladder_point(n, "apic") for n in ns]
    assert errs[0] > errs[1] > errs[2], errs
    slope_fine = math.log(errs[1] / errs[2]) / math.log(2.0)
    assert slope_fine >= 0.9, (errs, slope_fine)


def test_apic_beats_pic_on_smooth_field() -> None:
    """PIC's per-resample averaging dissipates the quadratic profile
    faster than APIC at equal resolution (the § 6.4 comparison in
    miniature)."""
    err_apic = _run_ladder_point(32, "apic")
    err_pic = _run_ladder_point(32, "pic")
    assert err_apic < err_pic, (err_apic, err_pic)
