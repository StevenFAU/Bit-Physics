"""Finite-difference gradient cross-check + the flat-vector optimizers (plan § 4.2.A).

Backend-agnostic numerical helpers operating on plain NumPy vectors:

- :func:`finite_difference_gradient` — central-difference gradient of a scalar
  objective, used by :meth:`InverseProblem.check_gradient` to validate the
  backend autodiff (Taichi ``ti.ad.Tape`` / Warp ``wp.Tape``) gradient.
- :func:`make_optimizer` — Adam / SGD / L-BFGS first-order optimizers; all
  consume a flat gradient vector and return the updated flat parameters.

These stay on the NumPy side deliberately: the backend tape produces the
gradient, the optimizer state-update is pure arithmetic, so a single tested
implementation serves both backends without coupling Taichi into Stack-E.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]


def finite_difference_gradient(
    objective: Callable[[FloatArray], float],
    x: FloatArray,
    *,
    eps: float = 1e-4,
) -> FloatArray:
    """Central-difference gradient of ``objective`` at ``x``.

    ``objective`` maps a flat NumPy vector to a scalar loss. The central
    difference ``(f(x + eps e_i) - f(x - eps e_i)) / (2 eps)`` is O(eps²)
    accurate and avoids the one-sided-bias that trips strict ``rel_tol``
    cross-checks.
    """
    x = np.asarray(x, dtype=np.float64)
    grad = np.zeros_like(x)
    for i in range(x.size):
        xp = x.copy()
        xm = x.copy()
        xp[i] += eps
        xm[i] -= eps
        grad[i] = (objective(xp) - objective(xm)) / (2.0 * eps)
    return grad


class _Optimizer:
    """First-order optimizer over a flat NumPy parameter vector."""

    def step(self, x: FloatArray, grad: FloatArray) -> FloatArray:  # pragma: no cover
        raise NotImplementedError


class _SGD(_Optimizer):
    def __init__(self, lr: float) -> None:
        self.lr = lr

    def step(self, x: FloatArray, grad: FloatArray) -> FloatArray:
        return x - self.lr * grad


class _Adam(_Optimizer):
    """Adam (Kingma & Ba 2015) with the canonical bias-corrected moments."""

    def __init__(
        self,
        lr: float,
        *,
        beta1: float = 0.9,
        beta2: float = 0.999,
        epsilon: float = 1e-8,
    ) -> None:
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
        self.m: FloatArray | None = None
        self.v: FloatArray | None = None
        self.t = 0

    def step(self, x: FloatArray, grad: FloatArray) -> FloatArray:
        if self.m is None:
            self.m = np.zeros_like(x)
            self.v = np.zeros_like(x)
        assert self.v is not None
        self.t += 1
        self.m = self.beta1 * self.m + (1.0 - self.beta1) * grad
        self.v = self.beta2 * self.v + (1.0 - self.beta2) * (grad * grad)
        m_hat = self.m / (1.0 - self.beta1**self.t)
        v_hat = self.v / (1.0 - self.beta2**self.t)
        return x - self.lr * m_hat / (np.sqrt(v_hat) + self.epsilon)


class _LBFGS(_Optimizer):
    """Compact limited-memory BFGS (Nocedal 1980 two-loop recursion).

    Keeps the last ``history`` (s, y) pairs and applies the implicit inverse
    Hessian via the two-loop recursion, falling back to scaled steepest
    descent on the first step or when the curvature condition ``sᵀy > 0``
    is violated. A unit step is taken (no line search) — adequate for the
    smooth small-dimensional inverse problems this infrastructure targets;
    sims needing a line search use the ``.tape`` escape hatch.
    """

    def __init__(self, lr: float, *, history: int = 10) -> None:
        self.lr = lr
        self.history = history
        self._s: list[FloatArray] = []
        self._y: list[FloatArray] = []
        self._x_prev: FloatArray | None = None
        self._g_prev: FloatArray | None = None

    def step(self, x: FloatArray, grad: FloatArray) -> FloatArray:
        if self._x_prev is not None and self._g_prev is not None:
            s = x - self._x_prev
            y = grad - self._g_prev
            if float(s @ y) > 1e-12:
                self._s.append(s)
                self._y.append(y)
                if len(self._s) > self.history:
                    self._s.pop(0)
                    self._y.pop(0)

        q = grad.copy()
        alphas: list[float] = []
        rhos: list[float] = []
        for s, y in zip(reversed(self._s), reversed(self._y), strict=True):
            rho = 1.0 / float(y @ s)
            alpha = rho * float(s @ q)
            q = q - alpha * y
            alphas.append(alpha)
            rhos.append(rho)

        if self._s:
            s_last = self._s[-1]
            y_last = self._y[-1]
            gamma = float(s_last @ y_last) / float(y_last @ y_last)
            r = gamma * q
        else:
            r = self.lr * q

        for s, y, alpha, rho in zip(
            self._s, self._y, reversed(alphas), reversed(rhos), strict=True
        ):
            beta = rho * float(y @ r)
            r = r + s * (alpha - beta)

        self._x_prev = x.copy()
        self._g_prev = grad.copy()
        return x - r


def make_optimizer(name: str, lr: float, _shape: tuple[int, ...]) -> _Optimizer:
    """Construct one of the supported optimizers (``"adam" | "sgd" | "lbfgs"``)."""
    key = name.lower()
    if key == "adam":
        return _Adam(lr)
    if key == "sgd":
        return _SGD(lr)
    if key == "lbfgs":
        return _LBFGS(lr)
    raise ValueError(f"unknown optimizer {name!r}; expected one of adam | sgd | lbfgs")
