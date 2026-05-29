"""PINN training loop (Adam on the composite soft-constraint loss).

Stage 1a: shell. Stage 1b-PINN implements the deterministic (seeded) Adam loop,
returns the trained model + the per-iteration loss history (the EFECT bound is
derived from the loss distribution across seeds, and inference determinism is
measured on the frozen network — D-DET, measure-then-declare).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .model import PINNConfig, PINNModel
from .problems import PoissonProblem


@dataclass
class TrainResult:
    """Outcome of a PINN training run."""

    model: PINNModel
    loss_history: list[float] = field(default_factory=list)
    final_loss: float = float("nan")
    final_interior_loss: float = float("nan")
    final_boundary_loss: float = float("nan")


def train_pinn(problem: PoissonProblem, config: PINNConfig | None = None) -> TrainResult:
    """Train a soft-constraint PINN on ``problem``; deterministic given ``config.seed``."""
    raise NotImplementedError(
        "Stage 1b-PINN: seed RNG, sample collocation+boundary points, Adam-minimize "
        "interior_loss + boundary_weight*boundary_loss for config.iterations."
    )
