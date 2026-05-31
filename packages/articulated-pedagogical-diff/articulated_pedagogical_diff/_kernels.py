# mypy: ignore-errors
# ^ Warp DSL surface: `@wp.kernel` parameter annotations (`wp.array(dtype=...)`) and in-kernel
#   `wp.float64(...)` arithmetic read as untyped calls under `mypy --strict` (Warp ships partial
#   type stubs). F-RB-3 — same posture as the parent `_warp_kernels.py` + `common_warp.autodiff`.
"""Tape-differentiable rollout/golden Warp kernels (IC-12 dedicated kernel module).

The heavy 3-pass Featherstone ABA recursion is REUSED verbatim from the landed parent
(``articulated_pedagogical._warp_kernels.aba_kernel``) — it is already a clean ``@wp.kernel`` over
Warp arrays, so for the single pendulum (``n=1``) its ``wp.Tape`` adjoint is machine-exact
(Stage-0 probe). Only the parent's Python *wrapper* severs the tape (``qdd.numpy()`` host
round-trip); the diff variant keeps everything on-device. This module adds the small kernels the
differentiable forward needs around that recursion:

* :func:`load_split` — copy the flat ``requires_grad`` parameter vector ``(q0 ‖ qd0)`` into the
  per-step state arrays INSIDE the tape (a linear copy → the gradient flows back to the params).
* :func:`semi_implicit_euler_step` — one symplectic (semi-implicit) Euler step
  ``qd' = qd + dt·q̈``, ``q' = q + dt·qd'`` (the parent integrator's default), written to FRESH
  ``requires_grad`` arrays so the tape records the rollout chain with no cross-step aliasing.
* :func:`pack_state` — write the final ``(q_T ‖ qd_T)`` into the predicted vector for the L2 loss.
* :func:`pick_scalar` — select one ``q̈`` component into a length-1 loss array so
  ``tape.backward`` yields ``∂q̈[idx]/∂·`` (the gradient-golden A1/A3 mechanism).

DETERMINISM (D9): every kernel is launched single-thread serial on the Warp CPU backend; no atomic
scatter in the forward (``forward`` row ``atomic_ops = none``); the tape adjoint of the L2 reduction
uses ``wp.atomic_add`` (sum → ``gradient`` row ``atomic_ops = sum-only``). All arithmetic is
``wp.float64``.
"""

import warp as wp


@wp.kernel
def load_split(
    flat: wp.array(dtype=wp.float64, ndim=1),
    n: wp.int32,
    q_out: wp.array(dtype=wp.float64, ndim=1),
    qd_out: wp.array(dtype=wp.float64, ndim=1),
):
    """Tape-safe linear split ``q_out[i]=flat[i]``, ``qd_out[i]=flat[n+i]`` (params -> state)."""
    i = wp.tid()
    q_out[i] = flat[i]
    qd_out[i] = flat[n + i]


@wp.kernel
def semi_implicit_euler_step(
    q: wp.array(dtype=wp.float64, ndim=1),
    qd: wp.array(dtype=wp.float64, ndim=1),
    qdd: wp.array(dtype=wp.float64, ndim=1),
    dt: wp.float64,
    q_out: wp.array(dtype=wp.float64, ndim=1),
    qd_out: wp.array(dtype=wp.float64, ndim=1),
):
    """Symplectic Euler ``qd' = qd + dt·q̈``; ``q' = q + dt·qd'`` (parent integrator default)."""
    i = wp.tid()
    qd_new = qd[i] + dt * qdd[i]
    qd_out[i] = qd_new
    q_out[i] = q[i] + dt * qd_new


@wp.kernel
def pack_state(
    q: wp.array(dtype=wp.float64, ndim=1),
    qd: wp.array(dtype=wp.float64, ndim=1),
    n: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=1),
):
    """Pack the final state ``out = (q ‖ qd)`` (length ``2n``) for the L2 loss."""
    i = wp.tid()
    out[i] = q[i]
    out[n + i] = qd[i]


@wp.kernel
def pick_scalar(
    qdd: wp.array(dtype=wp.float64, ndim=1),
    idx: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=1),
):
    """Select one acceleration component ``out[0] = q̈[idx]`` (the golden backward seed)."""
    out[0] = qdd[idx]
