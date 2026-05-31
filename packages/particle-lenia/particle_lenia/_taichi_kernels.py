"""Taichi kernels for the Stack-D Particle Lenia force step (IC-12 discipline).

Module-level discipline (Taichi-integration IC-12, mirrors the parent ``lenia._taichi_kernels``):

- NO ``from __future__ import annotations`` (Taichi's ``@ti.kernel`` AST transformer resolves
  argument-type annotations at decoration time; PEP 563 stringification breaks it).
- NO ``-> None`` return annotation (Taichi 1.7.4 raises at decoration).
- ``ti.types.ndarray(dtype=ti.f64, ndim=2)`` for the ``(N, 2)`` position/force arrays.

Determinism contract (D-DET): the outer ``for i in range(n)`` is serialised by
``cpu_max_num_threads=1`` (``common_py.determinism.set_taichi_deterministic``); each ``i`` writes a
unique ``force[i, :]`` (no ``ti.atomic_*``); the inner ``j`` accumulation uses **explicit f64
locals** (``U``, ``dU_*``, ``dR_*``) so Taichi 1.7.4 does not silently downcast to f32 — the lenia
f32-downcast lesson. The per-particle force is the canonical LOCAL rule ``-∇E(p_i)``.
"""

import taichi as ti


@ti.kernel
def particle_force(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    force: ti.types.ndarray(dtype=ti.f64, ndim=2),
    n: ti.i32,
    mu_k: ti.f64,
    sigma_k: ti.f64,
    w_k: ti.f64,
    mu_g: ti.f64,
    sigma_g: ti.f64,
    c_rep: ti.f64,
):
    """Per-particle force ``f_i = -∇E(p_i)`` with ``E = R - G(U)`` (LOCAL rule).

    ``U = Σ_{j≠i} K(r)``, ``∇U = Σ K'(r)·(d/r)``, ``∇R = -c_rep·Σ max(1-r,0)·(d/r)``;
    ``f_i = -(∇R - G'(U)·∇U)``. Explicit f64 locals; no atomics; serial under single-thread CPU."""
    for i in range(n):
        u: ti.f64 = 0.0
        du_x: ti.f64 = 0.0
        du_y: ti.f64 = 0.0
        dr_x: ti.f64 = 0.0
        dr_y: ti.f64 = 0.0
        xi = pos[i, 0]
        yi = pos[i, 1]
        for j in range(n):
            if j != i:
                dx = xi - pos[j, 0]
                dy = yi - pos[j, 1]
                r = ti.sqrt(dx * dx + dy * dy)
                if r > 0.0:
                    inv_r = 1.0 / r
                    dir_x = dx * inv_r
                    dir_y = dy * inv_r
                    k = w_k * ti.exp(-((r - mu_k) * (r - mu_k)) / (sigma_k * sigma_k))
                    kp = k * (-2.0 * (r - mu_k) / (sigma_k * sigma_k))
                    u += k
                    du_x += kp * dir_x
                    du_y += kp * dir_y
                    rep = 1.0 - r
                    if rep > 0.0:
                        dr_x += c_rep * rep * (-1.0) * dir_x
                        dr_y += c_rep * rep * (-1.0) * dir_y
        g = ti.exp(-((u - mu_g) * (u - mu_g)) / (sigma_g * sigma_g))
        gp = g * (-2.0 * (u - mu_g) / (sigma_g * sigma_g))
        de_x = dr_x - gp * du_x
        de_y = dr_y - gp * du_y
        force[i, 0] = -de_x
        force[i, 1] = -de_y


@ti.kernel
def euler_step(
    pos: ti.types.ndarray(dtype=ti.f64, ndim=2),
    force: ti.types.ndarray(dtype=ti.f64, ndim=2),
    out: ti.types.ndarray(dtype=ti.f64, ndim=2),
    n: ti.i32,
    dt: ti.f64,
):
    """Forward-Euler position update ``out = pos + dt·force`` (``force = -∇E``)."""
    for i in range(n):
        out[i, 0] = pos[i, 0] + dt * force[i, 0]
        out[i, 1] = pos[i, 1] + dt * force[i, 1]
