# mypy: ignore-errors
"""Tape-differentiable Taichi kernels (IC-12 discipline).

Dedicated kernel module WITHOUT ``from __future__ import annotations`` and WITHOUT
``-> None`` return hints: Taichi 1.7.4 reads kernel argument annotations as live
objects, so a stringized ``ti.template()`` raises ``TaichiSyntaxError`` (Phase-3 lenia
Taichi-kernel-module lesson). ``# mypy: ignore-errors`` because ``@ti.kernel`` is
untyped and ``ti.template()`` is not a mypy type. The autodiff-correctness constraints
(kernel-structure rule; single-write-per-element) live in the docstrings here.
"""

import taichi as ti


@ti.kernel
def gray_scott_step(
    t: ti.i32,
    u: ti.template(),
    v: ti.template(),
    du_param: ti.template(),  # shape (1,), needs_grad — the differentiated D_u
    dv: ti.f64,
    f: ti.f64,
    kk: ti.f64,
    dt: ti.f64,
    inv_dx2: ti.f64,
    reaction: ti.i32,
    n: ti.i32,
):
    """One explicit-Euler Gray-Scott step ``t -> t+1`` (tape-differentiable).

    ``du_param[0]`` is read from a ``needs_grad`` field so the tape records the
    dependency. ``reaction == 0`` drops the reaction terms (pure-diffusion regime,
    the A1 analytic anchor). Per-cell constants are computed inside the loop (the
    ``ti.ad.Tape`` kernel-structure rule forbids a top-level statement + for-loop mix).
    """
    for i, j in ti.ndrange(n, n):
        ip = (i + 1) % n
        im = (i - 1 + n) % n
        jp = (j + 1) % n
        jm = (j - 1 + n) % n
        lap_u = (u[t, ip, j] + u[t, im, j] + u[t, i, jp] + u[t, i, jm] - 4.0 * u[t, i, j]) * inv_dx2
        lap_v = (v[t, ip, j] + v[t, im, j] + v[t, i, jp] + v[t, i, jm] - 4.0 * v[t, i, j]) * inv_dx2
        uvv = u[t, i, j] * v[t, i, j] * v[t, i, j]
        react_u = (-uvv + f * (1.0 - u[t, i, j])) * reaction
        react_v = (uvv - (f + kk) * v[t, i, j]) * reaction
        u[t + 1, i, j] = u[t, i, j] + dt * (du_param[0] * lap_u + react_u)
        v[t + 1, i, j] = v[t, i, j] + dt * (dv * lap_v + react_v)


@ti.kernel
def well_mixed_step(
    t: ti.i32,
    u: ti.template(),
    v: ti.template(),
    f_param: ti.template(),  # shape (1,), needs_grad — the differentiated F
    kk: ti.f64,
    dt: ti.f64,
    n: ti.i32,
):
    """One well-mixed (Laplacian≡0) Gray-Scott step differentiating w.r.t. ``F``."""
    for i, j in ti.ndrange(n, n):
        uvv = u[t, i, j] * v[t, i, j] * v[t, i, j]
        u[t + 1, i, j] = u[t, i, j] + dt * (-uvv + f_param[0] * (1.0 - u[t, i, j]))
        v[t + 1, i, j] = v[t, i, j] + dt * (uvv - (f_param[0] + kk) * v[t, i, j])


@ti.kernel
def loss_l2_final_u(
    u: ti.template(),
    target: ti.template(),
    loss: ti.template(),
    steps: ti.i32,
    n: ti.i32,
):
    """Accumulate ``Loss = Σ (u[steps] - target)²`` into the scalar ``loss`` field."""
    for i, j in ti.ndrange(n, n):
        d = u[steps, i, j] - target[i, j]
        loss[None] += d * d


@ti.kernel
def load_initial(
    u: ti.template(),
    v: ti.template(),
    u0: ti.template(),
    v0: ti.template(),
    n: ti.i32,
):
    """Copy the (constant) initial condition into the time-0 slice."""
    for i, j in ti.ndrange(n, n):
        u[0, i, j] = u0[i, j]
        v[0, i, j] = v0[i, j]
