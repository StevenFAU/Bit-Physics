"""The PINN network — a fully-connected ``tanh`` MLP ``(x, y) -> u``.

Reimplemented from Raissi, Perdikaris & Karniadakis (2019), *J. Comput. Phys.*
378:686-707 (cite-don't-import). Cross-checked against the vendored physicsnemo-sym
``examples/helmholtz/helmholtz.py`` fully-connected arch (read-only oracle): an MLP
``(x, y) -> u`` is the same network family. Glorot/Xavier init, seeded from
``config.seed`` for reproducible weights. f64 throughout (matches the analytic /
FD reference precision and the capture-bridge f64 path).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import cast

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class PINNConfig:
    """Architecture + training hyper-parameters for the Poisson PINN."""

    seed: int = 42
    hidden_layers: int = 4
    hidden_units: int = 60
    activation: str = "tanh"
    n_interior: int = 3000
    n_boundary: int = 100
    iterations: int = 2000
    lbfgs_iterations: int = 2000
    learning_rate: float = 1e-3
    boundary_weight: float = 10.0
    device: str = "cpu"


class PINNModel(nn.Module):
    """Fully-connected MLP approximating the Poisson solution ``u(x, y)``."""

    def __init__(self, config: PINNConfig | None = None) -> None:
        super().__init__()
        self.config = config or PINNConfig()
        widths = [2] + [self.config.hidden_units] * self.config.hidden_layers + [1]
        layers: list[nn.Module] = []
        for i in range(len(widths) - 1):
            linear = nn.Linear(widths[i], widths[i + 1], dtype=torch.float64)
            nn.init.xavier_normal_(linear.weight)
            nn.init.zeros_(linear.bias)
            layers.append(linear)
            if i < len(widths) - 2:
                layers.append(nn.Tanh())
        self.net = nn.Sequential(*layers)

    def forward(self, x: Tensor, y: Tensor) -> Tensor:
        """Forward pass: column tensors ``x, y`` of shape ``(N, 1)`` -> ``u`` ``(N, 1)``."""
        return cast(Tensor, self.net(torch.cat([x, y], dim=1)))


def build_model(config: PINNConfig | None = None) -> PINNModel:
    """Construct a seeded :class:`PINNModel` (deterministic init via ``config.seed``)."""
    cfg = config or PINNConfig()
    torch.manual_seed(cfg.seed)
    return PINNModel(cfg)


def evaluate_grid(model: PINNModel, n: int) -> torch.Tensor:
    """Evaluate ``model`` on an ``nxn`` uniform grid over ``[0,1]^2`` -> ``(n, n)``.

    Indexing convention ``"ij"`` (first axis = x), consistent with the FD solver and
    the analytic comparison grids.
    """
    axis = torch.linspace(0.0, 1.0, n, dtype=torch.float64)
    gx, gy = torch.meshgrid(axis, axis, indexing="ij")
    with torch.no_grad():
        flat = model(gx.reshape(-1, 1), gy.reshape(-1, 1))
    return cast(Tensor, flat.reshape(n, n))
