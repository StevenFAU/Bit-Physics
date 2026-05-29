"""The PINN network — a fully-connected MLP ``(x, y) -> u``.

Stage 1a: shell only. ``PINNConfig`` is real (pure data); ``build_model`` /
``PINNModel.forward`` raise ``NotImplementedError`` — Stage 1b-PINN reimplements
the Raissi-2019 (2019, *J. Comput. Phys.* 378:686-707) soft-constraint network
(tanh MLP, Glorot init), cross-checked against the vendored physicsnemo-sym
``examples/helmholtz/helmholtz.py`` fully-connected arch (read-only oracle).
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class PINNConfig:
    """Architecture + training hyper-parameters for the Poisson PINN."""

    seed: int = 42
    hidden_layers: int = 4
    hidden_units: int = 64
    activation: str = "tanh"
    n_interior: int = 2048
    n_boundary: int = 256
    iterations: int = 5000
    learning_rate: float = 1e-3
    boundary_weight: float = 1.0
    device: str = "cpu"


class PINNModel(nn.Module):
    """Fully-connected MLP approximating the Poisson solution ``u(x, y)``."""

    def __init__(self, config: PINNConfig | None = None) -> None:
        super().__init__()
        self.config = config or PINNConfig()
        raise NotImplementedError(
            "Stage 1b-PINN: build the tanh MLP (Raissi-2019 soft-constraint network)."
        )

    def forward(self, x: Tensor, y: Tensor) -> Tensor:  # pragma: no cover - shell
        raise NotImplementedError("Stage 1b-PINN: MLP forward pass (x, y) -> u.")


def build_model(config: PINNConfig | None = None) -> PINNModel:
    """Construct a seeded :class:`PINNModel` (deterministic init via ``config.seed``)."""
    raise NotImplementedError("Stage 1b-PINN: seed torch RNG from config.seed and build the MLP.")


def evaluate_grid(model: PINNModel, n: int) -> torch.Tensor:
    """Evaluate ``model`` on an ``nxn`` uniform grid over ``[0,1]^2`` -> ``(n, n)``."""
    raise NotImplementedError("Stage 1b-PINN: forward the model on the grid.")
