# mypy: ignore-errors
"""Differentiable-sim inverse problems — Warp ``wp.Tape`` backend (plan § 4.2.A).

:class:`InverseProblem` wraps Warp's reverse-mode autodiff in the same OO surface
as :mod:`common_py.autodiff` (the Taichi backend). The differentiable contract a
subclass implements:

- :meth:`InverseProblem.params_spec` returns a :class:`ParamSpec` whose ``flat``
  is a 1-D ``wp.array(dtype=wp.float64, requires_grad=True)``.
- :meth:`InverseProblem.forward` reads ``flat`` (the *params* argument is the
  ``ParamSpec.flat`` array) and the problem ``state``, launching ``@wp.kernel`` s
  that populate and return a ``requires_grad`` *predicted* array.
- :meth:`InverseProblem.loss` (default L2) accumulates the scalar objective into
  the internal ``requires_grad`` loss array.

:meth:`fit` and :meth:`check_gradient` record ``forward`` then ``loss`` on a
``wp.Tape``, call ``tape.backward(loss=...)``, and read ``flat.grad``. Sims
preferring the imperative idiom use the :attr:`tape` escape hatch.

``# mypy: ignore-errors`` per F-RB-3 (Warp ships partial type stubs).
"""

from __future__ import annotations

import abc
import math
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np
import warp as wp

from ._kernels import accumulate_l2 as _accumulate_l2
from .finite_diff import finite_difference_gradient, make_optimizer
from .param_spec import ParamSpec
from .tape import new_tape

wp.init()

#: Absolute floor on the per-parameter relative-error denominator in
#: ``check_gradient`` — below this magnitude a gradient is treated as
#: effectively zero (relative error against ~0 is otherwise ill-conditioned).
_GRAD_CHECK_ABS_FLOOR = 1e-6


@dataclass
class History:
    """Inverse-problem optimization history (plan § 4.2.A).

    Distinct from § 4.2.C ``TrainingHistory`` (3DGS scene-fit) — different
    consumers, deliberately separate classes.
    """

    losses: list[float]
    params_trajectory: list[Any]  # entries are ParamSpec.unpack(flat) per iter
    iter_count: int
    converged: bool
    final_loss: float


@dataclass
class GradientCheckReport:
    """Result of cross-checking autodiff gradients against finite differences."""

    per_param_relative_error: dict[str, float]
    per_param_absolute_error: dict[str, float]
    max_relative_error: float
    passed: bool
    tolerance: float


class InverseProblem(abc.ABC):
    """Abstract base for differentiable-sim inverse problems (Warp backend).

    Escape hatch: subclasses can access a fresh ``wp.Tape`` via :attr:`tape` and
    use it imperatively if the OO pattern is awkward.
    """

    def __init__(
        self,
        *,
        optimizer: str = "adam",  # "adam" | "sgd" | "lbfgs"
        lr: float = 1e-2,
        max_iter: int = 1000,
        tol: float = 1e-6,
    ) -> None:
        self.optimizer = optimizer
        self.lr = lr
        self.max_iter = max_iter
        self.tol = tol
        #: Problem state (initial condition / fixed inputs); subclasses set it.
        self.state: Any = None
        self._loss_array: Any = None
        self._target_array: Any = None

    # -- escape hatch --------------------------------------------------------

    @property
    def tape(self) -> Callable[..., Any]:
        """``wp.Tape`` factory escape hatch — ``tape = self.tape(); with tape: ...``."""
        return new_tape

    # -- subclass contract ---------------------------------------------------

    @abc.abstractmethod
    def forward(self, params: Any, state: Any) -> Any:
        """Run the sim with ``params`` (the ``ParamSpec.flat`` array) and ``state``;
        return the predicted final state as a ``requires_grad`` array."""

    @abc.abstractmethod
    def params_spec(self) -> ParamSpec:
        """Return the :class:`ParamSpec` describing this problem's parameters."""

    def loss(self, predicted: Any, target: Any) -> Any:
        """Default L2 loss accumulated into the internal loss array. Overridable."""
        wp.launch(
            _accumulate_l2,
            dim=int(predicted.shape[0]),
            inputs=[predicted, target, self._loss_array],
            device=self._loss_array.device,
        )
        return self._loss_array

    # -- target wiring -------------------------------------------------------

    def set_target(self, target: Any, *, device: str = "cpu") -> None:
        """Store the optimization target as a ``wp.array`` (built once)."""
        if isinstance(target, np.ndarray):
            self._target_array = wp.array(
                np.asarray(target, dtype=np.float64), dtype=wp.float64, device=device
            )
        else:
            self._target_array = target

    def _ensure_loss_array(self, device: Any) -> None:
        if self._loss_array is None:
            self._loss_array = wp.zeros(1, dtype=wp.float64, requires_grad=True, device=device)

    # -- optimization --------------------------------------------------------

    def _loss_and_grad(self, spec: ParamSpec, x: np.ndarray) -> tuple[float, np.ndarray]:
        flat = spec.flat
        self._ensure_loss_array(flat.device)
        flat.assign(np.asarray(x, dtype=np.float64).reshape(flat.shape))
        self._loss_array.zero_()
        tape = wp.Tape()
        with tape:
            predicted = self.forward(flat, self.state)
            self.loss(predicted, self._target_array)
        tape.backward(loss=self._loss_array)
        grad = flat.grad.numpy().astype(np.float64).ravel().copy()
        loss_val = float(self._loss_array.numpy()[0])
        # Zero AFTER backward: wp.Tape.zero() only knows the gradient arrays
        # registered during backward(), so this clears flat.grad / predicted.grad
        # / loss.grad for the next iteration. Calling it before backward (on a
        # fresh tape) is a no-op and lets gradients accumulate across iterations.
        tape.zero()
        return loss_val, grad

    def _loss_only(self, spec: ParamSpec, x: np.ndarray) -> float:
        flat = spec.flat
        self._ensure_loss_array(flat.device)
        flat.assign(np.asarray(x, dtype=np.float64).reshape(flat.shape))
        self._loss_array.zero_()
        predicted = self.forward(flat, self.state)
        self.loss(predicted, self._target_array)
        return float(self._loss_array.numpy()[0])

    def fit(
        self,
        *,
        params_init: Any,
        target: Any,
        callbacks: list[Callable[..., None]] | None = None,
    ) -> History:
        """Optimization loop. Returns :class:`History`.

        ``params_init`` is structured per the subclass's :class:`ParamSpec`;
        ``fit`` packs it into the flat tensor the optimizer operates on and
        unpacks before recording trajectory entries.
        """
        callbacks = callbacks or []
        spec = self.params_spec()
        self.set_target(target, device=str(spec.flat.device))
        spec.pack(params_init)
        x = spec.flat.numpy().astype(np.float64).ravel()
        opt = make_optimizer(self.optimizer, self.lr, x.shape)

        losses: list[float] = []
        trajectory: list[Any] = []
        converged = False
        for _ in range(self.max_iter):
            loss_val, grad = self._loss_and_grad(spec, x)
            losses.append(loss_val)
            spec.flat.assign(x.reshape(spec.flat.shape))
            trajectory.append(spec.unpack(spec.flat))
            for cb in callbacks:
                cb(len(losses) - 1, loss_val, spec.unpack(spec.flat))
            if loss_val < self.tol:
                converged = True
                break
            x = opt.step(x, grad.ravel())

        final_loss = losses[-1] if losses else math.inf
        return History(
            losses=losses,
            params_trajectory=trajectory,
            iter_count=len(losses),
            converged=converged,
            final_loss=final_loss,
        )

    def check_gradient(
        self,
        *,
        params: Any,
        n_samples: int = 10,
        eps: float = 1e-4,
        rel_tol: float = 1e-5,
    ) -> GradientCheckReport:
        """Cross-check the autodiff gradient against finite differences.

        Requires a configured target (set a prior ``fit`` or call
        :meth:`set_target`).
        """
        if self._target_array is None:
            raise RuntimeError(
                "check_gradient requires a target; call set_target(...) or fit(...) first"
            )
        spec = self.params_spec()
        spec.pack(params)
        x0 = spec.flat.numpy().astype(np.float64).ravel()

        _, g_ad = self._loss_and_grad(spec, x0)
        g_fd = finite_difference_gradient(lambda xv: self._loss_only(spec, xv), x0, eps=eps)

        rel_err: dict[str, float] = {}
        abs_err: dict[str, float] = {}
        max_rel = 0.0
        for name, meta in spec.structure.items():
            idx = meta["index"]
            sl = idx if isinstance(idx, slice) else slice(idx, idx + 1)
            a = g_ad[sl]
            f = g_fd[sl]
            abs_e = float(np.max(np.abs(a - f))) if a.size else 0.0
            denom = float(np.max(np.abs(f))) if a.size else 0.0
            # Floor the denominator: for a structurally near-zero gradient both
            # AD and FD are tiny and a bare abs/denom ratio is ill-conditioned.
            rel_e = abs_e / max(denom, _GRAD_CHECK_ABS_FLOOR)
            abs_err[name] = abs_e
            rel_err[name] = rel_e
            max_rel = max(max_rel, rel_e)

        return GradientCheckReport(
            per_param_relative_error=rel_err,
            per_param_absolute_error=abs_err,
            max_relative_error=max_rel,
            passed=max_rel <= rel_tol,
            tolerance=rel_tol,
        )


class ParameterIDProblem(InverseProblem):
    """Recover unknown sim parameters from observations of final state."""


class InitialStateRecoveryProblem(InverseProblem):
    """Recover unknown initial conditions from final state."""


class ControlProblem(InverseProblem):
    """Find control inputs that drive the sim to a target trajectory."""
