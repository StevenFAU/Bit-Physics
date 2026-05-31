# mypy: ignore-errors
"""Differentiable articulated-pendulum forward + inverse problem (Stack E / NVIDIA Warp).

The differentiable single-pendulum: the landed parent Featherstone ABA kernel
(``articulated_pedagogical._warp_kernels.aba_kernel``) is launched on-device inside a ``wp.Tape``
with ``requires_grad`` arrays (NO ``.numpy()`` in the taped region — the parent's wrapper severs
the tape there). Two deliverables:

* the **gradient goldens** (:func:`qddot_gradient`): ``∂q̈/∂q`` (A1) and ``∂q̈/∂τ`` (A3) for the
  single pendulum, machine-exact vs the closed forms in :mod:`.forward` (Stage-0 probe);
* the **inverse problem** (:class:`PendulumStateRecovery`, an
  :class:`~common_warp.autodiff.InitialStateRecoveryProblem`): recover the initial state
  ``(q0, qd0)`` from the observed final ``(q_T, qd_T)`` of a short semi-implicit-Euler rollout —
  identifiable (2 unknowns, 2 observations) in the smooth short-horizon regime.

**Scope = single pendulum (n=1).** The Stage-0 WARP-NATIVE-TAPE probe MEASURED the ``n≥2`` coupled
adjoint to diverge from central-FD (the inward-pass in-place ``ia[i-1]`` accumulation is a
read-after-write aliasing Warp's reverse pass cannot replay correctly); the differentiable variant
is therefore single-pendulum-scoped, where the adjoint is provably exact. The FORWARD is exact at
any ``n`` (used by the parent-vs-frontier forward-equivalence check).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import warp as wp
from articulated_pedagogical._warp_kernels import aba_kernel
from articulated_pedagogical.model import ArticulatedChain
from common_warp.autodiff import InitialStateRecoveryProblem, ParamSpec
from common_warp.autodiff.finite_diff import make_optimizer

from ._kernels import load_split, pack_state, pick_scalar, semi_implicit_euler_step
from .forward import ArticulatedDiffConfig

wp.init()

__all__ = [
    "InverseSolution",
    "PendulumStateRecovery",
    "central_fd_dqddot",
    "differentiable_qddot",
    "qddot_gradient",
    "solve_recovery",
]

_DEVICE = "cpu"


def _f64(values: Any, *, requires_grad: bool = False) -> wp.array:
    return wp.array(
        np.ascontiguousarray(values, dtype=np.float64),
        dtype=wp.float64,
        device=_DEVICE,
        requires_grad=requires_grad,
    )


def _launch_aba(
    chain: ArticulatedChain, q_w: wp.array, qd_w: wp.array, tau_w: wp.array
) -> wp.array:
    """Launch the parent ABA kernel on-device; return the ``requires_grad`` ``qdd`` array.

    Must be called inside an active ``wp.Tape`` for the gradient to record. The chain constants are
    plain (non-grad) arrays; every scratch + the output is ``requires_grad`` (fresh per call → no
    cross-call aliasing). Mirrors the parent ``aba_forward_dynamics`` launch verbatim, minus the
    ``.numpy()`` tape-sever."""
    n = chain.n_links
    common_warp_init_deterministic()

    length_w = _f64(np.array(chain.lengths))
    cdist_w = _f64(np.array(chain.com_distances))
    mass_w = _f64(np.array(chain.masses))
    inertia_w = _f64(np.array(chain.inertias))

    jpos = wp.zeros(n, dtype=wp.vec2d, device=_DEVICE, requires_grad=True)
    cpos = wp.zeros(n, dtype=wp.vec2d, device=_DEVICE, requires_grad=True)
    smot = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE, requires_grad=True)
    vel = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE, requires_grad=True)
    ia = wp.zeros(n, dtype=wp.mat33d, device=_DEVICE, requires_grad=True)
    pa = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE, requires_grad=True)
    uvec = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE, requires_grad=True)
    dscalar = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
    uscalar = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
    accel = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE, requires_grad=True)
    qdd = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)

    wp.launch(
        aba_kernel,
        dim=1,
        inputs=[
            q_w,
            qd_w,
            tau_w,
            length_w,
            cdist_w,
            mass_w,
            inertia_w,
            wp.float64(0.0),
            wp.float64(-float(chain.gravity)),
            wp.int32(n),
            jpos,
            cpos,
            smot,
            vel,
            ia,
            pa,
            uvec,
            dscalar,
            uscalar,
            accel,
            qdd,
        ],
        device=_DEVICE,
    )
    return qdd


def common_warp_init_deterministic() -> None:
    """Idempotent CPU/serial Warp init (the parent ABA determinism mechanism)."""
    import common_warp

    common_warp.init(_DEVICE, deterministic=True)


# --------------------------------------------------------------------------- #
# Forward + gradient goldens (single-step, single pendulum)
# --------------------------------------------------------------------------- #
def differentiable_qddot(
    chain: ArticulatedChain,
    q: np.ndarray,
    qd: np.ndarray,
    tau: np.ndarray | None = None,
) -> np.ndarray:
    """On-device ABA forward acceleration ``q̈`` (no tape). Bit-exact vs the parent wrapper.

    The forward is exact at any ``n`` (the parent-vs-frontier forward-equivalence anchor)."""
    n = chain.n_links
    tau = np.zeros(n, dtype=np.float64) if tau is None else np.asarray(tau, dtype=np.float64)
    q_w, qd_w, tau_w = _f64(q), _f64(qd), _f64(tau)
    qdd = _launch_aba(chain, q_w, qd_w, tau_w)
    return np.asarray(qdd.numpy(), dtype=np.float64)


def qddot_gradient(
    chain: ArticulatedChain,
    q: np.ndarray,
    qd: np.ndarray,
    tau: np.ndarray | None = None,
    *,
    wrt: str = "q",
    idx: int = 0,
) -> tuple[np.ndarray, float]:
    """Autodiff ``(q̈, ∂q̈[idx]/∂<wrt>[idx])`` via ``wp.Tape`` (the A1/A3 gradient mechanism).

    ``wrt`` ∈ {``"q"``, ``"qd"``, ``"tau"``}; the backward seed is ``q̈[idx]`` (a length-1 loss),
    so ``tape.backward`` yields the full ``∂q̈[idx]/∂<wrt>`` and we return its ``[idx]`` component
    (the single-pendulum partial). Machine-exact for ``n=1``."""
    n = chain.n_links
    tau = np.zeros(n, dtype=np.float64) if tau is None else np.asarray(tau, dtype=np.float64)
    q_w = _f64(q, requires_grad=(wrt == "q"))
    qd_w = _f64(qd, requires_grad=(wrt == "qd"))
    tau_w = _f64(tau, requires_grad=(wrt == "tau"))
    out = wp.zeros(1, dtype=wp.float64, device=_DEVICE, requires_grad=True)

    tape = wp.Tape()
    with tape:
        qdd = _launch_aba(chain, q_w, qd_w, tau_w)
        wp.launch(pick_scalar, dim=1, inputs=[qdd, wp.int32(idx), out], device=_DEVICE)
    tape.backward(loss=out)

    grad_arr = {"q": q_w, "qd": qd_w, "tau": tau_w}[wrt].grad.numpy()
    qdd_np = np.asarray(qdd.numpy(), dtype=np.float64).copy()
    g = float(grad_arr[idx])
    tape.zero()
    return qdd_np, g


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
    """Central finite-difference baseline ``∂q̈[idx]/∂<wrt>[idx]`` (A2; the numerical reference)."""
    n = chain.n_links
    base = {
        "q": np.asarray(q, dtype=np.float64).copy(),
        "qd": np.asarray(qd, dtype=np.float64).copy(),
        "tau": (np.zeros(n) if tau is None else np.asarray(tau, dtype=np.float64)).copy(),
    }

    def _ev_qddot(pert: dict[str, np.ndarray]) -> float:
        return float(differentiable_qddot(chain, pert["q"], pert["qd"], pert["tau"])[idx])

    plus = {k: v.copy() for k, v in base.items()}
    minus = {k: v.copy() for k, v in base.items()}
    plus[wrt][idx] += eps
    minus[wrt][idx] -= eps
    return (_ev_qddot(plus) - _ev_qddot(minus)) / (2.0 * eps)


# --------------------------------------------------------------------------- #
# Inverse problem — recover (q0, qd0) from the observed final state
# --------------------------------------------------------------------------- #
class PendulumStateRecovery(InitialStateRecoveryProblem):  # type: ignore[misc]
    """Recover the initial state ``(q0, qd0)`` from the observed final ``(q_T, qd_T)``.

    The ``(2n,)`` ``requires_grad`` parameter vector ``(q0 ‖ qd0)`` is split into the per-step state
    INSIDE the tape; the forward runs the tape-differentiable semi-implicit-Euler rollout; the loss
    is the L2 final-state mismatch. Identifiable (2 unknowns, 2 observations) in the smooth
    short-horizon regime (single pendulum, away from the separatrix)."""

    def __init__(self, chain: ArticulatedChain, cfg: ArticulatedDiffConfig, **kw: Any) -> None:
        super().__init__(**kw)
        self.chain = chain
        self.cfg = cfg
        n = chain.n_links
        self._flat = wp.zeros(2 * n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
        self._tau_w = _f64(np.zeros(n))
        self.state = (n, cfg.steps, cfg.dt)

    def params_spec(self) -> ParamSpec:
        n = self.chain.n_links

        def pack(d: Any) -> Any:
            if isinstance(d, dict):
                arr = np.concatenate([np.ravel(d["q0"]), np.ravel(d["qd0"])]).astype(np.float64)
            else:
                arr = np.asarray(d, dtype=np.float64).ravel()
            self._flat.assign(arr)
            return self._flat

        def unpack(flat: Any) -> dict[str, np.ndarray]:
            v = np.asarray(flat.numpy(), dtype=np.float64)
            return {"q0": v[:n].copy(), "qd0": v[n:].copy()}

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={
                "q0": {"index": slice(0, n), "shape": (n,)},
                "qd0": {"index": slice(n, 2 * n), "shape": (n,)},
            },
        )

    def forward(self, params: Any, state: Any) -> Any:
        """Tape-differentiable semi-implicit-Euler rollout; return packed final ``(q_T ‖ qd_T)``."""
        n, steps, dt = state
        q = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
        qd = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
        wp.launch(load_split, dim=n, inputs=[params, wp.int32(n), q, qd], device=_DEVICE)
        for _ in range(int(steps)):
            qdd = _launch_aba(self.chain, q, qd, self._tau_w)
            q_next = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
            qd_next = wp.zeros(n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
            wp.launch(
                semi_implicit_euler_step,
                dim=n,
                inputs=[q, qd, qdd, wp.float64(dt), q_next, qd_next],
                device=_DEVICE,
            )
            q, qd = q_next, qd_next
        predicted = wp.zeros(2 * n, dtype=wp.float64, device=_DEVICE, requires_grad=True)
        wp.launch(pack_state, dim=n, inputs=[q, qd, wp.int32(n), predicted], device=_DEVICE)
        return predicted

    # -- non-tape convenience ------------------------------------------------
    def final_state(self, q0: np.ndarray, qd0: np.ndarray) -> np.ndarray:
        """Run the rollout at ``(q0, qd0)`` (no tape); return the packed final ``(q_T ‖ qd_T)``."""
        self._flat.assign(np.concatenate([np.ravel(q0), np.ravel(qd0)]).astype(np.float64))
        out = self.forward(self._flat, self.state)
        return np.asarray(out.numpy(), dtype=np.float64)


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
    chain: ArticulatedChain,
    cfg: ArticulatedDiffConfig,
    *,
    optimizer: str = "adam",
    lr: float = 0.05,
    max_iter: int = 4000,
    tol: float = 1e-16,
) -> InverseSolution:
    """Plant ``(q0, qd0)``, then recover it from the observed final state.

    Identifiable in the smooth short-horizon single-pendulum regime → the recovery converges to the
    planted initial state. Returns the recovered/planted states, the loss trajectory, the final
    state, and the autodiff ``gradient_fields`` (``∂Loss/∂(q0, qd0)`` at the recovered point, ≈ 0)
    for the schema-1.1.0 capture."""
    n = chain.n_links
    planted_q0 = np.array([cfg.q0] * n, dtype=np.float64)
    planted_qd0 = np.array([cfg.qd0] * n, dtype=np.float64)

    truth = PendulumStateRecovery(chain, cfg)
    target = truth.final_state(planted_q0, planted_qd0)

    prob = PendulumStateRecovery(chain, cfg, optimizer=optimizer, lr=lr, max_iter=max_iter, tol=tol)
    prob.set_target(np.ascontiguousarray(target, dtype=np.float64))
    spec = prob.params_spec()
    opt = make_optimizer(optimizer, lr, (2 * n,))

    x = np.zeros(2 * n, dtype=np.float64)  # recover from a zero initial guess
    losses: list[float] = []
    for _ in range(max_iter):
        loss, grad = prob._loss_and_grad(spec, x)
        losses.append(loss)
        if loss < tol:
            break
        x = opt.step(x, grad.ravel())

    _, grad = prob._loss_and_grad(spec, x)
    final = np.asarray(prob.forward(prob._flat, prob.state).numpy(), dtype=np.float64)
    return InverseSolution(
        recovered_q0=x[:n].copy(),
        recovered_qd0=x[n:].copy(),
        planted_q0=planted_q0,
        planted_qd0=planted_qd0,
        loss_trajectory=losses,
        final_state=final,
        grad_fields={
            "dLoss_dq0": np.asarray(grad[:n], dtype=np.float64),
            "dLoss_dqd0": np.asarray(grad[n:], dtype=np.float64),
        },
    )
