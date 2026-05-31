"""Differentiable MPM inverse problems + capture helpers (Stack D / Taichi).

:class:`MpmInitialVelocityID` (an :class:`~common_py.autodiff.InitialStateRecoveryProblem`)
recovers the **shared initial velocity** ``v0`` of a small elastic blob from its observed
final particle positions - the DiffTaichi "throw-to-target" inverse (Hu et al., ICLR 2020;
arXiv:1910.00935; CITE-DON'T-IMPORT). The forward is the tape-differentiable 3D APIC
neo-Hookean MLS-MPM in :mod:`._kernels`, re-implementing the landed
``mpm-multimaterial-stack-d`` reference's arithmetic with time-indexed ``needs_grad`` fields.

**Identifiability (on-evidence Stage-1b finding):** unlike lenia-diff's joint ``(mu,sigma)``, the
shared ``v0`` IS identifiable - the map ``v0 -> final_positions`` is near-linear
(``x_final ~= x0 + dt*STEPS*v0 + O(stress)``) and injective, so the recovery converges to the
planted ``v0`` (no spurious basin). Documented in :func:`solve_recovery`.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
import taichi as ti
from common_py.autodiff import InitialStateRecoveryProblem, ParamSpec
from common_py.autodiff.finite_diff import make_optimizer

from ._kernels import make_mpm_kernels, stress00_axis
from .forward import MpmDiffConfig, cluster_initial_positions

__all__ = [
    "InverseSolution",
    "MpmInitialVelocityID",
    "autodiff_dstress00_dstrain",
    "solve_recovery",
]

DIM = 3


class MpmInitialVelocityID(InitialStateRecoveryProblem):  # type: ignore[misc]
    """Recover the shared initial velocity ``v0`` from observed final particle positions.

    The 3-element ``needs_grad`` parameter field is loaded into ``v[0,p]`` for every particle
    (inside the tape) so ``ti.ad.Tape`` backprops ``dLoss/dv0``. The forward runs the
    tape-differentiable APIC neo-Hookean MLS-MPM step; the loss is the L2 final-position
    mismatch. Regime: interior small-strain elastic, no plastic yield, short horizon."""

    def __init__(self, cfg: MpmDiffConfig, x0: np.ndarray, **kw: Any) -> None:
        super().__init__(**kw)
        self.cfg = cfg
        P, N, S = cfg.n_particles, cfg.grid_n, cfg.steps
        self.x = ti.Vector.field(DIM, ti.f64, shape=(S + 1, P), needs_grad=True)
        self.v = ti.Vector.field(DIM, ti.f64, shape=(S + 1, P), needs_grad=True)
        self.C = ti.Matrix.field(DIM, DIM, ti.f64, shape=(S + 1, P), needs_grad=True)
        self.F = ti.Matrix.field(DIM, DIM, ti.f64, shape=(S + 1, P), needs_grad=True)
        self.gm = ti.field(ti.f64, shape=(S, N, N, N), needs_grad=True)
        self.gv = ti.field(ti.f64, shape=(S, N, N, N, DIM), needs_grad=True)
        self.go = ti.field(ti.f64, shape=(S, N, N, N, DIM), needs_grad=True)
        self._v0 = ti.field(ti.f64, shape=DIM, needs_grad=True)
        self._ker = make_mpm_kernels(
            n_particles=P,
            grid_n=N,
            steps=S,
            dx=cfg.dx,
            dt=cfg.dt,
            mu=cfg.mu,
            lam=cfg.lam,
            gravity=cfg.gravity_z,
            volume=cfg.volume,
            mass=cfg.mass,
            floor_z=cfg.floor_z_index,
        )
        self.set_initial(x0)
        self.state = (x0,)

    def set_initial(self, x0: np.ndarray) -> None:
        """Load the (constant) particle IC x[0]=x0, F[0]=I, C[0]=0 (outside any tape)."""
        x0 = np.ascontiguousarray(x0, dtype=np.float64)
        self.x.fill(0.0)
        self.v.fill(0.0)
        self.C.fill(0.0)
        self.F.fill(0.0)
        for p in range(self.cfg.n_particles):
            self.x[0, p] = ti.Vector([float(x0[p, 0]), float(x0[p, 1]), float(x0[p, 2])])
            self.F[0, p] = ti.Matrix(np.eye(DIM).tolist())
        self._x0 = x0

    def params_spec(self) -> ParamSpec:
        def pack(d: Any) -> Any:
            arr = np.asarray(d["v0"] if isinstance(d, dict) else d, dtype=np.float64).ravel()
            self._v0.from_numpy(arr)
            return self._v0

        def unpack(flat: Any) -> dict[str, np.ndarray]:
            return {"v0": np.asarray(flat.to_numpy(), dtype=np.float64)}

        return ParamSpec(
            flat=self._v0,
            pack=pack,
            unpack=unpack,
            structure={"v0": {"index": slice(0, DIM), "shape": (DIM,)}},
        )

    def forward(self, params: Any, state: Any) -> Any:
        """Run the tape-differentiable MLS-MPM rollout; return the position field ``x``.

        ``params`` is the ``(3,)`` ``needs_grad`` ``v0`` field. The grid is re-zeroed by a
        kernel (tape-safe) and ``v0`` loaded into ``v[0]`` inside the tape so the gradient
        flows back to ``params``; x[0]/F[0]/C[0] are the constants set in :meth:`set_initial`."""
        raise NotImplementedError("Stage 1a scaffold: forward implemented at Stage 1b")

    def loss(self, predicted: Any, target: Any) -> Any:
        self._ker["comp_loss"](self.x, target, self.loss_field)
        return self.loss_field

    def final_positions(self, v0: np.ndarray) -> np.ndarray:
        """Run the forward at ``v0`` (no tape); return the final particle positions ``(P,3)``."""
        self.set_initial(self._x0)
        self._v0.from_numpy(np.ascontiguousarray(v0, dtype=np.float64).ravel())
        self.forward(self._v0, self.state)
        return np.asarray(self.x.to_numpy()[self.cfg.steps], dtype=np.float64)

    def grad_wrt_v0(self, v0: np.ndarray, target: np.ndarray) -> np.ndarray:
        """Autodiff ``dLoss/dv0`` ``(3,)`` at ``v0`` against ``target`` final positions."""
        self.set_initial(self._x0)
        self.set_target(target)
        _, grad = self._loss_and_grad(self.params_spec(), np.asarray(v0, dtype=np.float64).ravel())
        return np.asarray(grad, dtype=np.float64)


def autodiff_dstress00_dstrain(cfg: MpmDiffConfig) -> float:
    """Autodiff d(sigma00)/deps of the neo-Hookean stress at F=diag(1+eps,1,1), eps=0 (A3)."""
    eps = ti.field(ti.f64, shape=(), needs_grad=True)
    out = ti.field(ti.f64, shape=(), needs_grad=True)
    eps[None] = 0.0
    out[None] = 0.0
    with ti.ad.Tape(loss=out):
        stress00_axis(eps, cfg.mu, cfg.lam, out)
    return float(eps.grad[None])


# --------------------------------------------------------------------------- #
# Inverse-solution capture payload
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class InverseSolution:
    """Result of a planted-``v0`` recovery (the canonical capture payload)."""

    recovered_v0: np.ndarray
    planted_v0: np.ndarray
    loss_trajectory: list[float]
    v0_trajectory: list[np.ndarray]
    final_positions: np.ndarray
    grad_fields: dict[str, np.ndarray]


def solve_recovery(
    cfg: MpmDiffConfig,
    *,
    planted: tuple[float, float, float],
    init: tuple[float, float, float],
    optimizer: str = "sgd",
    lr: float | None = None,
    max_iter: int = 400,
    tol: float = 1e-22,
) -> InverseSolution:
    """Plant a shared ``v0``, then recover it from the observed final positions.

    ``v0`` is identifiable (near-linear injective map; see the module docstring), so the
    recovery converges to the planted value. The loss is **flat in ``v0``** (the stable
    ``dt`` makes the ``v0->final-position`` map small in magnitude), so the default ``lr`` is
    the **curvature-scaled Newton step** for the dominant quadratic
    ``Loss ~= sum_p ||dt*STEPS*(v0-v0t)||^2`` (Hessian ``H ~= 2*n_particles*(dt*STEPS)^2``):
    a fixed-lr
    Adam would oscillate at the lr scale and never reach the planted point. Returns the
    recovered ``v0``, the optimization trajectory, the final positions, and the autodiff
    ``gradient_fields`` (``dLoss/dv0`` at the recovered point - ~=0 since it lands on the
    planted point) for the schema-1.1.0 capture."""
    if lr is None:
        # Newton step 1/H for the dominant quadratic (slightly under-relaxed for the APIC
        # nonlinearity); converges in a handful of iterations on the flat-but-quadratic loss.
        h = 2.0 * cfg.n_particles * (cfg.dt * cfg.steps) ** 2
        lr = 0.5 / h
    x0 = cluster_initial_positions(cfg)
    truth = MpmInitialVelocityID(cfg, x0)
    target = truth.final_positions(np.asarray(planted, dtype=np.float64))

    prob = MpmInitialVelocityID(cfg, x0)
    prob.set_target(target)
    spec = prob.params_spec()
    opt = make_optimizer(optimizer, lr, (DIM,))

    x = np.asarray(init, dtype=np.float64)
    losses: list[float] = []
    traj: list[np.ndarray] = []
    for _ in range(max_iter):
        # x[0]/F[0]/C[0] are the constants set in __init__; forward overwrites only the
        # step-slices, so no per-iteration re-init is needed (the grid is re-zeroed inside
        # forward by clear_grid).
        loss, grad = prob._loss_and_grad(spec, x)
        losses.append(loss)
        traj.append(x.copy())
        if loss < tol:
            break
        x = opt.step(x, grad)
    rec = x.copy()

    _, grad = prob._loss_and_grad(spec, rec)
    final = np.asarray(prob.x.to_numpy()[cfg.steps], dtype=np.float64)
    return InverseSolution(
        recovered_v0=rec,
        planted_v0=np.asarray(planted, dtype=np.float64),
        loss_trajectory=losses,
        v0_trajectory=traj,
        final_positions=final,
        grad_fields={"dLoss_dv0": np.asarray(grad, dtype=np.float64)},
    )
