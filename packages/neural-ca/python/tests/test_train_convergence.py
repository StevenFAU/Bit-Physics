"""Gate-3 RED (Stage 1a): training-convergence.

Trains the NCA on a small synthetic RGBA target and asserts the final L2 loss
falls below a convergence bound — the Distill pixel-wise-L2 objective. RED at
Stage 1a (``train_to_target`` raises ``NotImplementedError``); GREEN at Stage
1b-D once training is implemented. The training-loss distribution across pinned
seeds is measured at 1b-D to derive the EFECT determinism bound.
"""

from __future__ import annotations

import numpy as np
import torch

from neural_ca import NCAConfig, train_to_target
from neural_ca.train import TrainConfig

# Convergence bound: a centered solid square is easy; a well-trained NCA drives
# the mean-squared RGBA error well below this. (Re-anchored on measurement at
# Stage 1b-D; this is the RED-side acceptance assertion.)
CONVERGENCE_L2_BOUND = 0.02


def test_train_converges_below_l2_bound(small_target: np.ndarray) -> None:
    config = NCAConfig(channel_n=16, grid_size=small_target.shape[0])
    train_config = TrainConfig(steps=300, seed=42)
    target = torch.from_numpy(small_target)

    result = train_to_target(target, config=config, train_config=train_config)

    assert result.final_loss < CONVERGENCE_L2_BOUND, (
        f"NCA did not converge: final L2 {result.final_loss} >= {CONVERGENCE_L2_BOUND}"
    )
    assert len(result.loss_log) == train_config.steps
    # Loss should trend downward.
    assert result.loss_log[-1] < result.loss_log[0]
