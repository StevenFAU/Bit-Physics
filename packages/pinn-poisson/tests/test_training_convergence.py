"""Acceptance gate — PINN training converges (Stage 1a RED).

Stage 1a: ``train_pinn`` raises ``NotImplementedError`` -> RED. Stage 1b-PINN
implements the seeded Adam loop and these PASS: the composite loss decreases
substantially from its initial value and reaches a small final value.
"""

from __future__ import annotations

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig, train_pinn


def test_training_loss_decreases() -> None:
    config = PINNConfig(seed=42, iterations=5000)
    result = train_pinn(CANONICAL_PROBLEM, config)
    assert len(result.loss_history) > 0
    assert result.loss_history[-1] < result.loss_history[0]


def test_training_reaches_small_loss() -> None:
    config = PINNConfig(seed=42, iterations=5000)
    result = train_pinn(CANONICAL_PROBLEM, config)
    # The soft-constraint composite loss should drop well below 1e-2 on the
    # MMS problem at the canonical collocation budget.
    assert result.final_loss < 1e-2
