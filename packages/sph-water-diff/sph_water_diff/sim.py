"""Differentiable SPH inverse problems + capture helpers (Stack D / Taichi).

Two problems over the landed parent's canonical physics (explicit-Euler gravity free-fall +
cubic-spline SPH density; ``packages/sph-water-stack-d``, R-S3/S6):

* :class:`SphInitialVelocityControl` (a :class:`~common_py.autodiff.ControlProblem`) - the
  plan's "control problem": find the shared initial vertical velocity ``v0z`` that drives
  the cloud to observed final positions (DiffTaichi throw-to-target shape; Hu et al., ICLR
  2020, arXiv:1910.00935; CITE-DON'T-IMPORT).
* :class:`SphKernelWidthID` (a :class:`~common_py.autodiff.ParameterIDProblem`) - recover
  the smoothing length ``h`` from observed densities of a static configuration: the
  SPH-specific differentiable surface (gradient through the cubic-spline kernel), the
  regime-scoped answer to batch-1's EXP-C hold.

**Identifiability:** ``v0z -> final_positions`` is EXACTLY linear (free-fall; see
``forward.freefall_dloss_dv0z``) and injective => the recovery converges to the planted
value with no spurious basin. ``h -> rho`` is smooth and strictly monotone near the fixture
(``d(rho)/dh < 0`` - the self-term ``h^-3`` dominates) => locally injective; the recovery is
seeded inside the monotone neighborhood.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
import taichi as ti
from common_py.autodiff import ControlProblem, ParameterIDProblem, ParamSpec
from common_py.autodiff.finite_diff import make_optimizer

from ._kernels import first_density, make_sph_kernels
from .forward import SphDiffConfig, cloud_initial_positions

__all__ = [
    "InverseSolution",
    "SphInitialVelocityControl",
    "SphKernelWidthID",
    "autodiff_drho_dh_pair",
    "solve_recovery",
]

DIM = 3


class SphInitialVelocityControl(ControlProblem):  # type: ignore[misc]
    """Recover the shared initial vertical velocity ``v0z`` from final particle positions.

    The 1-element ``needs_grad`` parameter field is loaded into ``v[0,p].z`` for every
    particle (inside the tape) so ``ti.ad.Tape`` backprops ``dLoss/dv0z``. The forward is
    the parent's semi-implicit-Euler free-fall with time-indexed ``needs_grad`` fields; the
    loss is the L2 final-position mismatch. Regime: fixed-topology interior cloud."""

    def __init__(self, cfg: SphDiffConfig, x0: np.ndarray, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        P, S = cfg.n_particles, cfg.steps
        self.x = ti.Vector.field(DIM, ti.f64, shape=(S + 1, P), needs_grad=True)
        self.v = ti.Vector.field(DIM, ti.f64, shape=(S + 1, P), needs_grad=True)
        self._v0z = ti.field(ti.f64, shape=1, needs_grad=True)
        self._ker = make_sph_kernels(n_particles=P, steps=S, dt=cfg.dt, g_z=cfg.g_z, mass=cfg.mass)
        self.set_initial(x0)
        self.state = (x0,)

    def set_initial(self, x0: np.ndarray) -> None:
        """Load the (constant) particle IC x[0]=x0 (outside any tape)."""
        x0 = np.ascontiguousarray(x0, dtype=np.float64)
        self.x.fill(0.0)
        self.v.fill(0.0)
        for p in range(self.cfg.n_particles):
            self.x[0, p] = ti.Vector([float(x0[p, 0]), float(x0[p, 1]), float(x0[p, 2])])
        self._x0 = x0

    def params_spec(self) -> ParamSpec:
        def pack(d: Any) -> Any:
            val = d["v0z"] if isinstance(d, dict) else d
            self._v0z.from_numpy(np.asarray([val], dtype=np.float64).ravel())
            return self._v0z

        def unpack(flat: Any) -> dict[str, float]:
            return {"v0z": float(flat.to_numpy()[0])}

        return ParamSpec(
            flat=self._v0z,
            pack=pack,
            unpack=unpack,
            structure={"v0z": {"index": 0, "shape": ()}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        """Run the tape-differentiable free-fall rollout; return the position field ``x``.

        ``params`` is the ``(1,)`` ``needs_grad`` ``v0z`` field, loaded into ``v[0]`` inside
        the tape so the gradient flows back; x[0] is the constant set in
        :meth:`set_initial`."""
        raise NotImplementedError("C-1 U-1 scaffold (RED): forward implemented at the GREEN commit")

    def loss(self, predicted: Any, target: Any) -> Any:
        self._ker["comp_loss_pos"](self.x, target, self.loss_field)
        return self.loss_field

    def final_positions(self, v0z: float) -> np.ndarray:
        """Run the forward at ``v0z`` (no tape); return final particle positions ``(P,3)``."""
        self.set_initial(self._x0)
        self._v0z.from_numpy(np.asarray([v0z], dtype=np.float64))
        self.forward(self._v0z, self.state)
        return np.asarray(self.x.to_numpy()[self.cfg.steps], dtype=np.float64)

    def grad_wrt_v0z(self, v0z: float, target: np.ndarray) -> float:
        """Autodiff ``dLoss/dv0z`` at ``v0z`` against ``target`` final positions."""
        self.set_initial(self._x0)
        self.set_target(target)
        _, grad = self._loss_and_grad(self.params_spec(), np.asarray([v0z], dtype=np.float64))
        return float(np.asarray(grad, dtype=np.float64).ravel()[0])


class SphKernelWidthID(ParameterIDProblem):  # type: ignore[misc]
    """Recover the smoothing length ``h`` from observed SPH densities (static config).

    The forward computes the cubic-spline density of the fixed particle configuration with
    ``h`` as the 1-element ``needs_grad`` parameter; the loss is the L2 density mismatch.
    Regime: fixture pair distances away from the q=1 / q=2 spline knots."""

    def __init__(self, cfg: SphDiffConfig, x0: np.ndarray, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        P = cfg.n_particles
        x0 = np.ascontiguousarray(x0, dtype=np.float64)
        self.xs = ti.Vector.field(DIM, ti.f64, shape=P)
        self.xs.from_numpy(x0)
        self.rho = ti.field(ti.f64, shape=P, needs_grad=True)
        self._h = ti.field(ti.f64, shape=1, needs_grad=True)
        self._ker = make_sph_kernels(
            n_particles=P, steps=cfg.steps, dt=cfg.dt, g_z=cfg.g_z, mass=cfg.mass
        )
        self._x0 = x0
        self.state = (x0,)

    def params_spec(self) -> ParamSpec:
        def pack(d: Any) -> Any:
            val = d["h"] if isinstance(d, dict) else d
            self._h.from_numpy(np.asarray([val], dtype=np.float64).ravel())
            return self._h

        def unpack(flat: Any) -> dict[str, float]:
            return {"h": float(flat.to_numpy()[0])}

        return ParamSpec(
            flat=self._h,
            pack=pack,
            unpack=unpack,
            structure={"h": {"index": 0, "shape": ()}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        """Compute the density field at ``h`` (tape-differentiable); return ``rho``."""
        raise NotImplementedError("C-1 U-1 scaffold (RED): forward implemented at the GREEN commit")

    def loss(self, predicted: Any, target: Any) -> Any:
        self._ker["comp_loss_rho"](self.rho, target, self.loss_field)
        return self.loss_field

    def densities(self, h: float) -> np.ndarray:
        """Run the forward at ``h`` (no tape); return the per-particle densities ``(P,)``."""
        self._h.from_numpy(np.asarray([h], dtype=np.float64))
        self.forward(self._h, self.state)
        return np.asarray(self.rho.to_numpy(), dtype=np.float64)

    def grad_wrt_h(self, h: float, target: np.ndarray) -> float:
        """Autodiff ``dLoss/dh`` at ``h`` against ``target`` densities."""
        self.set_target(target)
        _, grad = self._loss_and_grad(self.params_spec(), np.asarray([h], dtype=np.float64))
        return float(np.asarray(grad, dtype=np.float64).ravel()[0])


def autodiff_drho_dh_pair(r: float, h: float, mass: float) -> float:
    """Autodiff ``d(rho_0)/dh`` for an isolated two-particle pair at distance ``r`` (A3).

    Standalone tape over the same cubic-spline arithmetic as the density kernel; verified
    against the closed form ``forward.analytic_drho_dh_pair``."""
    cfg = SphDiffConfig(n_particles=2, mass=float(mass))
    x0 = np.array([[0.5, 0.5, 0.5], [0.5, 0.5, 0.5 + float(r)]], dtype=np.float64)
    prob = SphKernelWidthID(cfg, x0)
    rho_out = ti.field(ti.f64, shape=(), needs_grad=True)

    prob._h.from_numpy(np.asarray([h], dtype=np.float64))
    with prob.tape(loss=rho_out):
        prob.forward(prob._h, prob.state)
        first_density(prob.rho, rho_out)
    return float(prob._h.grad.to_numpy()[0])


# --------------------------------------------------------------------------- #
# Inverse-solution capture payload
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-``v0z`` recovery (the canonical capture payload)."""

    recovered_v0z: float
    planted_v0z: float
    loss_trajectory: list[float]
    v0z_trajectory: list[float]
    final_positions: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_recovery(
    cfg: SphDiffConfig,
    *,
    planted: float,
    init: float,
    optimizer: str = "sgd",
    lr: float | None = None,
    max_iter: int = 200,
    tol: float = 1e-24,
) -> InverseSolution:
    """Plant a shared ``v0z``, then recover it from the observed final positions.

    The ``v0z -> final-positions`` map is exactly linear with Jacobian ``dt*STEPS`` per
    particle z-component, so ``Loss = N*(dt*STEPS)^2*(v0z-v0z*)^2`` and the default ``lr``
    is the exact Newton step ``1/H`` for ``H = 2*N*(dt*STEPS)^2`` - the quadratic is solved
    in essentially one step (the mpm-diff curvature-scaled precedent; a fixed-lr Adam would
    crawl on this flat loss)."""
    if lr is None:
        hess = 2.0 * cfg.n_particles * (cfg.dt * cfg.steps) ** 2
        lr = 1.0 / hess
    x0 = cloud_initial_positions(cfg)
    truth = SphInitialVelocityControl(cfg, x0)
    target = truth.final_positions(float(planted))

    prob = SphInitialVelocityControl(cfg, x0)
    prob.set_target(target)
    spec = prob.params_spec()
    opt = make_optimizer(optimizer, lr, (1,))

    x = np.asarray([init], dtype=np.float64)
    losses: list[float] = []
    traj: list[float] = []
    for _ in range(max_iter):
        loss, grad = prob._loss_and_grad(spec, x)
        losses.append(loss)
        traj.append(float(x[0]))
        if loss < tol:
            break
        x = opt.step(x, grad)
    rec = float(x[0])

    _, grad = prob._loss_and_grad(spec, np.asarray([rec], dtype=np.float64))
    final = np.asarray(prob.x.to_numpy()[cfg.steps], dtype=np.float64)
    return InverseSolution(
        recovered_v0z=rec,
        planted_v0z=float(planted),
        loss_trajectory=losses,
        v0z_trajectory=traj,
        final_positions=final,
        grad_fields={"dLoss_dv0z": np.asarray(grad, dtype=np.float64).ravel()},
    )
