"""Differentiable MPM - config + closed-form analytic helpers (Stack D / Taichi).

The tape-differentiable ``ti.ad.Tape`` kernels live in :mod:`._kernels` (IC-12 dedicated
kernel module). This module holds the strict-typed Python surface: the configuration
dataclass and the closed-form analytic helpers used by the gradient-golden anchors -

* **A1** the ballistic (no-grid-coupling) limit ``dx(T)/dv0 = dt*STEPS*I`` (single particle,
  ``F=I``, ``C=0`` -> neo-Hookean stress == 0 and APIC first-moment ``sum w*dpos == 0`` => pure
  PIC free-flight; hand-derived kinematics).
* **A3** the neo-Hookean small-strain constitutive linearization ``d(sigma00)/deps = 2mu+lam`` (a
  *distinct physical term* - constitutive, not kinematic - *distinct parameter* - strain, not
  ``v0`` - *distinct method* - elastic linearization, not ballistic integration).

The constitutive form + material constants mirror the landed reference
``packages/mpm-multimaterial-stack-d`` (neo-Hookean Kirchhoff ``sigma = mu(B-I) + lam log(J) I``;
``E=4e3``, ``nu=0.3``; Stomakhin 2013 / Jiang 2016 MPM course, as cited there).
DiffTaichi (Hu et al., ICLR 2020, arXiv:1910.00935) is the published differentiable-MPM
*method* citation (CITE-DON'T-IMPORT, §H.2) - its ``diff_mpm`` example optimises initial
conditions to hit a target with FD-validated gradients; this sim reimplements the
constitutive from the reference, not from DiffTaichi code.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

__all__ = [
    "MpmDiffConfig",
    "ballistic_dx_dv0",
    "cluster_initial_positions",
    "neohookean_dstress00_dstrain",
    "neohookean_stress",
]


@dataclass(frozen=True)
class MpmDiffConfig:
    """Canonical differentiable-MPM configuration (small-strain elastic, interior regime).

    Deliberately TINY (``grid_n=16``, ``n_particles=6``, ``steps=8``) and **interior /
    small-strain** so the gradient is well-conditioned (the blob free-flights near the domain
    centre, never contacting the sticky floor / walls; ``F`` stays ~= ``I`` so the
    neo-Hookean branch is smooth and the gradient through the stress path is exact). The
    recovered parameter is the **shared initial velocity** ``v0`` (the DiffTaichi
    "throw-to-target" inverse). Material constants mirror the landed reference.

    **dt (Stage-1b MEASURED):** ``dt=1e-3`` keeps the stiff (``E=4e3``) elastic dynamics in
    the stable, smooth regime (autodiff-vs-FD <= ~2e-8). Larger steps (``dt>=5e-3``) leave it -
    the deformation grows, the stress dynamics stiffen, and the gradient becomes
    ill-conditioned (autodiff-vs-FD jumps to ~3%, the DiffTaichi "sim gradients aren't always
    well-conditioned" warning). The reference itself runs ``dt=1e-4``; ``1e-3`` is the largest
    smooth step. A side-effect: the small ``dt`` makes the ``v0->final-position`` map small in
    magnitude, so the recovery loss is **flat in ``v0``** -> :func:`~.sim.solve_recovery` uses a
    curvature-scaled Newton-ish SGD step rather than a fixed-lr Adam.
    """

    grid_n: int = 16
    n_particles: int = 6
    steps: int = 8
    dt: float = 1.0e-3
    youngs_modulus: float = 4.0e3
    poisson_ratio: float = 0.3
    gravity_z: float = -9.81
    mass: float = 1.0
    volume: float = 1.0
    floor_z_index: int = -1  # <0 => sticky floor disabled (interior free-flight regime)
    blob_center: tuple[float, float, float] = (0.5, 0.5, 0.5)
    blob_radius: float = 0.03
    seed: int = 42

    @property
    def dx(self) -> float:
        return 1.0 / float(self.grid_n)

    @property
    def mu(self) -> float:
        """Lamé mu = E / (2(1+nu))."""
        return self.youngs_modulus / (2.0 * (1.0 + self.poisson_ratio))

    @property
    def lam(self) -> float:
        """Lamé lam = Enu / ((1+nu)(1-2nu))."""
        nu = self.poisson_ratio
        return self.youngs_modulus * nu / ((1.0 + nu) * (1.0 - 2.0 * nu))


def cluster_initial_positions(cfg: MpmDiffConfig) -> NDArray[np.float64]:
    """A small, deterministic interior particle cluster about ``blob_center``.

    A seeded uniform jitter (NumPy ``default_rng`` - banned-global-RNG-free, S-M4 clean
    contract) of radius ``blob_radius`` so every particle's 3x3x3 stencil stays interior for
    the whole horizon (no boundary clamp activates -> the gradient is smooth and the
    momentum-impulse invariant is exact)."""
    rng = np.random.default_rng(int(cfg.seed))
    c = np.asarray(cfg.blob_center, dtype=np.float64)
    jitter = cfg.blob_radius * (rng.random((cfg.n_particles, 3)) - 0.5)
    return np.ascontiguousarray(c[None, :] + jitter, dtype=np.float64)


def ballistic_dx_dv0(dt: float, steps: int) -> float:
    """Closed-form ballistic Jacobian diagonal ``dx(T)/dv0 = dt*STEPS`` (A1).

    Single particle, ``F=I``, ``C=0``: the neo-Hookean stress vanishes (``mu(I-I)+lam*log 1*I=0``)
    and the APIC affine reconstruction's first moment ``sum_node w*dpos`` is identically zero for
    the quadratic B-spline, so the APIC round-trip degenerates to PIC free-flight
    ``v_{t+1}=v_t+g*dt*z``, ``x_{t+1}=x_t+dt*v_{t+1}``. Hence ``x(T)=x0+dt*sum_{t=1}^{T} v_t`` and
    ``dx(T)/dv0 = dt*T`` per component (gravity is ``v0``-independent). Hand-derived kinematics."""
    return float(dt) * float(steps)


def neohookean_stress(F: NDArray[np.float64], mu: float, lam: float) -> NDArray[np.float64]:
    """Neo-Hookean Kirchhoff stress ``sigma = mu(B - I) + lam log(J) I`` (B = F Fᵀ, J = det F).

    The oracle form mirrors the reference ``_k_compute_stresses``; used by the A3 constitutive
    anchor and as a NumPy cross-check."""
    F = np.asarray(F, dtype=np.float64)
    B = F @ F.T
    j = float(np.linalg.det(F))
    log_j = np.log(j) if j > 0.0 else -30.0
    return (mu * (B - np.eye(3)) + lam * log_j * np.eye(3)).astype(np.float64)


def neohookean_dstress00_dstrain(mu: float, lam: float) -> float:
    """Closed-form ``d(sigma00)/deps`` at ``F = diag(1+eps,1,1)``, eps->0 (A3).

    ``B00=(1+eps)^2``, ``J=1+eps`` => ``sigma00 = mu((1+eps)^2-1) + lam log(1+eps)``;
    ``d(sigma00)/deps|0 = 2mu + lam``. Neo-Hookean linearization, hand-derived (Stomakhin 2013 /
    Jiang 2016 MPM course, as the reference's constitutive cites)."""
    return 2.0 * float(mu) + float(lam)
