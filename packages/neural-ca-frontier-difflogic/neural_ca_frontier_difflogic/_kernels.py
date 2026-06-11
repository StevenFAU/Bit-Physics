# mypy: ignore-errors
"""Tape-differentiable frozen-gate DiffLogic-CA Taichi kernels (IC-12 discipline).

Dedicated kernel module WITHOUT ``from __future__ import annotations`` and WITHOUT
``-> None`` return hints (Taichi 1.7.4 reads kernel argument annotations as live objects).

Tape-safety (the batch-1 + U-1 banked findings):

1. **Time-indexed ``needs_grad`` state** ``s[t,i,j]``: each step kernel writes only the
   ``t+1`` slice - single-write per element inside one tape run; no accumulators in the
   forward (the circuit is a pure per-cell function of the ``t`` slice).
2. **``ti.static``-unrolled circuit**: the frozen wire list ``GOL_CIRCUIT`` is a
   compile-time constant; the 36 gate evaluations unroll to straight-line multilinear
   arithmetic (constants t00..t11 baked per wire). No runtime-nested loops, no branches -
   the multilinear form is branch-free, so the tape sees a smooth polynomial.
3. **Loss zeroed by the harness** (``InverseProblem._loss_and_grad`` resets
   ``loss_field``); the loss kernel only accumulates (sum-only atomic - the gradient
   surface's only atomic).

Determinism-sensitive surface: the loss ``+=`` reduction (sum-only), serialised bit-exact
under ``cpu_max_num_threads=1``. The forward has NO atomics (per-cell independent writes).
MEASURED in ``tests/test_determinism.py``.
"""

from typing import Any

import taichi as ti

from .forward import GATE_TRUTH_TABLES, GOL_CIRCUIT

# Cache of config-specialised kernel bundles (ti.static needs compile-time constants).
_KERNEL_CACHE: dict[tuple, dict[str, Any]] = {}


def make_difflogic_kernels(*, grid_n: int, soft_steps: int) -> dict[str, Any]:
    """Return (compiling once per config) the tape-differentiable DiffLogic kernels.

    Bundled: load_alpha, step, comp_loss. The circuit wiring and gate truth tables are
    baked at compile time from the frozen ``GOL_CIRCUIT``.
    """
    key = (grid_n, soft_steps)
    cached = _KERNEL_CACHE.get(key)
    if cached is not None:
        return cached

    N = int(grid_n)
    STEPS = int(soft_steps)
    CIRCUIT = GOL_CIRCUIT
    TABLES = GATE_TRUTH_TABLES

    @ti.kernel
    def load_alpha(
        s: ti.template(), base: ti.template(), delta: ti.template(), alpha: ti.template()
    ):
        """s[0] = base + alpha*delta (single-write; alpha is the needs_grad param)."""
        for i, j in ti.ndrange(N, N):
            s[0, i, j] = base[i, j] + alpha[0] * delta[i, j]

    @ti.kernel
    def step(t: ti.i32, s: ti.template()):
        """One CA step: per-cell frozen-gate circuit over the periodic 3x3 neighborhood."""
        for i, j in ti.ndrange(N, N):
            im = (i - 1 + N) % N
            ip = (i + 1) % N
            jm = (j - 1 + N) % N
            jp = (j + 1) % N
            # Wire slots 0..8: center + 8 neighbors (row-major, matching the Python golden).
            vals = [
                s[t, i, j],
                s[t, im, jm],
                s[t, im, j],
                s[t, im, jp],
                s[t, i, jm],
                s[t, i, jp],
                s[t, ip, jm],
                s[t, ip, j],
                s[t, ip, jp],
            ]
            for wire in ti.static(range(len(CIRCUIT))):
                gate, a, b = ti.static(CIRCUIT[wire])
                t00, t01, t10, t11 = ti.static(TABLES[gate])
                va = vals[a]
                vb = vals[b]
                vals.append(
                    t00 * (1.0 - va) * (1.0 - vb)
                    + t01 * (1.0 - va) * vb
                    + t10 * va * (1.0 - vb)
                    + t11 * va * vb
                )
            s[t + 1, i, j] = vals[len(vals) - 1]

    @ti.kernel
    def comp_loss(s: ti.template(), target: ti.template(), loss: ti.template()):
        """L2 final-state loss: loss += sum_ij (s[STEPS,i,j] - target[i,j])^2."""
        for i, j in ti.ndrange(N, N):
            d = s[STEPS, i, j] - target[i, j]
            loss[None] += d * d

    bundle: dict[str, Any] = {
        "load_alpha": load_alpha,
        "step": step,
        "comp_loss": comp_loss,
    }
    _KERNEL_CACHE[key] = bundle
    return bundle
