"""Soft-constraint PINN losses — the PDE interior residual + the boundary term.

Raissi-2019 composite loss:

- **interior** — ``r = Δu_NN - f`` on sampled collocation points, where the
  Laplacian ``Δu_NN = u_xx + u_yy`` is formed by *second-order* ``torch.autograd.grad``
  (twice-differentiated network output); loss ``mean(r^2)``.
- **boundary** — ``mean((u_NN - g)^2)`` on sampled ``∂Ω`` points (soft Dirichlet).

Cross-checked at derivation time against the vendored physicsnemo-sym
``PointwiseInteriorConstraint`` (collocation residual) + ``PointwiseBoundaryConstraint``
(soft ``u=0`` walls) — read-only oracle, NOT imported.
"""

from __future__ import annotations

from typing import cast

import torch
from torch import Tensor

from .model import PINNModel
from .problems import PoissonProblem


def poisson_residual(model: PINNModel, x: Tensor, y: Tensor, problem: PoissonProblem) -> Tensor:
    """PDE residual ``Δu_NN(x, y) - f(x, y)`` at the collocation points (autograd).

    ``x`` and ``y`` must be leaf tensors with ``requires_grad=True``.
    """
    u = model(x, y)
    ones = torch.ones_like(u)
    u_x = torch.autograd.grad(u, x, ones, create_graph=True)[0]
    u_y = torch.autograd.grad(u, y, ones, create_graph=True)[0]
    u_xx = torch.autograd.grad(u_x, x, torch.ones_like(u_x), create_graph=True)[0]
    u_yy = torch.autograd.grad(u_y, y, torch.ones_like(u_y), create_graph=True)[0]
    return cast(Tensor, u_xx + u_yy - problem.source(x, y, torch))


def interior_loss(model: PINNModel, x: Tensor, y: Tensor, problem: PoissonProblem) -> Tensor:
    """Mean-squared PDE residual over interior collocation points."""
    residual = poisson_residual(model, x, y, problem)
    return (residual**2).mean()


def boundary_loss(model: PINNModel, x: Tensor, y: Tensor, problem: PoissonProblem) -> Tensor:
    """Mean-squared Dirichlet mismatch ``(u_NN - g)^2`` over boundary points."""
    u = model(x, y)
    g = problem.boundary_value(x, y, torch)
    return cast(Tensor, ((u - g) ** 2).mean())
