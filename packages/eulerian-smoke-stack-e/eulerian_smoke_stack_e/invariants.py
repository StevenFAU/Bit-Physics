"""Property-based invariants for eulerian-smoke Stack-E (gate 11).

Ported from the Phase-1 reference invariants.py (spec-ref § 6.6); the algebra is
identical, so the invariants hold for the Stack-E NVIDIA Warp ``project_pressure``
/ ``semi_lagrangian_advect_2d`` up to the FP-accumulation residual:

- :func:`divergence_free_post_projection` -- after one pressure-projection, the
  discrete L-inf divergence of ``u`` is below the sub-phase-empirical
  collocated-grid residual floor (the Stam-on-collocated O(dx^2) inconsistent-
  stencil floor; see ``stable_fluids_warp.project_pressure``).
- :func:`smoke_density_nonneg` -- the scalar density ``phi`` stays ``>= 0`` under
  semi-Lagrangian advection of a divergence-free velocity (a maximum-principle
  property of the bilinear convex-combination backtrace).

Each invariant is a zero-arg Hypothesis-decorated callable at ``max_examples=50``
(gate-11 ``n_examples >= 50``); the ``test_*`` functions in
``tests/test_pbt_invariants.py`` invoke them. Energy-bound is intentionally NOT a
first-class invariant -- SL advection is dissipative, so an energy-bound PBT would
false-positive (spec § 6.6 omits energy deliberately).
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference import (
    project_pressure,
    semi_lagrangian_advect_2d,
)

_PBT_N: int = 32  # small grid -- PBT runs fast.
_PBT_EXAMPLES: int = 50  # gate-11: n_examples >= 50.
_DIV_TOL: float = 1e-1  # sub-phase-empirical floor for the Stam-on-collocated
# O(dx^2) inconsistent-stencil residual divergence at N=_PBT_N=32 (empirical
# floor on smooth Fourier ICs is <= 0.05; 1e-1 leaves 2x headroom for the random
# PBT amplitude). Ported verbatim from the Phase-1 reference; the Phase-2+
# Stack-C MAC-staggered port will tighten this to Jacobi-precision.


def _smooth_divergent_initial_condition(
    seed: int, n: int = _PBT_N
) -> tuple[np.ndarray, np.ndarray]:
    """Smooth low-frequency 2D velocity IC with non-trivial divergence."""
    rng = np.random.default_rng(int(seed))
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    amp_u = float(rng.uniform(0.05, 0.3))
    amp_v = float(rng.uniform(0.05, 0.3))
    u = amp_u * np.sin(2.0 * np.pi * X) * np.cos(2.0 * np.pi * Y)
    v = amp_v * np.sin(2.0 * np.pi * X) * np.sin(2.0 * np.pi * Y)
    return u, v


def _divergence_2d_centered(u: np.ndarray, v: np.ndarray, dx: float) -> np.ndarray:
    """Centered-difference divergence (matches the projection convention)."""
    inv_2dx = 0.5 / dx
    return (np.roll(u, -1, axis=0) - np.roll(u, +1, axis=0)) * inv_2dx + (
        np.roll(v, -1, axis=1) - np.roll(v, +1, axis=1)
    ) * inv_2dx


@given(seed=st.integers(min_value=0, max_value=2**31 - 1))
@settings(
    max_examples=_PBT_EXAMPLES,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def divergence_free_post_projection(seed: int) -> None:
    """After one ``project_pressure`` call, the L-inf divergence is <= tolerance."""
    u, v = _smooth_divergent_initial_condition(seed)
    n = _PBT_N
    params = {"nu": 0.01, "rho": 1.0, "dx": 1.0 / n, "dt": 0.005}
    u_proj, v_proj, _p = project_pressure(u, v, params, n_iter=400)
    div = _divergence_2d_centered(u_proj, v_proj, float(params["dx"]))
    max_div = float(np.max(np.abs(div)))
    assert max_div <= _DIV_TOL, (
        f"divergence_free_post_projection violated: max|div u| = {max_div:.3e} "
        f"> {_DIV_TOL:.3e} (n={n}, seed={seed})"
    )


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n_steps=st.integers(min_value=1, max_value=20),
)
@settings(
    max_examples=_PBT_EXAMPLES,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def smoke_density_nonneg(seed: int, n_steps: int) -> None:
    """Smoke density ``phi`` stays ``>= 0`` under semi-Lagrangian advection."""
    rng = np.random.default_rng(int(seed))
    n = _PBT_N
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    cx = float(rng.uniform(0.3, 0.7))
    cy = float(rng.uniform(0.3, 0.7))
    sigma2 = 0.04
    base = float(rng.uniform(0.0, 0.5))
    density = base + np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2.0 * sigma2))
    u, v = _smooth_divergent_initial_condition(seed + 1, n=n)
    params = {"nu": 0.0, "rho": 1.0, "dx": 1.0 / n, "dt": 0.005}
    u, v, _p = project_pressure(u, v, params, n_iter=50)
    dt = float(params["dt"])
    dx = float(params["dx"])
    for _ in range(int(n_steps)):
        density = semi_lagrangian_advect_2d(density, u, v, dt, dx)
    min_density = float(np.min(density))
    assert min_density >= 0.0, (
        f"smoke_density_nonneg violated: min phi = {min_density:.3e} < 0 "
        f"(n={n}, seed={seed}, n_steps={n_steps})"
    )


__all__ = [
    "divergence_free_post_projection",
    "smoke_density_nonneg",
]
