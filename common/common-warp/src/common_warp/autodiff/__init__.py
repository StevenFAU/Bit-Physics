"""Differentiable-sim infrastructure — Warp ``wp.Tape`` backend (plan § 4.2.A).

Public surface (identical to :mod:`common_py.autodiff`, the Taichi backend):

- :class:`InverseProblem` (ABC) + :class:`ParameterIDProblem`,
  :class:`InitialStateRecoveryProblem`, :class:`ControlProblem`.
- :class:`ParamSpec` — structured-params ↔ flat-tensor bridge.
- :class:`History`, :class:`GradientCheckReport`.
- :func:`finite_difference_gradient` — the FD cross-check primitive.

First-of-pattern for ``wp.Tape`` in this repo (Phase 3 PINN used PyTorch
autograd). Consumed by Phase 4.1's six differentiable sims.
"""

from __future__ import annotations

from .finite_diff import finite_difference_gradient
from .inverse_problem import (
    ControlProblem,
    GradientCheckReport,
    History,
    InitialStateRecoveryProblem,
    InverseProblem,
    ParameterIDProblem,
)
from .param_spec import ParamSpec

__all__ = [
    "ControlProblem",
    "GradientCheckReport",
    "History",
    "InitialStateRecoveryProblem",
    "InverseProblem",
    "ParamSpec",
    "ParameterIDProblem",
    "finite_difference_gradient",
]
