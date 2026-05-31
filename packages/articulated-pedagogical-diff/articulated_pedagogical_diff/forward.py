"""Differentiable articulated pendulum — config + closed-form analytic helpers (Stack E / Warp).

The tape-differentiable ``wp.Tape`` kernels and forward live in :mod:`._kernels` / :mod:`.sim`
(IC-12 dedicated kernel module). This module holds the strict-typed pure-NumPy surface: the
configuration dataclass, the canonical single-pendulum builder, and the closed-form analytic
gradient helpers the gradient-golden anchors verify the autodiff against —

* **A1** the analytic STATE-sensitivity ``∂q̈/∂q = -(g/L) cos q`` for the ideal simple pendulum
  ``q̈ = -(g/L) sin q`` (point mass at ``L``, ``I_com = 0`` ⇒ pivot inertia ``mL²``). Distinct
  physical term (state-sensitivity), parameter (``q``), method (gravity-torque linearization).
* **A3** the analytic TORQUE-sensitivity ``∂q̈/∂τ = H⁻¹ = 1/(I_com + m·cdist²) = 1/(mL²)`` for the
  single link — a *distinct physical term* (torque-sensitivity, not state), *distinct parameter*
  (``τ``, not ``q``), and *distinct method* (joint-space-inertia inversion, not gravity
  linearization). ``∂q̈/∂τ`` is configuration-independent (constant) for the single link.

Algorithm reference: Featherstone (2008), *Rigid Body Dynamics Algorithms*, Ch. 7 §7.3 (the
Articulated-Body Algorithm); the single-pendulum gravity-only limit is independent of the
recursion (parent ``analytic.py`` docstring ``theta'' = -(g/L) sin(theta)``). Scope is the single
pendulum (the Stage-0 WARP-NATIVE-TAPE probe: ``wp.Tape`` through the landed ABA is machine-exact
for ``n=1``; the ``n≥2`` coupled adjoint is deferred).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

__all__ = [
    "ArticulatedDiffConfig",
    "analytic_dqddot_dq",
    "analytic_dqddot_dtau",
    "analytic_qddot",
]


@dataclass(frozen=True)
class ArticulatedDiffConfig:
    """Canonical differentiable single-pendulum configuration.

    The single pendulum (one revolute joint, point mass at the rod tip ``cdist = length``,
    ``I_com = 0``) is the scope where ``wp.Tape`` through the landed Featherstone ABA recursion is
    machine-exact (Stage-0 probe): the inward articulated-inertia accumulation never fires for
    ``n=1``, so the adjoint has no read-after-write aliasing. The inverse problem (recover the
    initial state ``(q0, qd0)`` from the observed final ``(q_T, qd_T)``) runs a short semi-implicit
    Euler rollout in this identifiable smooth regime (away from the separatrix).
    """

    length: float = 1.0
    mass: float = 1.0
    gravity: float = 9.81
    dt: float = 0.01
    steps: int = 50
    q0: float = 0.4
    qd0: float = 0.0
    seed: int = 42

    @property
    def pivot_inertia(self) -> float:
        """Joint-space inertia about the pivot ``H = I_com + m·cdist² = m L²`` (point mass)."""
        return float(self.mass * self.length * self.length)


def analytic_qddot(length: float, gravity: float, q: float) -> float:
    """Ideal simple-pendulum acceleration ``q̈ = -(g/L) sin q`` (point mass, gravity only)."""
    return float(-(gravity / length) * np.sin(q))


def analytic_dqddot_dq(length: float, gravity: float, q: float) -> float:
    """A1 — analytic state-sensitivity ``∂q̈/∂q = -(g/L) cos q``."""
    return float(-(gravity / length) * np.cos(q))


def analytic_dqddot_dtau(mass: float, length: float) -> float:
    """A3 — analytic torque-sensitivity ``∂q̈/∂τ = 1/(mL²)`` (single-link pivot inertia inverse)."""
    return float(1.0 / (mass * length * length))
