"""NCA training loop (Stack D, PyTorch).

Trains :class:`~neural_ca.model.NCAModel` to reconstruct a target RGBA image
from the canonical seed, minimizing pixel-wise L2 (MSE) on RGBA — the exact
objective of Mordvintsev et al. 2020 (``loss_f = mean(square(to_rgba(x) -
target))``; ``references/growing-neural-ca/notebooks/growing_ca.ipynb`` line
405). The upstream publishes NO PSNR/SSIM/LPIPS metrics; evaluation is the L2
loss + qualitative inspection (the basis for the statistical cross-stack gate).

Training is **non-deterministic by design** (stochastic fire mask + optimizer
dynamics); the determinism registry records the training-loss distributional
("EFECT") bound across pinned seeds (measured at Stage 1b-D).

Stage 1a: :func:`train_to_target` raises ``NotImplementedError``; implemented at
Stage 1b-D.
"""

from __future__ import annotations

from dataclasses import dataclass

from torch import Tensor

from .model import NCAConfig, NCAModel


@dataclass(frozen=True)
class TrainConfig:
    """Training hyperparameters."""

    steps: int = 8000
    lr: float = 2e-3
    batch_size: int = 8
    pool_size: int = 1024
    min_rollout: int = 64
    max_rollout: int = 96
    seed: int = 42


@dataclass(frozen=True)
class TrainResult:
    """Outcome of a training run."""

    model: NCAModel
    loss_log: list[float]
    final_loss: float


def train_to_target(
    target_rgba: Tensor,
    *,
    config: NCAConfig | None = None,
    train_config: TrainConfig | None = None,
) -> TrainResult:
    """Train an :class:`NCAModel` to reconstruct ``target_rgba`` to an L2 bound.

    Stage 1b-D implements this.
    """
    raise NotImplementedError("neural_ca.train.train_to_target — Stage 1b-D")
