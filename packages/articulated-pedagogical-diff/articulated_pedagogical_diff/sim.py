# mypy: ignore-errors
"""Differentiable articulated-pendulum forward + inverse problem (Stack E / NVIDIA Warp).

STAGE 1a SCAFFOLD — the public compute surface raises ``NotImplementedError``; the acceptance tests
(gradient golden, parent-vs-frontier forward-equivalence, inverse recovery, determinism, PBT,
capture, diagnostics) FAIL RED. Stage 1b implements the on-device tape-differentiable ABA forward
(the landed parent ``aba_kernel`` launched inside a ``wp.Tape`` with ``requires_grad`` arrays — no
``.numpy()`` tape-sever) and inverts the suite to GREEN.

Scope = single pendulum (n=1) — the Stage-0 WARP-NATIVE-TAPE probe MEASURED the n≥2 coupled adjoint
diverging (inward-pass in-place aliasing); the variant is single-pendulum-scoped (the FORWARD is
exact at any n).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from articulated_pedagogical.model import ArticulatedChain

from .forward import ArticulatedDiffConfig

__all__ = [
    "InverseSolution",
    "PendulumStateRecovery",
    "central_fd_dqddot",
    "differentiable_qddot",
    "qddot_gradient",
    "solve_recovery",
]

_NI = "Stage 1a scaffold — implemented at Stage 1b"


def differentiable_qddot(
    chain: ArticulatedChain, q: np.ndarray, qd: np.ndarray, tau: np.ndarray | None = None
) -> np.ndarray:
    """On-device ABA forward acceleration ``q̈`` (no tape). [Stage 1b]"""
    raise NotImplementedError(_NI)


def qddot_gradient(
    chain: ArticulatedChain,
    q: np.ndarray,
    qd: np.ndarray,
    tau: np.ndarray | None = None,
    *,
    wrt: str = "q",
    idx: int = 0,
) -> tuple[np.ndarray, float]:
    """Autodiff ``(q̈, ∂q̈[idx]/∂<wrt>[idx])`` via ``wp.Tape``. [Stage 1b]"""
    raise NotImplementedError(_NI)


def central_fd_dqddot(
    chain: ArticulatedChain,
    q: np.ndarray,
    qd: np.ndarray,
    tau: np.ndarray | None = None,
    *,
    wrt: str = "q",
    idx: int = 0,
    eps: float = 1e-6,
) -> float:
    """Central finite-difference baseline ``∂q̈[idx]/∂<wrt>[idx]`` (A2). [Stage 1b]"""
    raise NotImplementedError(_NI)


class PendulumStateRecovery:  # type: ignore[misc]
    """Recover the initial state ``(q0, qd0)`` from the observed final state. [Stage 1b]"""

    def __init__(self, chain: ArticulatedChain, cfg: ArticulatedDiffConfig, **kw: Any) -> None:
        raise NotImplementedError(_NI)


@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-``(q0, qd0)`` recovery (the canonical capture payload)."""

    recovered_q0: np.ndarray
    recovered_qd0: np.ndarray
    planted_q0: np.ndarray
    planted_qd0: np.ndarray
    loss_trajectory: list[float]
    final_state: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_recovery(
    chain: ArticulatedChain, cfg: ArticulatedDiffConfig, **kw: Any
) -> InverseSolution:
    """Plant ``(q0, qd0)``, then recover it from the observed final state. [Stage 1b]"""
    raise NotImplementedError(_NI)
