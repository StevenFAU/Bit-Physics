"""A2 anchor: the hand-constructed circuit computes Game of Life EXACTLY (gate 4).

* Exhaustive: all 512 (center x 8-neighbor) configurations match the direct GoL rule
  (Gardner 1970) - through BOTH the pure-Python evaluator and the Taichi kernel.
* Fixtures: blinker period-2; glider translates (1,1) per 4 steps on the 16^2 torus.
* Hard-limit exactness: binary states stay exactly binary through the kernel rollout.
"""

from __future__ import annotations

import numpy as np

from neural_ca_frontier_difflogic.forward import (
    DiffLogicConfig,
    blinker_initial_state,
    circuit_step_python,
    eval_circuit_python,
    glider_initial_state,
    gol_rule,
)
from neural_ca_frontier_difflogic.sim import run_hard_trajectory


def test_circuit_matches_gol_rule_exhaustive_512() -> None:
    """Every (center, neighborhood) configuration: circuit == rule, EXACT equality."""
    for center in (0, 1):
        for mask in range(256):
            nb = [(mask >> k) & 1 for k in range(8)]
            inputs = np.array([center, *nb], dtype=np.float64)
            out = eval_circuit_python(inputs)
            expected = float(gol_rule(center, sum(nb)))
            assert out == expected, f"center={center} mask={mask:08b}: {out} != {expected}"


def test_kernel_matches_python_evaluator_on_random_soft_states() -> None:
    """The Taichi kernel mirrors the pure-Python circuit arithmetic (soft inputs too)."""
    cfg = DiffLogicConfig(grid_n=8)
    rng = np.random.default_rng(42)
    state = rng.random((8, 8))
    expected = circuit_step_python(state)
    traj = run_hard_trajectory(cfg, state, steps=1)
    assert np.max(np.abs(traj[1] - expected)) <= 1e-15


def test_blinker_period_two() -> None:
    cfg = DiffLogicConfig()
    traj = run_hard_trajectory(cfg, blinker_initial_state(cfg), steps=4)
    assert np.array_equal(traj[0], traj[2])
    assert np.array_equal(traj[1], traj[3])
    assert not np.array_equal(traj[0], traj[1])


def test_glider_translates() -> None:
    """The glider returns to its shape translated by (1,1) every 4 steps (torus)."""
    cfg = DiffLogicConfig()
    g0 = glider_initial_state(cfg)
    traj = run_hard_trajectory(cfg, g0, steps=8)
    assert np.array_equal(traj[4], np.roll(g0, (1, 1), axis=(0, 1)))
    assert np.array_equal(traj[8], np.roll(g0, (2, 2), axis=(0, 1)))


def test_hard_limit_stays_exactly_binary() -> None:
    """Binary states remain exactly {0.0, 1.0} through the multilinear gates (hard limit)."""
    cfg = DiffLogicConfig()
    traj = run_hard_trajectory(cfg, glider_initial_state(cfg), steps=cfg.steps)
    assert np.isin(traj, (0.0, 1.0)).all()
