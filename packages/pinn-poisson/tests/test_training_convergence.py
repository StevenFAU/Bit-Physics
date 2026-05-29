"""Acceptance gate — PINN training converges.

The soft-constraint composite loss decreases substantially from its initial value
and reaches a small final value on the canonical MMS problem (Anchor 3).
"""

from __future__ import annotations

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig


def test_training_loss_decreases(train_cached) -> None:
    result = train_cached(CANONICAL_PROBLEM, PINNConfig())
    assert len(result.loss_history) > 0
    assert result.loss_history[-1] < result.loss_history[0]


def test_training_reaches_small_loss(train_cached) -> None:
    result = train_cached(CANONICAL_PROBLEM, PINNConfig())
    # The soft-constraint composite loss drops well below 1e-2 on the MMS problem.
    assert result.final_loss < 1e-2
