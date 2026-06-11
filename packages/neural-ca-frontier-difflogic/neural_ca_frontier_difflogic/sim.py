"""Frozen-gate DiffLogic-CA: hard trajectory runner + WU-A soft-excitation inverse problem.

* :func:`run_hard_trajectory` - the deterministic GoL rollout through the frozen-gate
  circuit kernel (binary states stay EXACT through the multilinear gates - the hard limit).
* :class:`SoftExcitationID` (a :class:`~common_py.autodiff.ParameterIDProblem`) - the D-3
  WU-A surface: a scalar ``alpha`` blends a soft excitation into one cell of the initial
  state; the forward is ``soft_steps`` differentiable CA steps; the loss is the L2
  final-state mismatch. The map ``alpha -> final state`` is a fixed polynomial (composition
  of multilinear gates), so the gradient is smooth and FD-checkable everywhere on [0,1].

No training anywhere (frozen wiring) => no training-loss distribution => no EFECT
(batch-3 § 3.4 scope, ratified D-3).
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
import taichi as ti
from common_py.autodiff import ParameterIDProblem, ParamSpec

from ._kernels import make_difflogic_kernels
from .forward import DiffLogicConfig, glider_initial_state

__all__ = [
    "InverseSolution",
    "SoftExcitationID",
    "run_hard_trajectory",
    "solve_recovery",
]

#: Soft-excitation amplitude at the excite cell (alpha in [0,1] keeps state in [0,1]).
EXCITE_DELTA = 0.5


def run_hard_trajectory(
    cfg: DiffLogicConfig, initial: np.ndarray, *, steps: int | None = None
) -> np.ndarray:
    """Roll the frozen-gate circuit ``steps`` times from a binary ``initial`` state.

    Returns the full (steps+1, N, N) f64 trajectory (binary - the hard limit is exact).
    Uses the same compiled kernel as the soft path (soft_steps field sized to ``steps``)."""
    n_steps = int(cfg.steps if steps is None else steps)
    N = cfg.grid_n
    ker = make_difflogic_kernels(grid_n=N, soft_steps=n_steps)
    s = ti.field(ti.f64, shape=(n_steps + 1, N, N), needs_grad=False)
    s.fill(0.0)
    init = np.ascontiguousarray(initial, dtype=np.float64)
    for i in range(N):
        for j in range(N):
            s[0, i, j] = float(init[i, j])
    for t in range(n_steps):
        ker["step"](t, s)
    return np.asarray(s.to_numpy(), dtype=np.float64)


class SoftExcitationID(ParameterIDProblem):  # type: ignore[misc]
    """Recover the soft-excitation amplitude ``alpha`` from the observed final soft state.

    ``s[0] = base + alpha * delta`` (``delta`` = EXCITE_DELTA at ``cfg.excite_cell``,
    0 elsewhere); forward = ``cfg.soft_steps`` differentiable circuit steps; loss = L2 vs
    the target final state. Regime: alpha in [0,1] (state stays in [0,1]; the multilinear
    gates are [0,1]-preserving)."""

    def __init__(self, cfg: DiffLogicConfig, base: np.ndarray | None = None, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        N, S = cfg.grid_n, cfg.soft_steps
        base_arr = glider_initial_state(cfg) if base is None else base
        base_arr = np.ascontiguousarray(base_arr, dtype=np.float64)
        ci, cj = cfg.excite_cell
        if base_arr[ci, cj] != 0.0:
            raise ValueError(f"excite cell {cfg.excite_cell} must be empty in the base state")
        delta_arr = np.zeros((N, N), dtype=np.float64)
        delta_arr[ci, cj] = EXCITE_DELTA

        self.s = ti.field(ti.f64, shape=(S + 1, N, N), needs_grad=True)
        self.base = ti.field(ti.f64, shape=(N, N))
        self.base.from_numpy(base_arr)
        self.delta = ti.field(ti.f64, shape=(N, N))
        self.delta.from_numpy(delta_arr)
        self._alpha = ti.field(ti.f64, shape=1, needs_grad=True)
        self._ker = make_difflogic_kernels(grid_n=N, soft_steps=S)
        self._base_arr = base_arr
        self.state = (base_arr,)

    def params_spec(self) -> ParamSpec:
        def pack(d: Any) -> Any:
            val = d["alpha"] if isinstance(d, dict) else d
            self._alpha.from_numpy(np.asarray([val], dtype=np.float64).ravel())
            return self._alpha

        def unpack(flat: Any) -> dict[str, float]:
            return {"alpha": float(flat.to_numpy()[0])}

        return ParamSpec(
            flat=self._alpha,
            pack=pack,
            unpack=unpack,
            structure={"alpha": {"index": 0, "shape": ()}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        """Load s[0] = base + alpha*delta (in-tape), run the soft rollout; return ``s``."""
        k = self._ker
        k["load_alpha"](self.s, self.base, self.delta, params)
        for t in range(self.cfg.soft_steps):
            k["step"](t, self.s)
        return self.s

    def loss(self, predicted: Any, target: Any) -> Any:
        self._ker["comp_loss"](self.s, target, self.loss_field)
        return self.loss_field

    def final_state(self, alpha: float) -> np.ndarray:
        """Run the forward at ``alpha`` (no tape); return the final soft state (N,N)."""
        self._alpha.from_numpy(np.asarray([alpha], dtype=np.float64))
        self.forward(self._alpha, self.state)
        return np.asarray(self.s.to_numpy()[self.cfg.soft_steps], dtype=np.float64)

    def grad_wrt_alpha(self, alpha: float, target: np.ndarray) -> float:
        """Autodiff ``dLoss/dalpha`` at ``alpha`` against ``target`` final state."""
        self.set_target(target)
        _, grad = self._loss_and_grad(self.params_spec(), np.asarray([alpha], dtype=np.float64))
        return float(np.asarray(grad, dtype=np.float64).ravel()[0])


# --------------------------------------------------------------------------- #
# Inverse-solution capture payload
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-``alpha`` recovery (the canonical capture payload)."""

    recovered_alpha: float
    planted_alpha: float
    loss_trajectory: list[float]
    final_state: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_recovery(
    cfg: DiffLogicConfig,
    *,
    planted: float,
    init: float,
    optimizer: str = "adam",
    lr: float = 0.05,
    max_iter: int = 400,
    tol: float = 1e-22,
) -> InverseSolution:
    """Plant a soft-excitation ``alpha``, then recover it from the final soft state.

    The loss is a smooth 1-D polynomial in ``alpha`` with a single root basin at the
    planted point inside [0,1] (the excitation propagates through the glider's
    neighborhood within ``soft_steps``); Adam converges robustly on the 1-D surface."""
    truth = SoftExcitationID(cfg)
    target = truth.final_state(float(planted))

    prob = SoftExcitationID(cfg, optimizer=optimizer, lr=lr, max_iter=max_iter, tol=tol)
    history = prob.fit(params_init={"alpha": float(init)}, target=target)
    rec = float(history.params_trajectory[-1]["alpha"])

    _, grad = prob._loss_and_grad(prob.params_spec(), np.asarray([rec], dtype=np.float64))
    final = np.asarray(prob.s.to_numpy()[cfg.soft_steps], dtype=np.float64)
    return InverseSolution(
        recovered_alpha=rec,
        planted_alpha=float(planted),
        loss_trajectory=list(history.losses),
        final_state=final,
        grad_fields={"dLoss_dalpha": np.asarray(grad, dtype=np.float64).ravel()},
    )
