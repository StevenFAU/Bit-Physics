"""Differentiable Lenia inverse problems + capture (Stack D / Taichi).

Two ``InverseProblem`` subclasses on the WU-A substrate (``common_py.autodiff``):

* :class:`LeniaGrowthID` — recover the growth parameters ``(mu, sigma)`` from an observed
  target field (the D-PARAM primary; the A1 growth-parameter analytic + A2 FD anchors).
* :class:`LeniaInitialFieldID` — recover the initial field ``A₀`` from an observed final
  field (the A3 convolution-Jacobian anchor; independent of A1 in physical term, parameter
  class, and method).

The canonical capture is the inverse-problem solution (recovered field + the optimization
trajectory) with the ``gradient_fields`` key populated (schema 1.1.0).
"""

from dataclasses import dataclass, replace
from typing import Any

import numpy as np
import taichi as ti
from common_py.autodiff import InitialStateRecoveryProblem, ParameterIDProblem, ParamSpec

from ._kernels import lenia_load_initial, lenia_loss_l2
from .forward import LeniaDiffConfig, quad4_kernel_window

__all__ = [
    "InverseSolution",
    "LeniaGrowthID",
    "LeniaInitialFieldID",
    "smooth_initial_condition",
    "solve_growth_id",
]


# --------------------------------------------------------------------------- #
# Initial conditions
# --------------------------------------------------------------------------- #
def smooth_initial_condition(grid: int, mu: float = 0.30, *, seed: int = 42) -> np.ndarray:
    """A smooth (well-conditioned-gradient) Lenia IC centred near ``mu``.

    A centred Gaussian bump on a background near ``mu`` with a small smooth ripple —
    everywhere smooth (no clipped noise) so the convolved field stays in the Quad4
    growth's smooth interior (``base>0``) and the clip-Euler update stays interior.
    """
    ii, jj = np.meshgrid(np.arange(grid), np.arange(grid), indexing="ij")
    c = (grid - 1) / 2.0
    r2 = ((ii - c) ** 2 + (jj - c) ** 2) / (2.0 * (grid / 5.0) ** 2)
    bump = np.exp(-r2)
    field = (mu + 0.04 * (bump - 0.5)).astype(np.float64)
    return field


# --------------------------------------------------------------------------- #
# Inverse problems
# --------------------------------------------------------------------------- #
class LeniaGrowthID(ParameterIDProblem):  # type: ignore[misc]
    """Recover the growth parameters ``(mu, sigma)`` from an observed final field.

    The forward map is the tape-differentiable Quad4-Lenia step (real-space Quad4
    convolution + Quad4 polynomial growth + clip-Euler) reading ``mu``/``sigma`` from the
    2-element ``needs_grad`` parameter field. Regime: smooth interior (``base>0``).
    """

    def __init__(self, cfg: LeniaDiffConfig, a0: np.ndarray, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        n, steps, R = cfg.grid, cfg.steps, cfg.R
        self.field = ti.field(ti.f64, shape=(steps + 1, n, n), needs_grad=True)
        self.conv = ti.field(ti.f64, shape=(steps, n, n), needs_grad=True)
        self._kwin = ti.field(ti.f64, shape=(2 * R + 1, 2 * R + 1))
        self._a0 = ti.field(ti.f64, shape=(n, n))
        self._flat = ti.field(ti.f64, shape=2, needs_grad=True)
        self._kwin.from_numpy(quad4_kernel_window(R))
        self.set_initial(a0)
        self.state = (a0,)

    def set_initial(self, a0: np.ndarray) -> None:
        """Load the (constant) IC into the time-0 slice (outside any tape)."""
        self._a0.from_numpy(np.ascontiguousarray(a0, dtype=np.float64))
        lenia_load_initial(self.field, self._a0, self.cfg.grid)

    def params_spec(self) -> ParamSpec:
        def pack(d: dict[str, float]) -> Any:
            self._flat[0] = float(d["mu"])
            self._flat[1] = float(d["sigma"])
            return self._flat

        def unpack(flat: Any) -> dict[str, float]:
            return {"mu": float(flat[0]), "sigma": float(flat[1])}

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={"mu": {"index": 0, "shape": ()}, "sigma": {"index": 1, "shape": ()}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        raise NotImplementedError("Stage 1b: tape-differentiable Quad4-Lenia growth forward")

    def loss(self, predicted: Any, target: Any) -> Any:
        lenia_loss_l2(self.field, target, self.loss_field, self.cfg.steps, self.cfg.grid)
        return self.loss_field

    def final_field(self, mu: float, sigma: float) -> np.ndarray:
        """Run the forward at ``(mu,sigma)`` and return the final field (no tape)."""
        spec = self.params_spec()
        spec.pack({"mu": mu, "sigma": sigma})
        self.forward(spec.flat, self.state)
        out: np.ndarray = self.field.to_numpy()[self.cfg.steps]
        return out


class LeniaInitialFieldID(InitialStateRecoveryProblem):  # type: ignore[misc]
    """Recover the initial field ``A₀`` from an observed final field.

    The parameters ARE the flattened initial field (``needs_grad``); ``mu``/``sigma`` are fixed
    at ``cfg``. The gradient ``∂Loss/∂A₀`` flows through the convolution Jacobian (the
    kernel) — the A3 anchor, independent of :class:`LeniaGrowthID` in physical term
    (spatial coupling), parameter class (the field), and method (convolution adjoint).
    """

    def __init__(self, cfg: LeniaDiffConfig, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        n, steps, R = cfg.grid, cfg.steps, cfg.R
        self.field = ti.field(ti.f64, shape=(steps + 1, n, n), needs_grad=True)
        self.conv = ti.field(ti.f64, shape=(steps, n, n), needs_grad=True)
        self._kwin = ti.field(ti.f64, shape=(2 * R + 1, 2 * R + 1))
        self._mu = ti.field(ti.f64, shape=1, needs_grad=True)
        self._sigma = ti.field(ti.f64, shape=1, needs_grad=True)
        self._flat = ti.field(ti.f64, shape=n * n, needs_grad=True)
        self._kwin.from_numpy(quad4_kernel_window(R))
        self._mu[0] = cfg.mu
        self._sigma[0] = cfg.sigma
        self.state = None

    def params_spec(self) -> ParamSpec:
        n = self.cfg.grid

        def pack(a0: np.ndarray) -> Any:
            self._flat.from_numpy(np.ascontiguousarray(a0, dtype=np.float64).ravel())
            return self._flat

        def unpack(flat: Any) -> np.ndarray:
            return np.asarray(flat.to_numpy(), dtype=np.float64).reshape(n, n)

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={"A0": {"index": slice(0, n * n), "shape": (n, n)}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        raise NotImplementedError("Stage 1b: tape-differentiable Quad4-Lenia field forward")

    def loss(self, predicted: Any, target: Any) -> Any:
        lenia_loss_l2(self.field, target, self.loss_field, self.cfg.steps, self.cfg.grid)
        return self.loss_field

    def grad_wrt_field(self, a0: np.ndarray, target: np.ndarray) -> np.ndarray:
        """Autodiff ``∂Loss/∂A₀`` (nxn) at ``a0`` against ``target``."""
        self.set_target(target)
        spec = self.params_spec()
        _, grad = self._loss_and_grad(spec, np.ascontiguousarray(a0, dtype=np.float64).ravel())
        return np.asarray(grad, dtype=np.float64).reshape(self.cfg.grid, self.cfg.grid)


# --------------------------------------------------------------------------- #
# Inverse-solution capture
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-parameter recovery (the canonical capture payload)."""

    recovered_mu: float
    recovered_sigma: float
    planted_mu: float
    planted_sigma: float
    loss_trajectory: list[float]
    mu_trajectory: list[float]
    sigma_trajectory: list[float]
    final_field: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_growth_id(
    cfg: LeniaDiffConfig,
    *,
    planted: tuple[float, float],
    init: tuple[float, float],
    seed: int = 42,
    optimizer: str = "adam",
    lr: float = 5e-3,
    max_iter: int = 600,
    tol: float = 1e-14,
) -> InverseSolution:
    """Plant ``(mu,sigma)``, synthesize a target, then recover by optimization."""
    raise NotImplementedError("Stage 1b: growth-parameter inverse recovery")
    _ = (cfg, planted, init, seed, optimizer, lr, max_iter, tol, replace)  # pragma: no cover
