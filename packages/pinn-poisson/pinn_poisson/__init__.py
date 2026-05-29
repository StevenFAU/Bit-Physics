"""``pinn-poisson`` — Physics-Informed Neural Network for the 2D Poisson equation.

Phase 3 task-7, the FIRST learned-dynamics-CATEGORY sim. Stack E (Warp substrate)
+ PyTorch, CPU-only. Soft-constraint Raissi-2019 PINN solving ``Du = f`` on
``[0,1]^2``, verified two-pronged (analytic anchors + classical FD reference) plus
convergence-with-collocation.
"""

from __future__ import annotations

from .fd_reference import fd_convergence_orders, fd_solve
from .infer import (
    evaluate_on_grid,
    load_checkpoint,
    save_checkpoint,
    write_inference_capture,
)
from .model import PINNConfig, PINNModel, build_model
from .problems import (
    ANCHOR1,
    ANCHOR2,
    ANCHOR3,
    ANCHORS,
    CANONICAL_PROBLEM,
    PoissonProblem,
    anchor_by_name,
)
from .train import TrainResult, train_pinn

__all__ = [
    "ANCHOR1",
    "ANCHOR2",
    "ANCHOR3",
    "ANCHORS",
    "CANONICAL_PROBLEM",
    "PINNConfig",
    "PINNModel",
    "PoissonProblem",
    "TrainResult",
    "anchor_by_name",
    "build_model",
    "evaluate_on_grid",
    "fd_convergence_orders",
    "fd_solve",
    "load_checkpoint",
    "save_checkpoint",
    "train_pinn",
    "write_inference_capture",
]
