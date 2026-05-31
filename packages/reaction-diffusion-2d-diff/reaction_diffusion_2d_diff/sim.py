"""Differentiable reaction-diffusion-2d inverse problems + capture (Stack D / Taichi).

Two ``InverseProblem`` subclasses on the WU-A substrate
(``common_py.autodiff``):

* :class:`RD2DDiffusionID` — recover ``D_u`` from an observed final ``u`` field
  (the D-PARAM primary; cleanest analytic-gradient case). ``cfg.reaction=False``
  gives the pure-diffusion regime used by the A1 eigenmode analytic anchor; the
  full Gray-Scott regime is the A2 finite-difference anchor.
* :class:`WellMixedFID` — recover the feed rate ``F`` in the spatially-uniform
  (well-mixed) limit; the A3 reaction-ODE analytic anchor (independent of A1 in
  physical term, parameter, and method).

The canonical capture is the inverse-problem solution (recovered field + the
optimization trajectory) with the ``gradient_fields`` capture key populated
(schema 1.1.0 — the first real consumer).
"""

from dataclasses import dataclass, replace
from typing import Any

import numpy as np
import taichi as ti
from common_py.autodiff import ParameterIDProblem, ParamSpec

from ._kernels import (  # noqa: F401  (gray_scott_step/well_mixed_step wired at Stage 1b)
    gray_scott_step,
    load_initial,
    loss_l2_final_u,
    well_mixed_step,
)
from .forward import RD2DDiffConfig

__all__ = [
    "InverseSolution",
    "RD2DDiffusionID",
    "WellMixedFID",
    "smooth_initial_condition",
    "solve_diffusion_id",
    "uniform_initial_condition",
]


# --------------------------------------------------------------------------- #
# Initial conditions
# --------------------------------------------------------------------------- #
def smooth_initial_condition(n: int, *, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """A smooth (well-conditioned-gradient) Gray-Scott initial condition.

    ``u`` is a unit background with a centred Gaussian dip; ``v`` a centred Gaussian
    bump — both smooth (no clipped noise) so the gradient is well-conditioned.
    """
    ii, jj = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    c = (n - 1) / 2.0
    r2 = ((ii - c) ** 2 + (jj - c) ** 2) / (2.0 * (n / 6.0) ** 2)
    bump = np.exp(-r2)
    u0 = (1.0 - 0.5 * bump).astype(np.float64)
    v0 = (0.25 * bump).astype(np.float64)
    return u0, v0


def uniform_initial_condition(n: int, u_val: float, v_val: float) -> tuple[np.ndarray, np.ndarray]:
    """A spatially-uniform IC (the well-mixed limit; Laplacian ≡ 0)."""
    u0 = np.full((n, n), u_val, dtype=np.float64)
    v0 = np.full((n, n), v_val, dtype=np.float64)
    return u0, v0


# --------------------------------------------------------------------------- #
# Inverse problems
# --------------------------------------------------------------------------- #
class RD2DDiffusionID(ParameterIDProblem):  # type: ignore[misc]
    """Recover ``D_u`` from an observed final ``u`` field.

    The forward map is the tape-differentiable Gray-Scott step
    (:func:`forward.gray_scott_step`) reading ``D_u`` from the ``needs_grad`` flat
    parameter field. ``cfg.reaction`` toggles the reaction terms (False → the A1
    pure-diffusion eigenmode regime).
    """

    def __init__(self, cfg: RD2DDiffConfig, u0: np.ndarray, v0: np.ndarray, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        n, steps = cfg.n, cfg.steps
        self.u = ti.field(ti.f64, shape=(steps + 1, n, n), needs_grad=True)
        self.v = ti.field(ti.f64, shape=(steps + 1, n, n), needs_grad=True)
        self._u0 = ti.field(ti.f64, shape=(n, n))
        self._v0 = ti.field(ti.f64, shape=(n, n))
        self._flat = ti.field(ti.f64, shape=1, needs_grad=True)
        self._inv_dx2 = 1.0 / (cfg.dx * cfg.dx)
        self.set_initial(u0, v0)
        self.state = (u0, v0)

    def set_initial(self, u0: np.ndarray, v0: np.ndarray) -> None:
        """Load the (constant) IC into the time-0 slice (outside any tape)."""
        self._u0.from_numpy(np.ascontiguousarray(u0, dtype=np.float64))
        self._v0.from_numpy(np.ascontiguousarray(v0, dtype=np.float64))
        load_initial(self.u, self.v, self._u0, self._v0, self.cfg.n)

    def params_spec(self) -> ParamSpec:
        def pack(d: dict[str, float]) -> Any:
            self._flat[0] = float(d["Du"])
            return self._flat

        def unpack(flat: Any) -> dict[str, float]:
            return {"Du": float(flat[0])}

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={"Du": {"index": 0, "shape": ()}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        raise NotImplementedError("Stage 1b: tape-differentiable Gray-Scott forward")

    def loss(self, predicted: Any, target: Any) -> Any:
        loss_l2_final_u(self.u, target, self.loss_field, self.cfg.steps, self.cfg.n)
        return self.loss_field

    def final_u(self, du: float) -> np.ndarray:
        """Run the forward at ``D_u = du`` and return the final ``u`` field (no tape)."""
        spec = self.params_spec()
        spec.pack({"Du": du})
        self.forward(spec.flat, self.state)
        final: np.ndarray = self.u.to_numpy()[self.cfg.steps]
        return final


class WellMixedFID(ParameterIDProblem):  # type: ignore[misc]
    """Recover the feed rate ``F`` in the spatially-uniform (well-mixed) limit.

    Diffusion is identically zero (uniform field), so this isolates the reaction
    gradient ``∂Loss/∂F`` — the A3 anchor, independent of A1/A2 in physical term,
    parameter, and derivation method.
    """

    def __init__(self, cfg: RD2DDiffConfig, u0: np.ndarray, v0: np.ndarray, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        n, steps = cfg.n, cfg.steps
        self.u = ti.field(ti.f64, shape=(steps + 1, n, n), needs_grad=True)
        self.v = ti.field(ti.f64, shape=(steps + 1, n, n), needs_grad=True)
        self._u0 = ti.field(ti.f64, shape=(n, n))
        self._v0 = ti.field(ti.f64, shape=(n, n))
        self._flat = ti.field(ti.f64, shape=1, needs_grad=True)
        self.set_initial(u0, v0)
        self.state = (u0, v0)

    def set_initial(self, u0: np.ndarray, v0: np.ndarray) -> None:
        self._u0.from_numpy(np.ascontiguousarray(u0, dtype=np.float64))
        self._v0.from_numpy(np.ascontiguousarray(v0, dtype=np.float64))
        load_initial(self.u, self.v, self._u0, self._v0, self.cfg.n)

    def params_spec(self) -> ParamSpec:
        def pack(d: dict[str, float]) -> Any:
            self._flat[0] = float(d["F"])
            return self._flat

        def unpack(flat: Any) -> dict[str, float]:
            return {"F": float(flat[0])}

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={"F": {"index": 0, "shape": ()}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        raise NotImplementedError("Stage 1b: tape-differentiable well-mixed forward")

    def loss(self, predicted: Any, target: Any) -> Any:
        loss_l2_final_u(self.u, target, self.loss_field, self.cfg.steps, self.cfg.n)
        return self.loss_field


# --------------------------------------------------------------------------- #
# Inverse-solution capture
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-parameter recovery (the canonical capture payload)."""

    recovered: float
    planted: float
    loss_trajectory: list[float]
    param_trajectory: list[float]
    final_u: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_diffusion_id(
    cfg: RD2DDiffConfig,
    *,
    planted_du: float,
    init_du: float,
    seed: int = 42,
    optimizer: str = "adam",
    lr: float = 5e-3,
    max_iter: int = 400,
    tol: float = 1e-12,
) -> InverseSolution:
    """Plant ``D_u``, synthesize a target, then recover it by optimization.

    Returns the recovered value, the optimization trajectory, the final field, and
    the autodiff ``gradient_fields`` (``∂Loss/∂D_u`` at the recovered point) for the
    schema-1.1.0 capture.
    """
    u0, v0 = smooth_initial_condition(cfg.n, seed=seed)
    truth = RD2DDiffusionID(replace(cfg, Du=planted_du), u0, v0)
    target = truth.final_u(planted_du)

    prob = RD2DDiffusionID(cfg, u0, v0, optimizer=optimizer, lr=lr, max_iter=max_iter, tol=tol)
    history = prob.fit(params_init={"Du": init_du}, target=target)

    spec = prob.params_spec()
    _, grad = prob._loss_and_grad(spec, np.array([history.params_trajectory[-1]["Du"]]))
    return InverseSolution(
        recovered=float(history.params_trajectory[-1]["Du"]),
        planted=float(planted_du),
        loss_trajectory=list(history.losses),
        param_trajectory=[float(p["Du"]) for p in history.params_trajectory],
        final_u=prob.u.to_numpy()[cfg.steps],
        grad_fields={"dLoss_dDu": np.asarray(grad, dtype=np.float64)},
    )
