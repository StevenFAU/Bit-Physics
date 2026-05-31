"""Oracle-grounded MMS self-consistency (closes 4.1 §1.D `reaction_diffusion_2d_mms`).

The manufactured-solution module ``tools/testkit/code_verification/mms/solutions/
reaction_diffusion_2d/`` was surfaced at Phase-4.1 §1.D as having no dedicated
mutation target. This sim registers ``reaction_diffusion_2d_mms`` (mutmut-config) and
grounds it with these oracle tests:

* the source term computed analytically by ``source_term`` matches the residual
  formed from a **finite-difference** evaluation of ``evaluate`` (independent of the
  analytic derivative formulas — kills mutants in both methods);
* the manufactured solution is bounded in ``[1/4, 3/4]`` and hits known closed-form
  values at canonical points.

This is the diff variant's forward-physics MMS anchor; the diff forward reproduces
the reference's O(h²) convergence via the WU-F forward-equivalence test.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

_MMS_DIR = Path(__file__).resolve().parents[3] / "tools/testkit/code_verification/mms/solutions"
if str(_MMS_DIR) not in sys.path:
    sys.path.insert(0, str(_MMS_DIR))

from reaction_diffusion_2d.solution import (  # type: ignore[import-not-found]  # noqa: E402
    GrayScott2DSolution,
)


def _grid(n: int, L: float) -> tuple[np.ndarray, np.ndarray, float]:
    # The manufactured sin(pi x / L) has period 2L, so the periodic domain spans
    # [0, 2L) (the reference uses L_domain = 2*mms.L) for the np.roll Laplacian to
    # be a true periodic stencil.
    domain = 2.0 * L
    h = domain / n
    coords = (np.arange(n) + 0.5) * h
    x, y = np.meshgrid(coords, coords, indexing="ij")
    return x, y, h


def test_manufactured_solution_bounded() -> None:
    sol = GrayScott2DSolution()
    x, y, _ = _grid(32, sol.L)
    for t in (0.0, 0.3, 1.0):
        u, v = sol.evaluate(x, y, t)
        assert u.min() >= 0.25 - 1e-12 and u.max() <= 0.75 + 1e-12
        assert v.min() >= 0.25 - 1e-12 and v.max() <= 0.75 + 1e-12


def test_canonical_point_values() -> None:
    sol = GrayScott2DSolution(L=1.0)
    z = np.zeros((1, 1))
    u0, v0 = sol.evaluate(z, z, 0.0)
    assert abs(float(u0[0, 0]) - 0.5) < 1e-12  # (sin0·cos0·cos0 + 2)/4
    assert abs(float(v0[0, 0]) - 0.5) < 1e-12
    half = np.full((1, 1), 0.5)  # x = L/2 -> sin(pi/2)=1
    uh, _ = sol.evaluate(half, z, 0.0)
    assert abs(float(uh[0, 0]) - 0.75) < 1e-12


def test_source_term_matches_finite_difference_residual() -> None:
    """Independent FD of ``evaluate`` reproduces ``source_term`` (oracle-grounded)."""
    sol = GrayScott2DSolution(L=1.0)
    n, t = 64, 0.4
    x, y, h = _grid(n, sol.L)
    u, v = sol.evaluate(x, y, t)

    # FD time-derivative (central, independent of the analytic u_t formula)
    dt = 1e-5
    u_tp, v_tp = sol.evaluate(x, y, t + dt)
    u_tm, v_tm = sol.evaluate(x, y, t - dt)
    u_t = (u_tp - u_tm) / (2 * dt)
    v_t = (v_tp - v_tm) / (2 * dt)

    # FD periodic Laplacian (central 5-point, independent of the analytic lap formula)
    def lap(f: np.ndarray) -> np.ndarray:
        return (
            np.roll(f, 1, 0) + np.roll(f, -1, 0) + np.roll(f, 1, 1) + np.roll(f, -1, 1) - 4.0 * f
        ) / (h * h)

    lap_u, lap_v = lap(u), lap(v)
    s_u_fd = u_t - sol.D_u * lap_u + u * v * v - sol.F * (1.0 - u)
    s_v_fd = v_t - sol.D_v * lap_v - u * v * v + (sol.F + sol.k) * v

    s_u, s_v = sol.source_term(x, y, t)
    # O(h²) spatial + O(dt²) temporal truncation; h=1/64 -> ~2e-3
    assert float(np.max(np.abs(s_u - s_u_fd))) < 5e-3
    assert float(np.max(np.abs(s_v - s_v_fd))) < 5e-3
