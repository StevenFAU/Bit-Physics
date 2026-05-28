"""Taichi kernels for the Stack-D Lenia forward step (IC-12 discipline).

Module-level discipline (Taichi-integration IC-12, mirrors
``packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py``):

- NO ``from __future__ import annotations`` — Taichi's ``@ti.kernel``
  AST transformer resolves argument-type annotations at decoration
  time; PEP 563 stringification breaks it.
- NO ``-> None`` return annotation on any ``@ti.kernel`` — Taichi
  1.7.4 raises ``TypeError`` at decoration when
  ``ctx.func.return_type`` is ``None`` for ``-> None``-annotated
  kernels.
- Use ``ti.types.ndarray(dtype=ti.f64, ndim=2)`` for array arguments
  (NOT ``ti.template()`` field references) so the kernels run at
  arbitrary grid sizes / kernel windows without re-allocating Taichi
  snode-tree fields.

Determinism contract (D-DET): the ``ti.ndrange(n, n)`` outer iteration
is row-major; ``cpu_max_num_threads=1`` (set by
``common_py.determinism.set_taichi_deterministic``) serialises the
loop; no in-kernel reductions; no ``ti.atomic_*``; per-cell writes
happen in a deterministic order.
"""

import taichi as ti


@ti.kernel
def lenia_convolve(
    field: ti.types.ndarray(dtype=ti.f64, ndim=2),
    kernel: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    n: ti.i32,
    R: ti.i32,
):
    """Real-space periodic-BC Quad4 convolution.

    For each ``(i, j)`` cell:
        out[i, j] = sum_{di, dj in [-R, R]} field[(i+di)%n, (j+dj)%n] * kernel[di+R, dj+R]

    No atomic_add; no cross-cell accumulator; each iteration of the
    outer ``ndrange(n, n)`` writes to a unique ``(i, j)`` in ``out``.
    """
    for i, j in ti.ndrange(n, n):
        # Explicit f64 accumulator. Taichi 1.7.4 otherwise infers f32 for
        # the literal ``0.0``, then warns ``Atomic add may lose precision:
        # f32 <- f64`` and silently downcasts every accumulation. Pinning
        # ``acc`` to ``ti.f64`` keeps the convolution in f64 and preserves
        # the D-DET bit-exact-same-stack-same-hw contract.
        acc: ti.f64 = 0.0
        for di in range(-R, R + 1):
            for dj in range(-R, R + 1):
                ii = (i + di) % n
                jj = (j + dj) % n
                acc += field[ii, jj] * kernel[di + R, dj + R]
        out[i, j] = acc


@ti.kernel
def lenia_update(
    field: ti.types.ndarray(dtype=ti.f64, ndim=2),
    conv: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    mu: ti.f64,
    sigma: ti.f64,
    dt: ti.f64,
    n: ti.i32,
):
    """Quad4 polynomial growth + clip-Euler update.

    ``out = clip(field + dt * G(conv; mu, sigma), 0, 1)``
    where ``G`` is the Chakazul gn=1 polynomial form.
    """
    for i, j in ti.ndrange(n, n):
        u = conv[i, j]
        d = u - mu
        base = 1.0 - d * d / (9.0 * sigma * sigma)
        if base < 0.0:
            base = 0.0
        g = base * base * base * base * 2.0 - 1.0
        val = field[i, j] + dt * g
        if val < 0.0:
            val = 0.0
        if val > 1.0:
            val = 1.0
        out[i, j] = val
