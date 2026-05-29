"""PINN training loop — Adam warm-up then L-BFGS refinement.

Raissi-2019 soft-constraint training: minimize ``L_interior + boundary_weight ·
L_boundary`` over a fixed (seeded) collocation set. Adam takes the loss down a few
orders of magnitude; an L-BFGS (strong-Wolfe) refinement phase drives the final few
orders — the standard PINN recipe that reaches the ``analytical_l2 = 1e-3`` gate on
the Poisson anchors.

Deterministic given ``config.seed``: ``torch.manual_seed`` seeds the Glorot weight
init, and an independent ``torch.Generator`` seeds the interior collocation sample
(boundary points are deterministic edge nodes). The trained-weight reproducibility
(EFECT) is measured across seeds at Stage 1b-PINN; this loop is the per-seed run.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import torch
from torch import Tensor

from .model import PINNConfig, PINNModel
from .problems import PoissonProblem
from .residual import boundary_loss, interior_loss


@dataclass
class TrainResult:
    """Outcome of a PINN training run."""

    model: PINNModel
    loss_history: list[float] = field(default_factory=list)
    final_loss: float = float("nan")
    final_interior_loss: float = float("nan")
    final_boundary_loss: float = float("nan")


def _collocation(config: PINNConfig) -> tuple[Tensor, Tensor]:
    """Fixed interior collocation sample (seeded, independent of the weight RNG)."""
    gen = torch.Generator().manual_seed(config.seed)
    x = torch.rand(config.n_interior, 1, dtype=torch.float64, generator=gen, requires_grad=True)
    y = torch.rand(config.n_interior, 1, dtype=torch.float64, generator=gen, requires_grad=True)
    return x, y


def _boundary_nodes(config: PINNConfig) -> tuple[Tensor, Tensor]:
    """Deterministic Dirichlet boundary nodes — ``n_boundary`` per edge."""
    nb = config.n_boundary
    s = torch.linspace(0.0, 1.0, nb, dtype=torch.float64).reshape(-1, 1)
    zero = torch.zeros(nb, 1, dtype=torch.float64)
    one = torch.ones(nb, 1, dtype=torch.float64)
    x = torch.cat([zero, one, s, s])  # x=0, x=1, bottom, top
    y = torch.cat([s, s, zero, one])
    return x, y


def train_pinn(problem: PoissonProblem, config: PINNConfig | None = None) -> TrainResult:
    """Train a soft-constraint PINN on ``problem``; deterministic given ``config.seed``."""
    cfg = config or PINNConfig()
    torch.manual_seed(cfg.seed)
    model = PINNModel(cfg)

    xi, yi = _collocation(cfg)
    xb, yb = _boundary_nodes(cfg)

    def losses() -> tuple[Tensor, Tensor, Tensor]:
        l_int = interior_loss(model, xi, yi, problem)
        l_bnd = boundary_loss(model, xb, yb, problem)
        return l_int + cfg.boundary_weight * l_bnd, l_int, l_bnd

    history: list[float] = []
    adam = torch.optim.Adam(model.parameters(), lr=cfg.learning_rate)
    for _ in range(cfg.iterations):
        adam.zero_grad()
        total, _, _ = losses()
        total.backward()  # type: ignore[no-untyped-call]
        adam.step()
        history.append(float(total.detach()))

    if cfg.lbfgs_iterations > 0:
        lbfgs = torch.optim.LBFGS(
            model.parameters(),
            lr=1.0,
            max_iter=cfg.lbfgs_iterations,
            tolerance_grad=1e-13,
            tolerance_change=1e-15,
            history_size=50,
            line_search_fn="strong_wolfe",
        )

        def closure() -> Tensor:
            lbfgs.zero_grad()
            total, _, _ = losses()
            total.backward()  # type: ignore[no-untyped-call]
            return total

        lbfgs.step(closure)  # type: ignore[no-untyped-call]
        history.append(float(losses()[0].detach()))

    # The PDE residual needs autograd (second derivatives), so the final loss read
    # cannot run under ``no_grad``; detach the scalars after computing.
    total, l_int, l_bnd = losses()
    return TrainResult(
        model=model,
        loss_history=history,
        final_loss=float(total.detach()),
        final_interior_loss=float(l_int.detach()),
        final_boundary_loss=float(l_bnd.detach()),
    )
