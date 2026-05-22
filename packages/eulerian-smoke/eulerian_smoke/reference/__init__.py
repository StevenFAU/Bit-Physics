"""Eulerian-smoke NumPy reference (Stam-Fedkiw stable-fluids stack).

Spec §§ 2.4, 2.5, 5.6; algebraic derivation at
``docs/sim-specs/volumetric-grid/eulerian-smoke/algebraic.md`` § 2.

Public surface (probe report § 5 contract):

- :func:`stable_fluids_step` — one 2D Stam stable-fluids step
  (semi-Lagrangian advect → optional source → Jacobi pressure-project).
  Returns ``(u_next, v_next, p_next)``. Consumed by ``tests/
  test_mms_convergence.py`` for the inline NS-2D MMS convergence
  study (gate 5; sub-phase plan § 4.2 step 3 Path-Y inline-MMS
  pattern inherited from RD-3D Stage 1 S2).
- :func:`project_pressure` — Jacobi pressure-projection (2D); also
  exposed because gate 5's projection-OOA test exercises it in
  isolation.
- :func:`stable_fluids_step_3d` — one 3D step including vorticity
  confinement + scalar (smoke density) advection. Used by the
  canonical 3D Taylor-Green capture per Appendix D § D.2.3.
- :func:`project_pressure_3d` — 3D Jacobi pressure-projection.
- :func:`semi_lagrangian_advect_2d`, :func:`semi_lagrangian_advect_3d`
  — periodic-BC bilinear / trilinear backtrace primitives.
- Canonical-capture descriptors + parameters.
"""

from __future__ import annotations

from .stable_fluids import (
    Array2D,
    Array3D,
    CANONICAL_DESCRIPTOR_2D,
    CANONICAL_DESCRIPTOR_3D,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT_2D,
    CANONICAL_STEP_COUNT_3D,
    canonical_params_2d,
    canonical_params_3d,
    maccormack_advect_2d,
    project_pressure,
    project_pressure_3d,
    semi_lagrangian_advect_2d,
    semi_lagrangian_advect_3d,
    stable_fluids_step,
    stable_fluids_step_3d,
)

__all__ = [
    "Array2D",
    "Array3D",
    "CANONICAL_DESCRIPTOR_2D",
    "CANONICAL_DESCRIPTOR_3D",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT_2D",
    "CANONICAL_STEP_COUNT_3D",
    "canonical_params_2d",
    "canonical_params_3d",
    "maccormack_advect_2d",
    "project_pressure",
    "project_pressure_3d",
    "semi_lagrangian_advect_2d",
    "semi_lagrangian_advect_3d",
    "stable_fluids_step",
    "stable_fluids_step_3d",
]
