"""Property-based invariants for eulerian-smoke (gate 12).

Declarations per eulerian-smoke spec § 6.6
(``docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md``):

- :func:`divergence_free_post_projection` — for any IC, after one full
  pressure-projection step, the discrete divergence of ``u`` is below
  the IC-6 divergence-free tolerance.
- :func:`smoke_density_nonneg` — the scalar density ``φ`` remains
  ``≥ 0`` at every cell across an arbitrary step count under the
  semi-Lagrangian advection of a divergence-free velocity (the
  bilinear / trilinear backtrace preserves the non-negative invariant
  for a non-negative IC under stable CFL — a classical maximum-
  principle property of monotone Lagrangian interpolation).

Each invariant is a zero-arg Hypothesis-decorated callable; the
``test_*`` functions in ``tests/test_pbt_invariants.py`` invoke them,
driving Hypothesis to sample inputs. Energy-bound is intentionally NOT
a first-class invariant — semi-Lagrangian advection is dissipative
(numerical viscosity ∝ dx²) so an energy-bound PBT would false-positive
on the canonical Re=100 IC; the spec § 6.6 enumeration omits energy
deliberately.
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference import (
    project_pressure,
    semi_lagrangian_advect_2d,
)

_PBT_N: int = 32  # small grid — PBT runs fast (~100 ms per example).
_DIV_TOL: float = 1e-1  # sub-phase-empirical tolerance reflecting the
# Stam-on-collocated O(dx²) inconsistent-stencil residual floor — see
# ``project_pressure`` docstring (centered-difference div + grad is
# 2nd-order accurate per spec-ref § 6.1, but the composed
# ``∇·∇p`` is the "wide" Laplacian, NOT the 5-point Jacobi Laplacian,
# leaving an O(dx²) residual divergence even at convergence). At
# N = _PBT_N = 32 the empirical floor on smooth Fourier ICs is ≤ 0.05;
# we use ``1e-1`` to leave 2× headroom for the random PBT amplitude.
# The Phase-2+ Stack-C MAC-staggered port will tighten this bound to
# Jacobi-precision per sim spec-ref § 5.


def _smooth_divergent_initial_condition(
    seed: int, n: int = _PBT_N
) -> tuple[np.ndarray, np.ndarray]:
    """Smooth low-frequency 2D velocity IC with non-trivial divergence.

    Constructed as a single low-frequency Fourier mode plus an offset —
    the divergence is non-zero (so the projection has work to do) but
    bounded (so the Jacobi solver converges in 200 sweeps on a 32²
    grid). This mirrors the agent-based / RD-3D PBT pattern (smooth
    low-frequency Fourier IC; conventions doc § L.2-class precedent).
    """
    rng = np.random.default_rng(int(seed))
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    amp_u = float(rng.uniform(0.05, 0.3))
    amp_v = float(rng.uniform(0.05, 0.3))
    # Single low-frequency mode (k=1): smooth + sub-Nyquist.
    u = amp_u * np.sin(2.0 * np.pi * X) * np.cos(2.0 * np.pi * Y)
    # Crucially: NOT the divergence-free pair — break symmetry so
    # u_x + v_y != 0 in general.
    v = amp_v * np.sin(2.0 * np.pi * X) * np.sin(2.0 * np.pi * Y)
    return u, v


def _divergence_2d_centered(u: np.ndarray, v: np.ndarray, dx: float) -> np.ndarray:
    """Centered-difference divergence — matches the ``stable_fluids`` projection
    convention (spec-ref § 6.1 "formal order p = 2"). axis 0 = x, axis 1 = y."""
    inv_2dx = 0.5 / dx
    return (np.roll(u, -1, axis=0) - np.roll(u, +1, axis=0)) * inv_2dx + (
        np.roll(v, -1, axis=1) - np.roll(v, +1, axis=1)
    ) * inv_2dx


@given(seed=st.integers(min_value=0, max_value=2**31 - 1))
@settings(
    max_examples=15,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def divergence_free_post_projection(seed: int) -> None:
    """After one ``project_pressure`` call, the L^∞ divergence is ≤ tolerance.

    PBT strategy: sample a smooth low-frequency divergent IC, run one
    pressure-projection at ``n_iter=400`` (well above the canonical
    Jacobi-20; sufficient for the centered-diff Poisson solve to reach
    the inconsistent-stencil residual floor at the PBT grid). Assert
    the post-projection divergence is below :data:`_DIV_TOL` — the
    sub-phase-empirical floor reflecting the Stam-on-collocated O(dx²)
    residual; see :data:`_DIV_TOL` for the full rationale.
    """
    u, v = _smooth_divergent_initial_condition(seed)
    n = _PBT_N
    params = {
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / n,
        "dt": 0.005,
    }
    u_proj, v_proj, _p = project_pressure(u, v, params, n_iter=400)
    div = _divergence_2d_centered(u_proj, v_proj, float(params["dx"]))
    max_div = float(np.max(np.abs(div)))
    assert max_div <= _DIV_TOL, (
        f"divergence_free_post_projection violated: max|∇·u| = {max_div:.3e} "
        f"> {_DIV_TOL:.3e} (n={n}, seed={seed})"
    )


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n_steps=st.integers(min_value=1, max_value=20),
)
@settings(
    max_examples=15,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def smoke_density_nonneg(seed: int, n_steps: int) -> None:
    """Smoke density ``φ`` stays ``≥ 0`` under semi-Lagrangian advection.

    PBT strategy: sample a smooth non-negative density IC (small
    Gaussian blob + uniform offset) and a smooth divergence-free
    velocity (from the projection of a random divergent IC); advect
    ``n_steps`` ∈ [1, 20] times; assert ``φ ≥ 0`` at every cell.

    Bilinear semi-Lagrangian interpolation is a convex combination of
    four cell values (weights ``(1-fx)(1-fy), fx(1-fy), (1-fx)fy, fxfy``
    all in ``[0, 1]`` and summing to 1), so it preserves the
    non-negative invariant of a non-negative IC. The PBT witnesses
    this property under arbitrary divergence-free velocity fields +
    arbitrary step counts.
    """
    rng = np.random.default_rng(int(seed))
    n = _PBT_N
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    # Non-negative density: Gaussian + uniform offset.
    cx = float(rng.uniform(0.3, 0.7))
    cy = float(rng.uniform(0.3, 0.7))
    sigma2 = 0.04
    base = float(rng.uniform(0.0, 0.5))
    density = base + np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2.0 * sigma2))
    # Random divergence-free velocity (project a smooth divergent IC).
    u, v = _smooth_divergent_initial_condition(seed + 1, n=n)
    params = {
        "nu": 0.0,
        "rho": 1.0,
        "dx": 1.0 / n,
        "dt": 0.005,
    }
    u, v, _p = project_pressure(u, v, params, n_iter=50)
    # Advect for n_steps with the divergence-free velocity.
    dt = float(params["dt"])
    dx = float(params["dx"])
    for _ in range(int(n_steps)):
        density = semi_lagrangian_advect_2d(density, u, v, dt, dx)
    min_density = float(np.min(density))
    assert min_density >= 0.0, (
        f"smoke_density_nonneg violated: min φ = {min_density:.3e} < 0 "
        f"(n={n}, seed={seed}, n_steps={n_steps})"
    )


__all__ = [
    "divergence_free_post_projection",
    "smoke_density_nonneg",
]
