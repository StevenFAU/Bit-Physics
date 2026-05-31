"""Taichi kernels for the Stack-D Flow Lenia mass-conservative step (IC-12 discipline).

Module-level discipline (Taichi-integration IC-12, mirrors the parent ``lenia._taichi_kernels``):
NO ``from __future__ import annotations``; NO ``-> None`` on ``@ti.kernel``; ``ti.types.ndarray``
arrays.

Determinism contract (D-DET): the convolution + flow kernels are pure per-cell gathers (each
``(i,j)`` writes a unique output cell — NO atomics → ``atomic_ops = none`` for those surfaces). The
**reintegration scatter** ``reintegrate`` accumulates each source cell's mass into its 4
flow-displaced target cells via ``ti.atomic_add`` (the mass-conservation mechanism) →
``atomic_ops = sum-only``; under ``cpu_max_num_threads=1`` the scatter order is fixed, giving
bit-identical run-to-run output (even though the mass INVARIANT is only conserved to summation
roundoff ~Nε — the two are distinct).
Explicit f64 accumulators (the lenia f32-downcast lesson).
"""

import taichi as ti


@ti.kernel
def convolve(
    a: ti.types.ndarray(dtype=ti.f64, ndim=2),
    kernel: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    n: ti.i32,
    radius: ti.i32,
):
    """Periodic-BC affinity convolution ``U = K * A`` (no atomics; unique per-cell write)."""
    for i, j in ti.ndrange(n, n):
        acc: ti.f64 = 0.0
        for di in range(-radius, radius + 1):
            for dj in range(-radius, radius + 1):
                ii = (i + di) % n
                jj = (j + dj) % n
                acc += a[ii, jj] * kernel[di + radius, dj + radius]
        out[i, j] = acc


@ti.kernel
def flow_field(
    u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    fx: ti.types.ndarray(dtype=ti.f64, ndim=2),
    fy: ti.types.ndarray(dtype=ti.f64, ndim=2),
    n: ti.i32,
):
    """Flow ``F = ∇U`` via periodic central differences (no atomics; unique per-cell write)."""
    for i, j in ti.ndrange(n, n):
        ip = (i + 1) % n
        im = (i - 1 + n) % n
        jp = (j + 1) % n
        jm = (j - 1 + n) % n
        fx[i, j] = (u[ip, j] - u[im, j]) * 0.5
        fy[i, j] = (u[i, jp] - u[i, jm]) * 0.5


@ti.kernel
def reintegrate(
    a: ti.types.ndarray(dtype=ti.f64, ndim=2),
    fx: ti.types.ndarray(dtype=ti.f64, ndim=2),
    fy: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    n: ti.i32,
    dt: ti.f64,
):
    """Reintegration-tracking transport (forward bilinear splat; periodic BC; mass-conserving).

    Each cell sends its full mass to ``(i + dt·Fx, j + dt·Fy)``, distributed over the 4 surrounding
    cells with bilinear weights (summing to 1). ``out`` must be pre-zeroed. The accumulation uses
    ``ti.atomic_add`` (sum-only); serial single-thread CPU fixes the order."""
    for i, j in ti.ndrange(n, n):
        m = a[i, j]
        ti_pos = ti.f64(i) + dt * fx[i, j]
        tj_pos = ti.f64(j) + dt * fy[i, j]
        fi0 = ti.floor(ti_pos)
        fj0 = ti.floor(tj_pos)
        # Positive modulus: Taichi/C `%` keeps the dividend's sign, so a negative
        # floored target would index out of range; (x % n + n) % n wraps into [0, n).
        i0 = (ti.i32(fi0) % n + n) % n
        j0 = (ti.i32(fj0) % n + n) % n
        wi = ti_pos - fi0
        wj = tj_pos - fj0
        i1 = (i0 + 1) % n
        j1 = (j0 + 1) % n
        ti.atomic_add(out[i0, j0], m * (1.0 - wi) * (1.0 - wj))
        ti.atomic_add(out[i0, j1], m * (1.0 - wi) * wj)
        ti.atomic_add(out[i1, j0], m * wi * (1.0 - wj))
        ti.atomic_add(out[i1, j1], m * wi * wj)
