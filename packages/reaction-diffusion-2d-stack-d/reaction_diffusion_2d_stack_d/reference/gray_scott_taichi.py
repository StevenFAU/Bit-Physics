"""Taichi-DSL Gray-Scott reference for the Stack-D port.

Spec § 5.2.1 + spec-ref-stack-d.md § 5. The reference is explicit forward
Euler with a 5-point Laplacian and periodic boundary conditions, ported
verbatim from the Stack-B NumPy reference at
``packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py``:

    U_{t+dt} = U + dt * (Du * laplacian(U) - U*V*V + F * (1 - U))
    V_{t+dt} = V + dt * (Dv * laplacian(V) + U*V*V - (F + k) * V)

The locked-canonical parameters (F = 0.0367, k = 0.0649, Du = 0.16,
Dv = 0.08, dx = 1.0, dt = 1.0, n = 128) sit in Pearson 1993's λ region
(self-replicating spots) and match the Stack-B descriptor
``gray-scott-lambda-128sq-seed42-step2000`` exactly.

The initial condition is NumPy-seeded (``numpy.random.default_rng(seed)``)
to match the Stack-B IC bit-for-bit at IC time; subsequent evolution runs
through the ``@ti.kernel`` updates whose per-cell stencil is purely local
(no in-kernel reductions, no atomic scatter-add). Stack-B and Stack-D
share the same IC + algorithm; the only structural difference is the
inner update primitive (NumPy vectorised vs Taichi-DSL per-cell).

Module-level discipline (Taichi-integration IC-12):

- NO ``from __future__ import annotations`` — Taichi's
  ``@ti.kernel`` AST transformer resolves argument-type annotations at
  decoration time; PEP 563 stringification breaks it (IC-12 § 4.2,
  R-T2 inherited; Stage 0 surfaced a live empirical witness during
  MMS source-term smoke).
- NO ``-> None`` return annotation on any ``@ti.kernel`` — Taichi 1.7.4
  iterates ``ctx.func.return_type`` which is ``None`` for ``-> None``-
  annotated kernels and raises ``TypeError`` at decoration (IC-12 § 4.6,
  R-T4 inherited).

The kernel signature uses ``ti.types.ndarray()`` (NOT ``ti.template()``
field references) for the U/V/source arrays so the kernel can run at
arbitrary grid sizes — the canonical n=128 run plus the MMS-driven
gate-4 sweep at n ∈ {16, 32, 64, 128} share one decorated kernel without
re-allocating Taichi snode-tree fields per resolution. The determinism
contract is unaffected: ``ti.ndrange(n, n)`` iterates row-major, the
``cpu_max_num_threads=1`` pin from ``set_taichi_deterministic`` serialises
the loop, no in-kernel reductions or atomics are involved (per-cell
local stencil only).
"""

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Final

import numpy as np
import taichi as ti
from common_py.determinism import Config, set_taichi_deterministic


@dataclass(frozen=True)
class GrayScottParams:
    """Gray-Scott parameter set (Stack-D port; identical schema to Stack-B)."""

    n: int
    Du: float
    Dv: float
    F: float
    k: float
    dx: float
    dt: float


CANONICAL_DESCRIPTOR: Final[str] = "gray-scott-lambda-128sq-seed42-step2000"
CANONICAL_STEP_COUNT: Final[int] = 2000
CANONICAL_SEED: Final[int] = 42


def canonical_params() -> GrayScottParams:
    """Return the spec-locked parameter set for the canonical capture."""
    return GrayScottParams(
        n=128,
        Du=0.16,
        Dv=0.08,
        F=0.0367,
        k=0.0649,
        dx=1.0,
        dt=1.0,
    )


def initial_condition(p: GrayScottParams, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Build the deterministic seeded initial condition (Stack-B-bit-identical).

    Returns ``(U, V)`` arrays of shape ``(n, n)`` dtype ``float64``. The IC
    is constructed in NumPy (matching Stack-B's seeded ``default_rng``
    perturbation pattern bit-for-bit at IC time), then copied into Taichi
    ndarrays during kernel evaluation. Stack-D's cross-stack equivalence
    with Stack-B at gate-14 requires this IC to be NumPy-bit-identical.
    """
    rng = np.random.default_rng(seed)
    u = np.ones((p.n, p.n), dtype=np.float64)
    v = np.zeros((p.n, p.n), dtype=np.float64)
    half = p.n // 2
    seed_size = max(4, p.n // 16)
    lo = half - seed_size
    hi = half + seed_size
    u[lo:hi, lo:hi] = 0.5
    v[lo:hi, lo:hi] = 0.25
    noise = rng.uniform(-1e-3, 1e-3, size=(p.n, p.n))
    u = u + noise
    v = v + np.roll(noise, 1, axis=0)
    np.clip(u, 0.0, 1.0, out=u)
    np.clip(v, 0.0, 1.0, out=v)
    return u, v


_TAICHI_INITIALIZED = False


def _ensure_taichi() -> None:
    """Initialise Taichi (idempotent) per IC-11 ``arch="cpu"`` + determinism.

    Lazy first-use ``ti.init`` via ``set_taichi_deterministic``. The Taichi
    runtime is process-global; multiple calls within a process re-use the
    same initialisation (we keep a module-level ``_TAICHI_INITIALIZED``
    sentinel so the cost is paid exactly once per process). The seed passed
    to ``ti.init`` is irrelevant for this module's kernels (they consume no
    ``ti.random`` surface — RNG entry is exclusively through NumPy
    ``default_rng`` in :func:`initial_condition`), so ``seed=0`` is fine.
    """
    global _TAICHI_INITIALIZED
    if _TAICHI_INITIALIZED:
        return
    set_taichi_deterministic(Config(deterministic=True, seed=0), arch="cpu")
    _TAICHI_INITIALIZED = True


@ti.kernel
def step_diffuse_react(
    u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v: ti.types.ndarray(dtype=ti.f64, ndim=2),
    u_next: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v_next: ti.types.ndarray(dtype=ti.f64, ndim=2),
    D_u: ti.f64,
    D_v: ti.f64,
    F: ti.f64,
    k: ti.f64,
    dt: ti.f64,
    dx: ti.f64,
    n: ti.i32,
):
    """One forward-Euler Gray-Scott update (5-point Laplacian + reaction).

    Per-cell local stencil. No in-kernel reductions. No atomic scatter-add.
    ``ti.ndrange(n, n)`` iterates row-major; ``cpu_max_num_threads=1``
    serialises it. Periodic boundary conditions via modulo wrap.

    No ``-> None`` return annotation per IC-12 § 4.6.
    """
    inv_dx2 = 1.0 / (dx * dx)
    for i, j in ti.ndrange(n, n):
        ip = (i + 1) % n
        im = (i - 1 + n) % n
        jp = (j + 1) % n
        jm = (j - 1 + n) % n
        lap_u = (u[ip, j] + u[im, j] + u[i, jp] + u[i, jm] - 4.0 * u[i, j]) * inv_dx2
        lap_v = (v[ip, j] + v[im, j] + v[i, jp] + v[i, jm] - 4.0 * v[i, j]) * inv_dx2
        uvv = u[i, j] * v[i, j] * v[i, j]
        du_dt = D_u * lap_u - uvv + F * (1.0 - u[i, j])
        dv_dt = D_v * lap_v + uvv - (F + k) * v[i, j]
        u_next[i, j] = u[i, j] + dt * du_dt
        v_next[i, j] = v[i, j] + dt * dv_dt


@ti.kernel
def step_diffuse_react_with_source(
    u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v: ti.types.ndarray(dtype=ti.f64, ndim=2),
    u_next: ti.types.ndarray(dtype=ti.f64, ndim=2),
    v_next: ti.types.ndarray(dtype=ti.f64, ndim=2),
    s_u: ti.types.ndarray(dtype=ti.f64, ndim=2),
    s_v: ti.types.ndarray(dtype=ti.f64, ndim=2),
    D_u: ti.f64,
    D_v: ti.f64,
    F: ti.f64,
    k: ti.f64,
    dt: ti.f64,
    dx: ti.f64,
    n: ti.i32,
):
    """Gate-4 MMS source-injection variant.

    Adds per-cell manufactured source terms ``S_u``, ``S_v`` (already
    integrated over the time step) to the canonical Gray-Scott update.
    Consumed by :func:`reaction_diffusion_2d_stack_d.sim.sim_runner_with_source_term`
    against ``tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py``
    at gate-4 (observed order of accuracy ≥ 1.5; formal order 2.0 per
    5-point Laplacian; phase-2-plan § 1.5.1 Gate 4).

    No ``-> None`` return annotation per IC-12 § 4.6.
    """
    inv_dx2 = 1.0 / (dx * dx)
    for i, j in ti.ndrange(n, n):
        ip = (i + 1) % n
        im = (i - 1 + n) % n
        jp = (j + 1) % n
        jm = (j - 1 + n) % n
        lap_u = (u[ip, j] + u[im, j] + u[i, jp] + u[i, jm] - 4.0 * u[i, j]) * inv_dx2
        lap_v = (v[ip, j] + v[im, j] + v[i, jp] + v[i, jm] - 4.0 * v[i, j]) * inv_dx2
        uvv = u[i, j] * v[i, j] * v[i, j]
        du_dt = D_u * lap_u - uvv + F * (1.0 - u[i, j]) + s_u[i, j]
        dv_dt = D_v * lap_v + uvv - (F + k) * v[i, j] + s_v[i, j]
        u_next[i, j] = u[i, j] + dt * du_dt
        v_next[i, j] = v[i, j] + dt * dv_dt


def step(u: np.ndarray, v: np.ndarray, p: GrayScottParams) -> tuple[np.ndarray, np.ndarray]:
    """One forward-Euler Gray-Scott update via the Taichi-DSL kernel.

    Mirror of Stack-B's ``step(u, v, p)`` Python-level API, but the inner
    update primitive is :func:`step_diffuse_react` (Taichi). NumPy arrays
    flow in and out; the kernel sees ``ti.types.ndarray`` views of those
    buffers (zero-copy where the dtype + layout match).
    """
    _ensure_taichi()
    u_in = np.ascontiguousarray(u, dtype=np.float64)
    v_in = np.ascontiguousarray(v, dtype=np.float64)
    u_out = np.empty_like(u_in)
    v_out = np.empty_like(v_in)
    step_diffuse_react(u_in, v_in, u_out, v_out, p.Du, p.Dv, p.F, p.k, p.dt, p.dx, p.n)
    return u_out, v_out


def evolve(
    p: GrayScottParams,
    seed: int,
    n_steps: int,
    *,
    capture_interval: int = 100,
) -> Iterator[tuple[int, np.ndarray, np.ndarray]]:
    """Yield ``(step_index, U, V)`` at step 0 and every ``capture_interval``.

    Always yields the final step regardless of ``capture_interval``. Mirror
    of Stack-B's ``evolve`` iteration shape; the inner update primitive is
    the Taichi-DSL :func:`step_diffuse_react` kernel.
    """
    if n_steps < 0:
        raise ValueError(f"n_steps must be non-negative; got {n_steps!r}")
    if capture_interval < 1:
        raise ValueError(f"capture_interval must be >= 1; got {capture_interval!r}")
    _ensure_taichi()
    u0, v0 = initial_condition(p, seed)
    u_curr = np.ascontiguousarray(u0, dtype=np.float64)
    v_curr = np.ascontiguousarray(v0, dtype=np.float64)
    yield 0, u_curr.copy(), v_curr.copy()
    u_next = np.empty_like(u_curr)
    v_next = np.empty_like(v_curr)
    for i in range(1, n_steps + 1):
        step_diffuse_react(u_curr, v_curr, u_next, v_next, p.Du, p.Dv, p.F, p.k, p.dt, p.dx, p.n)
        u_curr, u_next = u_next, u_curr
        v_curr, v_next = v_next, v_curr
        if i % capture_interval == 0 or i == n_steps:
            yield i, u_curr.copy(), v_curr.copy()
