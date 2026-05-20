"""NumPy reference — Gray-Scott reaction-diffusion 3D (continuous-CA sub-phase).

Spec § 5.2.1; algebraic derivation at
``docs/sim-specs/continuous-ca/reaction-diffusion-3d/algebraic.md`` § 2.

The reference scheme is explicit forward Euler in time + 7-point centered
Laplacian in space with periodic boundary conditions:

    L7[u]_{i,j,k} = (u_{i+1,j,k} + u_{i-1,j,k}
                   + u_{i,j+1,k} + u_{i,j-1,k}
                   + u_{i,j,k+1} + u_{i,j,k-1}
                   - 6 u_{i,j,k}) / dx^2

    u^{n+1} = u^n + dt * (D_u * L7[u^n] - u^n (v^n)^2 + F (1 - u^n) + S_u)
    v^{n+1} = v^n + dt * (D_v * L7[v^n] + u^n (v^n)^2 - (F + k) v^n  + S_v)

with ``S_u, S_v`` the (optional) manufactured-source terms supplied by the
MMS pipeline at code-verification time (gate 5). For the canonical
descriptor capture ``S_u = S_v = 0`` everywhere.

Periodic BCs are implemented via ``np.roll`` over the three spatial axes;
no boundary copy / ghost-zone exchange is required because the stencil is
constructed entirely from rolled neighbors. This keeps the implementation
elementwise-NumPy (no BLAS matmul, no ``np.add.at`` over unsorted indices)
and the per-step reduction shape stable across processes on the same
hardware — see ``reaction_diffusion_3d.sim`` for the determinism-strategy
declaration that this kernel underwrites.

Canonical parameters (Pearson 1993 λ-region) — locked at the
``gray-scott-lambda-64cube-seed42-step2000`` descriptor per Appendix D
§ D.2.3:

    n=64, D_u=0.16, D_v=0.08, F=0.0367, k=0.0649, dx=1.0, dt=1.0

For Δx = 1, the CFL ceiling is Δt ≤ Δx² / (2·3·max(D_u, D_v)) ≈ 1.04 —
the canonical Δt = 1 sits just inside the explicit-Euler stability
envelope (see ``algebraic.md`` § 2). The MMS-pipeline grid sweeps the
unit cube ([0, 1]³) at smaller dx and proportionally smaller dt; see
``packages/reaction-diffusion-3d/tests/test_mms_convergence.py`` for
the refinement ladder and CFL safety-factor choice.
"""

from __future__ import annotations

from typing import Any, Final

import numpy as np
from numpy.typing import NDArray

Array3D = NDArray[np.float64]

CANONICAL_DESCRIPTOR: Final[str] = "gray-scott-lambda-64cube-seed42-step2000"
CANONICAL_STEP_COUNT: Final[int] = 2000
CANONICAL_SEED: Final[int] = 42
CANONICAL_N: Final[int] = 64
CANONICAL_DX: Final[float] = 1.0
CANONICAL_DT: Final[float] = 1.0


def canonical_params() -> dict[str, Any]:
    """Return the spec-locked Pearson-1993 λ-region parameters as a dict.

    Returns a plain ``dict`` (not a frozen dataclass) per probe § 5 to keep
    the public-surface schema simple for downstream readers (manifest /
    JSON / mutmut). Keys: ``n, Du, Dv, F, k, dx, dt``.
    """
    return {
        "n": CANONICAL_N,
        "Du": 0.16,
        "Dv": 0.08,
        "F": 0.0367,
        "k": 0.0649,
        "dx": CANONICAL_DX,
        "dt": CANONICAL_DT,
    }


def _laplacian_7point(field: Array3D, inv_dx2: float) -> Array3D:
    """7-point centered Laplacian on a 3D periodic grid (six np.roll terms)."""
    lap: Array3D = (
        np.roll(field, +1, axis=0)
        + np.roll(field, -1, axis=0)
        + np.roll(field, +1, axis=1)
        + np.roll(field, -1, axis=1)
        + np.roll(field, +1, axis=2)
        + np.roll(field, -1, axis=2)
        - 6.0 * field
    ) * inv_dx2
    return lap


def gray_scott_step_with_source(
    u: Array3D,
    v: Array3D,
    params: dict[str, Any],
    source: tuple[Array3D, Array3D] | None = None,
) -> tuple[Array3D, Array3D]:
    """One forward-Euler Gray-Scott step on a periodic 3D cube.

    Args:
        u: current U field, shape (n, n, n), dtype float64.
        v: current V field, same shape/dtype.
        params: dict with keys ``Du, Dv, F, k, dx, dt`` (e.g. from
            :func:`canonical_params`).
        source: optional ``(S_u, S_v)`` tuple of arrays shaped like ``u``.
            ``None`` is equivalent to zero sources — the canonical
            evolution path. The MMS pipeline supplies the manufactured
            sources here for gate-5 code verification.

    Returns:
        ``(u_next, v_next)`` arrays of the same shape/dtype as the inputs.
    """
    Du = float(params["Du"])
    Dv = float(params["Dv"])
    F = float(params["F"])
    k = float(params["k"])
    dx = float(params["dx"])
    dt = float(params["dt"])
    inv_dx2 = 1.0 / (dx * dx)

    lap_u = _laplacian_7point(u, inv_dx2)
    lap_v = _laplacian_7point(v, inv_dx2)
    uvv = u * v * v
    du_dt = Du * lap_u - uvv + F * (1.0 - u)
    dv_dt = Dv * lap_v + uvv - (F + k) * v
    if source is not None:
        s_u, s_v = source
        du_dt = du_dt + s_u
        dv_dt = dv_dt + s_v
    u_next: Array3D = u + dt * du_dt
    v_next: Array3D = v + dt * dv_dt
    return u_next, v_next


def initial_condition(params: dict[str, Any], seed: int) -> tuple[Array3D, Array3D]:
    """Build the canonical seeded initial condition for the λ-region descriptor.

    The IC mirrors RD-2D's spec-standard pattern: U ≈ 1 everywhere, V ≈ 0
    with a centred V-seed (cube of half-extent ``max(4, n // 16)`` at
    ``U = 0.5, V = 0.25``), plus a small seeded uniform perturbation drawn
    from ``np.random.default_rng(seed)``. Values are clipped to ``[0, 1]``.

    This is the only place an RNG draw enters the canonical capture path;
    every subsequent ``gray_scott_step_with_source`` call is deterministic
    given the IC. See :mod:`reaction_diffusion_3d.sim` for the full
    determinism-strategy declaration.
    """
    n = int(params["n"])
    rng = np.random.default_rng(int(seed))
    u = np.ones((n, n, n), dtype=np.float64)
    v = np.zeros((n, n, n), dtype=np.float64)
    half = n // 2
    seed_size = max(4, n // 16)
    lo = half - seed_size
    hi = half + seed_size
    u[lo:hi, lo:hi, lo:hi] = 0.5
    v[lo:hi, lo:hi, lo:hi] = 0.25
    # Tiny seeded perturbation so the determinism harness exercises a real
    # IC dependency on `seed`. Mirror the RD-2D pattern (rolled copy for V)
    # so U / V are not bit-identical at t=0.
    noise = rng.uniform(-1e-3, 1e-3, size=(n, n, n))
    u = u + noise
    v = v + np.roll(noise, 1, axis=0)
    np.clip(u, 0.0, 1.0, out=u)
    np.clip(v, 0.0, 1.0, out=v)
    return u, v


def evolve(seed: int, n_steps: int) -> tuple[Array3D, Array3D]:
    """Evolve the canonical IC for ``n_steps`` and return the final ``(u, v)``.

    Probe § 5 contract: ``evolve(seed, n_steps) -> (u_final, v_final)`` —
    final state only, no intermediates. Sim-side capture (with
    intermediate snapshots) is the job of
    :func:`reaction_diffusion_3d.sim.sim_runner_seeded`, which mirrors
    this kernel's update with an explicit capture cadence.
    """
    if n_steps < 0:
        raise ValueError(f"n_steps must be non-negative; got {n_steps!r}")
    params = canonical_params()
    u, v = initial_condition(params, seed)
    for _ in range(int(n_steps)):
        u, v = gray_scott_step_with_source(u, v, params, source=None)
    return u, v


__all__ = [
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_DT",
    "CANONICAL_DX",
    "CANONICAL_N",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT",
    "canonical_params",
    "evolve",
    "gray_scott_step_with_source",
    "initial_condition",
]
