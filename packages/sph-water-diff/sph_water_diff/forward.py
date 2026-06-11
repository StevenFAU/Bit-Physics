"""Differentiable SPH water - config + closed-form analytic helpers (Stack D / Taichi).

The tape-differentiable ``ti.ad.Tape`` kernels live in :mod:`._kernels` (IC-12 dedicated
kernel module). This module holds the strict-typed Python surface: the configuration
dataclass and the closed-form analytic helpers used by the gradient-golden anchors -

* **A1** the free-fall control gradient ``dLoss/dv0z = 2*N*(dt*STEPS)^2*(v0z - v0z*)``
  (semi-implicit Euler: ``v_k = v0 + k*g*dt``, ``z_k = z0 + dt*sum v_i``; the gravity and IC
  terms cancel in the difference, so the map is *exactly* linear in ``v0z`` - hand-derived
  kinematics, no approximation).
* **A3** the kernel-width density derivative for a two-particle fixture
  ``d(rho)/dh = -(m*sigma_3/h^4) * (3*(1 + f(q)) + q*f'(q))`` (a *distinct physical term* -
  kernel calculus, not kinematics - *distinct parameter* - ``h``, not ``v0z`` - *distinct
  method* - analytic differentiation of the Monaghan cubic spline, not ballistic
  integration).

The kernel form mirrors the landed parent ``packages/sph-water-stack-d`` (3D Monaghan
cubic-spline, sigma_3 = 1/pi: Monaghan 2005 Rep. Prog. Phys. 68(8) Eq. 2.7; SPH density per
Bender & Koschier 2015 SCA Eq. 5, as cited there). The landed parent's canonical forward is
explicit-Euler gravity free-fall + per-frame SPH density (R-S3/S6, Phase-2 ratified) - this
diff variant differentiates THAT physics (charter SHIFT record: the plan-prose
viscosity/surface-tension/damping parameters are not in the landed forward).
DiffTaichi (Hu et al., ICLR 2020, arXiv:1910.00935) is the published differentiable-sim
*method* citation (CITE-DON'T-IMPORT).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

__all__ = [
    "SIGMA_3D",
    "SphDiffConfig",
    "analytic_drho_dh_pair",
    "cloud_initial_positions",
    "cubic_spline_f",
    "cubic_spline_fprime",
    "freefall_dloss_dv0z",
    "pair_density",
]

#: 3D cubic-spline normalisation sigma_3 = 1/pi (Monaghan 2005 Eq. 2.7; parent SIGMA_3D).
SIGMA_3D: float = 1.0 / math.pi


@dataclass(frozen=True)
class SphDiffConfig:
    """Canonical differentiable-SPH configuration (fixed-topology interior regime).

    Deliberately TINY (``n_particles=8``, ``steps=8``) and **fixed-topology**: the forward is
    the landed parent's explicit-Euler gravity free-fall, which preserves relative particle
    positions exactly, so the neighbor set is constant over the horizon and the kernel-support
    boundary (q=2) is never crossed - the regime answer to batch-1's EXP-C hold (gradient
    through SPH neighbor discontinuities). The cloud radius keeps every pair away from the
    spline knots (q=1, q=2) so the piecewise kernel is smooth at every evaluated point.

    Parameters mirror the parent's ``canonical_params()`` where they exist there
    (``dt=1e-3``, ``g_z=-9.81``, ``h=0.05``) and the parent's canonical mass ``1e-3``.
    """

    n_particles: int = 8
    steps: int = 8
    dt: float = 1.0e-3
    h: float = 0.05
    g_z: float = -9.81
    mass: float = 1.0e-3
    cloud_center: tuple[float, float, float] = (0.5, 0.5, 0.6)
    cloud_radius: float = 0.02
    seed: int = 42


def cloud_initial_positions(cfg: SphDiffConfig) -> NDArray[np.float64]:
    """A small, deterministic interior particle cloud about ``cloud_center``.

    Seeded uniform jitter (NumPy ``default_rng``; no global RNG) of radius ``cloud_radius``,
    so all pairwise distances stay well inside the support (q << 2) and away from the q=1
    knot for ``h=0.05`` - the fixed-topology smooth regime."""
    rng = np.random.default_rng(int(cfg.seed))
    c = np.asarray(cfg.cloud_center, dtype=np.float64)
    jitter = cfg.cloud_radius * (rng.random((cfg.n_particles, 3)) - 0.5)
    return np.ascontiguousarray(c[None, :] + jitter, dtype=np.float64)


def freefall_dloss_dv0z(
    n_particles: int, steps: int, dt: float, v0z: float, v0z_target: float
) -> float:
    """Closed-form A1 control gradient ``dLoss/dv0z = 2*N*(dt*T)^2*(v0z - v0z*)``.

    Semi-implicit Euler free-fall: ``v_k = v0 + k*g*dt`` and ``z_T = z0 + dt*sum_{k=1..T} v_k
    = z0 + T*dt*v0 + g*dt^2*T(T+1)/2``. The target is the same map at ``v0z*``, so the
    gravity + IC terms cancel: ``z_T(v0z) - z_T(v0z*) = T*dt*(v0z - v0z*)`` for EVERY
    particle, and ``Loss = sum_p (z-diff)^2`` gives ``dLoss/dv0z = 2*N*(T*dt)^2*(v0z-v0z*)``.
    Exact for the discrete map (the map is linear in ``v0z``); hand-derived kinematics."""
    return (
        2.0
        * float(n_particles)
        * (float(dt) * float(steps)) ** 2
        * (float(v0z) - float(v0z_target))
    )


def cubic_spline_f(q: float) -> float:
    """Cubic-spline piecewise factor f(q) (parent ``_f``; Monaghan 2005 Eq. 2.7)."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if q < 1.0:
        return 1.0 - 1.5 * q * q + 0.75 * q * q * q
    if q < 2.0:
        diff = 2.0 - q
        return 0.25 * diff * diff * diff
    return 0.0


def cubic_spline_fprime(q: float) -> float:
    """First derivative f'(q) of the cubic-spline factor (parent ``_fprime``)."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if q < 1.0:
        return -3.0 * q + 2.25 * q * q
    if q < 2.0:
        diff = 2.0 - q
        return -0.75 * diff * diff
    return 0.0


def pair_density(r: float, h: float, mass: float) -> float:
    """Two-particle SPH density ``rho = m*(W(0,h) + W(r/h,h)) = (m*sigma_3/h^3)(1 + f(q))``.

    Self-term f(0)=1 plus the single neighbor at distance ``r`` (parent ``density``
    convention: self-contribution first)."""
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    q = float(r) / float(h)
    return float(mass) * SIGMA_3D / (h * h * h) * (1.0 + cubic_spline_f(q))


def analytic_drho_dh_pair(r: float, h: float, mass: float) -> float:
    """Closed-form A3 kernel-width derivative ``d(rho)/dh`` for the two-particle fixture.

    ``rho(h) = (m*sigma_3/h^3)(1 + f(q))`` with ``q = r/h``, ``dq/dh = -q/h``, so
    ``d(rho)/dh = -(m*sigma_3/h^4) * (3*(1 + f(q)) + q*f'(q))``. Hand-derived from the
    Monaghan cubic spline (the parent's gate-4 golden kernel surface, SPlisHSPlasH
    cross-checked there); exact at any point away from the q=1 / q=2 knots."""
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    q = float(r) / float(h)
    return (
        -float(mass)
        * SIGMA_3D
        / (h * h * h * h)
        * (3.0 * (1.0 + cubic_spline_f(q)) + q * cubic_spline_fprime(q))
    )
