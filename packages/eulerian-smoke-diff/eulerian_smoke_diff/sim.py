# mypy: ignore-errors
"""Differentiable smoke inverse problems + capture helpers (Stack E / NVIDIA Warp).

:class:`SmokeInitialFieldID` (an :class:`~common_warp.autodiff.InitialStateRecoveryProblem`)
recovers the **initial smoke density field** ``u₀`` of a constant-velocity advection rollout from
its observed final frame — the canonical "recover the initial smoke distribution" inverse
(charter § 3.4). The forward is the tape-differentiable semi-Lagrangian advect chain in
:mod:`._kernels` (on-device ``requires_grad`` arrays; the reference's NumPy-marshalling primitives
sever the ``wp.Tape``, so they are NOT wrapped).

**Identifiability (on-evidence Stage-1b finding):** ``advect`` by a *constant* velocity is the
linear operator ``M`` (fixed bilinear-interpolation weights). For a fractional cell displacement
bounded away from 0.5, ``M`` is full-rank and well-conditioned over the short horizon, so the
recovery of the full field ``u₀`` is identifiable (unique convex-quadratic minimum). Diffusion is
a low-pass (smoothing) operator → recovering ``u₀`` from a *diffused* target is ill-posed for high
frequencies (backward heat); the canonical recovery is therefore scoped to the **pure-advection**
regime (diffusion is exercised by the A3 gradient anchor + a PBT). Documented in
:func:`solve_recovery`.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
import warp as wp
from common_warp.autodiff import InitialStateRecoveryProblem, ParamSpec
from common_warp.autodiff.finite_diff import make_optimizer

from ._kernels import accumulate_l2_2d, diffuse_2d, load_field_2d, sl_advect_2d
from .forward import SmokeDiffConfig, constant_velocity_fields, smooth_initial_field

wp.init()

__all__ = [
    "InverseSolution",
    "SmokeInitialFieldID",
    "autodiff_dloss_dnu",
    "solve_recovery",
]

_DEVICE = "cpu"


class SmokeInitialFieldID(InitialStateRecoveryProblem):  # type: ignore[misc]
    """Recover the initial smoke field ``u₀`` from the observed final advected frame.

    The ``(grid_n*grid_n,)`` ``requires_grad`` parameter vector is loaded into field-0 INSIDE the
    tape (a linear copy) so ``wp.Tape`` backprops ``∂Loss/∂u₀``. The forward runs the
    tape-differentiable constant-velocity SL-advect chain; the loss is the L2 final-frame mismatch.
    Regime: constant velocity, short horizon (the well-conditioned identifiable map)."""

    def __init__(self, cfg: SmokeDiffConfig, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        n = cfg.grid_n
        u_np, v_np = constant_velocity_fields(cfg)
        self._uw = wp.array(u_np, dtype=wp.float64, device=_DEVICE)
        self._vw = wp.array(v_np, dtype=wp.float64, device=_DEVICE)
        self._u0 = wp.zeros(n * n, dtype=wp.float64, requires_grad=True, device=_DEVICE)
        self.state = (n,)

    # -- subclass contract ---------------------------------------------------

    def params_spec(self) -> ParamSpec:
        n = self.cfg.grid_n

        def pack(d: Any) -> Any:
            arr = np.asarray(d["u0"] if isinstance(d, dict) else d, dtype=np.float64).ravel()
            self._u0.assign(arr)
            return self._u0

        def unpack(flat: Any) -> dict[str, np.ndarray]:
            return {"u0": np.asarray(flat.numpy(), dtype=np.float64).reshape(n, n)}

        return ParamSpec(
            flat=self._u0,
            pack=pack,
            unpack=unpack,
            structure={"u0": {"index": slice(0, n * n), "shape": (n * n,)}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        """Tape-differentiable constant-velocity SL-advect rollout; return the final 2D field.

        ``params`` is the ``(n*n,)`` ``requires_grad`` ``u₀`` vector. Field-0 is loaded from it
        inside the tape (linear copy → the gradient flows to ``params``); each advect step writes a
        fresh ``requires_grad`` 2D array so the tape records the chain."""
        (n,) = state
        cfg = self.cfg
        field = wp.zeros((n, n), dtype=wp.float64, requires_grad=True, device=_DEVICE)
        wp.launch(load_field_2d, dim=(n, n), inputs=[params, wp.int32(n), field], device=_DEVICE)
        for _ in range(cfg.steps):
            nxt = wp.zeros((n, n), dtype=wp.float64, requires_grad=True, device=_DEVICE)
            wp.launch(
                sl_advect_2d,
                dim=(n, n),
                inputs=[
                    field,
                    self._uw,
                    self._vw,
                    wp.float64(cfg.dt),
                    wp.float64(cfg.dx),
                    wp.int32(n),
                    wp.int32(n),
                    nxt,
                ],
                device=_DEVICE,
            )
            field = nxt
        return field

    def loss(self, predicted: Any, target: Any) -> Any:
        """2D L2 loss (the base ``common_warp`` ``accumulate_l2`` is 1-D; smoke fields are 2D)."""
        n = self.cfg.grid_n
        wp.launch(
            accumulate_l2_2d,
            dim=(n, n),
            inputs=[predicted, target, self._loss_array],
            device=self._loss_array.device,
        )
        return self._loss_array

    # -- non-tape convenience ------------------------------------------------

    def final_field(self, u0: np.ndarray) -> np.ndarray:
        """Run the forward at ``u0`` (no tape); return the final 2D field ``(n, n)``."""
        self._u0.assign(np.ascontiguousarray(u0, dtype=np.float64).ravel())
        out = self.forward(self._u0, self.state)
        return np.asarray(out.numpy(), dtype=np.float64)

    def grad_wrt_u0(self, u0: np.ndarray, target: np.ndarray) -> np.ndarray:
        """Autodiff ``∂Loss/∂u₀`` ``(n, n)`` at ``u0`` against ``target`` final frame."""
        n = self.cfg.grid_n
        self.set_target(np.ascontiguousarray(target, dtype=np.float64))
        _, grad = self._loss_and_grad(
            self.params_spec(), np.ascontiguousarray(u0, dtype=np.float64).ravel()
        )
        return np.asarray(grad, dtype=np.float64).reshape(n, n)


def autodiff_dloss_dnu(
    cfg: SmokeDiffConfig, u0: np.ndarray, target: np.ndarray, nu: float
) -> float:
    """Autodiff ``∂Loss/∂nu`` of one explicit-diffusion step (A3), ``wp.Tape`` w.r.t. ``nu``."""
    n = cfg.grid_n
    field = wp.array(np.ascontiguousarray(u0, dtype=np.float64), dtype=wp.float64, device=_DEVICE)
    nu_arr = wp.array([float(nu)], dtype=wp.float64, requires_grad=True, device=_DEVICE)
    tgt = wp.array(np.ascontiguousarray(target, dtype=np.float64), dtype=wp.float64, device=_DEVICE)
    out = wp.zeros((n, n), dtype=wp.float64, requires_grad=True, device=_DEVICE)
    loss = wp.zeros(1, dtype=wp.float64, requires_grad=True, device=_DEVICE)
    tape = wp.Tape()
    with tape:
        wp.launch(
            diffuse_2d,
            dim=(n, n),
            inputs=[
                field,
                nu_arr,
                wp.float64(cfg.dt),
                wp.float64(cfg.inv_dx2),
                wp.int32(n),
                wp.int32(n),
                out,
            ],
            device=_DEVICE,
        )
        wp.launch(accumulate_l2_2d, dim=(n, n), inputs=[out, tgt, loss], device=_DEVICE)
    tape.backward(loss=loss)
    g = float(nu_arr.grad.numpy()[0])
    tape.zero()
    return g


# --------------------------------------------------------------------------- #
# Inverse-solution capture payload
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-``u₀`` recovery (the canonical capture payload)."""

    recovered_field: np.ndarray
    planted_field: np.ndarray
    loss_trajectory: list[float]
    final_field: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_recovery(
    cfg: SmokeDiffConfig,
    *,
    optimizer: str = "adam",
    lr: float = 0.1,
    max_iter: int = 4000,
    tol: float = 1e-14,
) -> InverseSolution:
    """Plant a smooth ``u₀``, then recover it from the observed final advected frame.

    ``u₀`` is identifiable in the constant-velocity regime (the advect operator ``M`` is full-rank
    and well-conditioned → the L2 loss is a strictly-convex quadratic with its unique minimum at
    the planted field), so the recovery converges to the planted ``u₀``. Returns the recovered
    field, the optimization trajectory, the final frame, and the autodiff ``gradient_fields``
    (``∂Loss/∂u₀`` at the recovered point, ≈ 0) for the schema-1.1.0 capture."""
    planted = smooth_initial_field(cfg)
    truth = SmokeInitialFieldID(cfg)
    target = truth.final_field(planted)

    prob = SmokeInitialFieldID(cfg)
    prob.set_target(np.ascontiguousarray(target, dtype=np.float64))
    spec = prob.params_spec()
    opt = make_optimizer(optimizer, lr, (cfg.grid_n * cfg.grid_n,))

    x = np.zeros(cfg.grid_n * cfg.grid_n, dtype=np.float64)  # recover from a zero field
    losses: list[float] = []
    for _ in range(max_iter):
        loss, grad = prob._loss_and_grad(spec, x)
        losses.append(loss)
        if loss < tol:
            break
        x = opt.step(x, grad.ravel())
    recovered = x.reshape(cfg.grid_n, cfg.grid_n).copy()

    _, grad = prob._loss_and_grad(spec, x)
    final = np.asarray(prob.forward(prob._u0, prob.state).numpy(), dtype=np.float64)
    return InverseSolution(
        recovered_field=recovered,
        planted_field=planted,
        loss_trajectory=losses,
        final_field=final,
        grad_fields={
            "dLoss_du0": np.asarray(grad, dtype=np.float64).reshape(cfg.grid_n, cfg.grid_n)
        },
    )
