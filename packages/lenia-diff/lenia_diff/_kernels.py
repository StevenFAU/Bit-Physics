# mypy: ignore-errors
"""Tape-differentiable Quad4-Lenia Taichi kernels (IC-12 discipline).

Dedicated kernel module WITHOUT ``from __future__ import annotations`` and WITHOUT
``-> None`` return hints (Taichi 1.7.4 reads kernel argument annotations as live
objects). ``# mypy: ignore-errors`` because ``@ti.kernel`` is untyped.

Three Stage-0-discovered autodiff constraints (probe
``tools/testkit/probes/reports/lenia-diff.md`` §1):

1. **The convolution uses ``ti.static`` tap unrolling.** A nested *runtime* ``for di/dj``
   accumulation inside a differentiated kernel raises "Mixed usage of for-loops and
   statements without looping." ``ti.static(range(-R,R+1))`` unrolls the fixed kernel taps
   to straight-line ``acc += …`` so the tape sees a clean for-loop body. ``R`` is therefore
   a **compile-time constant** captured from the module-level ``KERNEL_RADIUS`` via a
   per-radius kernel cache (``convolve_for_radius``).
2. **Single-write-per-element + time-indexed fields** (DiffTaichi pattern): ``lenia_convolve_diff``
   writes ``conv[t,…]`` once; ``lenia_update_diff`` writes ``field[t+1,…]`` once.
3. **IC + params load OUTSIDE the tape** (see ``sim.py``); only the step-kernels run inside.

The convolution tap order (di outer, dj inner) matches both the landed ``lenia`` reference
(``packages/lenia/lenia/_taichi_kernels.py``) and the NumPy A3 oracle
(``forward.periodic_conv``), preserving bit-faithful agreement.
"""

from typing import Any

import taichi as ti

# Cache of radius-specialised convolution kernels (ti.static needs a compile-time R).
_CONV_KERNELS: dict[int, object] = {}


def convolve_for_radius(R: int):
    """Return (compiling once) the Quad4 convolution kernel specialised to radius ``R``."""
    if R in _CONV_KERNELS:
        return _CONV_KERNELS[R]

    @ti.kernel
    def _convolve(
        t: ti.i32,
        field: ti.template(),  # (steps+1, n, n) needs_grad
        kernel: ti.template(),  # (2R+1, 2R+1)
        conv: ti.template(),  # (steps, n, n) needs_grad
        n: ti.i32,
    ):
        """``conv[t,i,j] = Σ_{di,dj} field[t,(i+di)%n,(j+dj)%n]·kernel[di+R,dj+R]``."""
        for i, j in ti.ndrange(n, n):
            acc = 0.0
            for di in ti.static(range(-R, R + 1)):
                for dj in ti.static(range(-R, R + 1)):
                    ii = (i + di) % n
                    jj = (j + dj) % n
                    acc += field[t, ii, jj] * kernel[di + R, dj + R]
            conv[t, i, j] = acc

    _CONV_KERNELS[R] = _convolve
    return _convolve


def lenia_convolve_diff(t: int, field: Any, kernel: Any, conv: Any, n: int, R: int) -> None:
    """Dispatch to the radius-``R`` specialised convolution kernel (typed wrapper)."""
    convolve_for_radius(int(R))(t, field, kernel, conv, n)


@ti.kernel
def lenia_update_diff(
    t: ti.i32,
    field: ti.template(),  # (steps+1, n, n) needs_grad
    conv: ti.template(),  # (steps, n, n) needs_grad
    growth: ti.template(),  # (2,) [mu, sigma] needs_grad (LeniaGrowthID differentiates these)
    dt: ti.f64,
    n: ti.i32,
):
    """Quad4 growth + clip-Euler update ``field[t+1]=clip(field[t]+dt·G(conv[t]),0,1)``.

    ``mu = growth[0]``, ``sigma = growth[1]`` are read from a ``needs_grad`` 2-vector field so
    the tape records the dependency (LeniaGrowthID differentiates these; LeniaInitialFieldID
    holds them fixed and differentiates ``field[0]`` instead). The ``ti.max(0,base)`` and clip
    are inactive in the smooth-interior regime (probe §1) — there the gradient is exact; the
    branches are kept for forward-faithfulness. Constants computed in-loop (kernel-structure).
    """
    for i, j in ti.ndrange(n, n):
        d = conv[t, i, j] - growth[0]
        base = 1.0 - d * d / (9.0 * growth[1] * growth[1])
        base = ti.max(0.0, base)
        g = base * base * base * base * 2.0 - 1.0
        val = field[t, i, j] + dt * g
        val = ti.min(1.0, ti.max(0.0, val))
        field[t + 1, i, j] = val


@ti.kernel
def lenia_load_field_from_flat(
    field: ti.template(),  # (steps+1, n, n) needs_grad
    flat: ti.template(),  # (n*n,) needs_grad — the recovered initial field
    n: ti.i32,
):
    """Load the flattened (``needs_grad``) initial field into ``field[0]`` (inside the tape).

    A single-write copy so ``ti.ad.Tape`` backprops ``∂Loss/∂field[0]`` to ``flat`` (the A3
    initial-field gradient). Unlike ``from_numpy``, a kernel write IS tape-recordable.
    """
    for i, j in ti.ndrange(n, n):
        field[0, i, j] = flat[i * n + j]


@ti.kernel
def lenia_loss_l2(
    field: ti.template(),
    target: ti.template(),
    loss: ti.template(),
    steps: ti.i32,
    n: ti.i32,
):
    """Accumulate ``Loss = Σ (field[steps] - target)²`` into the scalar ``loss`` field."""
    for i, j in ti.ndrange(n, n):
        dd = field[steps, i, j] - target[i, j]
        loss[None] += dd * dd


@ti.kernel
def lenia_load_initial(
    field: ti.template(),
    init: ti.template(),
    n: ti.i32,
):
    """Copy the (constant) initial condition into the time-0 slice (outside any tape)."""
    for i, j in ti.ndrange(n, n):
        field[0, i, j] = init[i, j]
