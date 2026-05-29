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

import random
from dataclasses import dataclass

import torch
from torch import Tensor

from .model import NCAConfig, NCAModel, seed_state


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
    # Persistence (Distill "Persistent" experiment): a sample pool trains the
    # target as a STABLE FIXED POINT so the pattern persists past the trained
    # rollout horizon (the Growing/no-pool variant overgrows to a filled grid
    # by ~step 200). Required for a representative step-1000 capture.
    use_pool: bool = False


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
    """Train an :class:`NCAModel` to reconstruct ``target_rgba`` (an
    ``(H, W, 4)`` RGBA tensor in [0, 1]) to a pixel-wise-L2 bound.

    With ``train_config.use_pool=False`` (default) this is the Growing experiment
    (every batch starts from the seed). With ``use_pool=True`` it is the
    Persistent experiment (a sample pool of evolved states; each step resets the
    worst-loss member to the seed and writes the rollout back) — trains the
    target as a stable fixed point so the pattern persists to step 1000.

    Training is non-deterministic by design (stochastic fire mask + optimizer);
    the loss converges to a distribution whose band is the EFECT bound
    (measured across pinned seeds at Stage 1b-D).
    """
    config = config or NCAConfig()
    tc = train_config or TrainConfig()
    g = target_rgba.shape[0]
    if config.grid_size != g:
        config = NCAConfig(
            channel_n=config.channel_n,
            fire_rate=config.fire_rate,
            hidden_dim=config.hidden_dim,
            grid_size=g,
            target_emoji=config.target_emoji,
        )

    torch.manual_seed(tc.seed)
    rollout_rng = random.Random(tc.seed)

    model = NCAModel(config)
    optimizer = torch.optim.Adam(model.parameters(), lr=tc.lr)
    scheduler = torch.optim.lr_scheduler.MultiStepLR(
        optimizer, milestones=[max(1, int(tc.steps * 0.7))], gamma=0.1
    )

    # Target as (1, 4, H, W); broadcasts over the batch.
    target = target_rgba.permute(2, 0, 1).unsqueeze(0)
    seed = seed_state(g, config.channel_n)

    pool: Tensor | None = None
    if tc.use_pool:
        pool = seed.repeat(tc.pool_size, 1, 1, 1).clone()

    loss_log: list[float] = []
    for _ in range(tc.steps):
        if pool is not None:
            idx = torch.tensor(
                rollout_rng.sample(range(tc.pool_size), tc.batch_size), dtype=torch.long
            )
            x = pool[idx].clone()
            with torch.no_grad():
                # Reset the worst-loss sample to the seed (keeps grow-from-seed in
                # the mix while the rest persist evolved states).
                sample_loss = ((x[:, :4] - target) ** 2).mean(dim=(1, 2, 3))
                x[int(sample_loss.argmax())] = seed[0]
        else:
            idx = None
            x = seed.repeat(tc.batch_size, 1, 1, 1)

        n_rollout = rollout_rng.randint(tc.min_rollout, tc.max_rollout)
        for _ in range(n_rollout):
            x = model(x)
        loss = ((x[:, :4] - target) ** 2).mean()

        optimizer.zero_grad()
        loss.backward()  # type: ignore[no-untyped-call]
        # Per-parameter gradient normalization (Distill training-stability trick).
        for p in model.parameters():
            if p.grad is not None:
                p.grad /= p.grad.norm() + 1e-8
        optimizer.step()
        scheduler.step()
        loss_log.append(float(loss.item()))

        if pool is not None and idx is not None:
            with torch.no_grad():
                pool[idx] = x.detach()

    return TrainResult(model=model, loss_log=loss_log, final_loss=loss_log[-1])
