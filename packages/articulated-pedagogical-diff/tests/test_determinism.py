"""Determinism (gate-10/11): forward + gradient bit-identical across runs; registry rows present.

The autodiff gradient is a deterministic function of fixed inputs (Warp CPU single-thread serial
``wp.launch`` over the ABA recursion + the length-1 backward seed; seed-pinned config); MEASURE then
declare per charter §2.2 (no EFECT — no training-loss distribution). Registry rows
``tools/testkit/determinism/registry.toml`` ``[rigid-body.articulated-pedagogical-diff.*]`` (a 1b
deliverable — RED until authored).
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import numpy as np
from articulated_pedagogical.model import make_simple_pendulum

from articulated_pedagogical_diff.forward import ArticulatedDiffConfig
from articulated_pedagogical_diff.sim import PendulumStateRecovery, qddot_gradient


def _forward_and_grad() -> tuple[np.ndarray, float]:
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    cfg = ArticulatedDiffConfig(q0=0.4, qd0=0.0, dt=0.01, steps=30)
    prob = PendulumStateRecovery(chain, cfg)
    final = prob.final_state(np.array([cfg.q0]), np.array([cfg.qd0]))
    _, g = qddot_gradient(chain, np.array([0.6]), np.array([0.0]), wrt="q")
    return final, g


def test_forward_bit_identical_across_runs() -> None:
    f1, _ = _forward_and_grad()
    f2, _ = _forward_and_grad()
    assert np.array_equal(f1, f2)


def test_gradient_bit_identical_across_runs() -> None:
    _, g1 = _forward_and_grad()
    _, g2 = _forward_and_grad()
    assert g1 == g2


def test_determinism_registry_rows_present() -> None:
    registry = (
        Path(__file__).resolve().parents[3] / "tools" / "testkit" / "determinism" / "registry.toml"
    )
    data = tomllib.loads(registry.read_text())
    rb = data["rigid-body"]
    for surface in (
        "articulated-pedagogical-diff.forward",
        "articulated-pedagogical-diff.gradient",
    ):
        head, tail = surface.split(".")
        row = rb[head][tail]
        assert row["class"] == "bit-exact"
        assert row["scope"] == "same-stack-same-hw"
        assert row["seed_pinned"] is True
