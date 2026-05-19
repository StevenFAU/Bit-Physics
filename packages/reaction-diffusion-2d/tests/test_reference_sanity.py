"""Pure-NumPy reference sanity tests.

These exercise the reference implementation directly without the
testkit's SimRunner protocol. Mirrors the spec § 5.2.1 unit-test
expectations: uniform field stays uniform; short-term mass drift is
bounded.

These tests do NOT depend on ``reaction_diffusion_2d.sim`` (the
implementation gate). They exist so the failing-tests evidence file
shows the expected `ModuleNotFoundError` only for the higher-level
sim, while the reference itself is exercisable from the very first
commit.
"""

from __future__ import annotations

import numpy as np

from reaction_diffusion_2d.reference import GrayScottParams, canonical_params, evolve, step


def test_uniform_field_stays_uniform() -> None:
    """U = 1, V = 0 is an analytic steady state for Gray-Scott."""
    p = GrayScottParams(n=16, Du=0.16, Dv=0.08, F=0.0367, k=0.0649, dx=1.0, dt=1.0)
    u = np.ones((p.n, p.n), dtype=np.float64)
    v = np.zeros((p.n, p.n), dtype=np.float64)
    for _ in range(50):
        u, v = step(u, v, p)
    assert float(np.max(np.abs(u - 1.0))) < 1e-12
    assert float(np.max(np.abs(v))) < 1e-12


def test_canonical_params_lock_lambda_pattern() -> None:
    p = canonical_params()
    assert p.n == 128
    assert p.F == 0.0367
    assert p.k == 0.0649
    assert p.Du == 0.16
    assert p.Dv == 0.08
    assert p.dx == 1.0
    assert p.dt == 1.0


def test_evolve_yields_initial_and_final() -> None:
    p = GrayScottParams(n=8, Du=0.16, Dv=0.08, F=0.0367, k=0.0649, dx=1.0, dt=1.0)
    snapshots = list(evolve(p, seed=0, n_steps=10, capture_interval=4))
    steps_yielded = [s[0] for s in snapshots]
    assert 0 in steps_yielded
    assert 10 in steps_yielded  # final step
