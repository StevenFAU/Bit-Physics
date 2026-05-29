"""Soft-constraint PINN losses — the PDE interior residual + the boundary term.

Stage 1a: shell. Stage 1b-PINN implements the Raissi-2019 composite loss:

- **interior** — ``r = Δu_NN - f`` on sampled collocation points, where the
  Laplacian ``Δu_NN = u_xx + u_yy`` is formed by *second-order* ``torch.autograd.grad``
  (twice-differentiated network output); loss ``mean(r^2)``.
- **boundary** — ``mean((u_NN - g)^2)`` on sampled ``∂Ω`` points (soft Dirichlet).

Cross-checked at derivation time against the vendored physicsnemo-sym
``PointwiseInteriorConstraint`` (collocation residual) + ``PointwiseBoundaryConstraint``
(soft ``u=0`` walls) — read-only oracle, NOT imported.
"""

from __future__ import annotations

from torch import Tensor

from .model import PINNModel
from .problems import PoissonProblem


def poisson_residual(model: PINNModel, x: Tensor, y: Tensor, problem: PoissonProblem) -> Tensor:
    """PDE residual ``Δu_NN(x, y) - f(x, y)`` at the collocation points (autograd)."""
    raise NotImplementedError(
        "Stage 1b-PINN: u_xx + u_yy via double torch.autograd.grad, minus problem.source."
    )


def interior_loss(model: PINNModel, x: Tensor, y: Tensor, problem: PoissonProblem) -> Tensor:
    """Mean-squared PDE residual over interior collocation points."""
    raise NotImplementedError("Stage 1b-PINN: mean(poisson_residual**2).")


def boundary_loss(model: PINNModel, x: Tensor, y: Tensor, problem: PoissonProblem) -> Tensor:
    """Mean-squared Dirichlet mismatch ``(u_NN - g)^2`` over boundary points."""
    raise NotImplementedError("Stage 1b-PINN: mean((model(x,y) - problem.boundary_value)**2).")
