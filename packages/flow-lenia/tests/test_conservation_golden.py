"""Gate-4 conservation golden table — ≥3 independent anchors (mass-conservative Flow Lenia).

The golden table ``tools/testkit/golden/tables/flow-lenia-conservation.json`` stores measured
quantities of the Taichi reintegration-tracking engine, each verified against an independent
reference:

* **A1** exact mass conservation by construction: ``Σ A_{t+dt} == Σ A_t`` to summation roundoff
  (~Nε; NOT bit-exact — the honest tolerance). Source: reintegration mass balance (Σ weights = 1).
* **A2** non-negativity: bilinear-splat of non-negative mass with non-negative weights → ``A ≥ 0``.
* **A3** zero-flow identity: ``F ≡ 0`` ⇒ ``A`` unchanged pointwise (EXACT). Source: advection by
  zero velocity = identity.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from flow_lenia import _taichi_kernels as _k
from flow_lenia.forward import FlowLeniaConfig, initial_mass, total_mass
from flow_lenia.sim import FlowLeniaSim

ALGORITHM = "flow-lenia-conservation"


def _engine_step(cfg: FlowLeniaConfig, a: np.ndarray) -> np.ndarray:
    sim = FlowLeniaSim(cfg)
    sim._a = np.ascontiguousarray(a, dtype=np.float64)
    sim.step()
    return sim.mass_field()


def conservation_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the engine's measured conservation quantity."""
    cfg = FlowLeniaConfig(grid=inputs["grid"], seed=inputs["seed"])
    a = initial_mass(cfg)
    anchor = inputs["anchor"]
    if anchor == "a1-mass":
        nxt = _engine_step(cfg, a)
        m0 = total_mass(a)
        return {"mass_rel_drift": abs(total_mass(nxt) - m0) / abs(m0)}
    if anchor == "a2-nonneg":
        return {"min_mass": float(np.min(_engine_step(cfg, a)))}
    if anchor == "a3-zeroflow":
        n = cfg.grid
        z = np.zeros((n, n), dtype=np.float64)
        out = np.zeros((n, n), dtype=np.float64)
        _k.reintegrate(np.ascontiguousarray(a), z, z, out, n, float(cfg.dt))
        return {"zeroflow_residual": float(np.max(np.abs(out - a)))}
    raise KeyError(f"unknown anchor {anchor!r}")


def test_conservation_golden_table(golden_table: Path) -> None:
    result = verify_against_table(golden_table, conservation_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_mass_conserved_to_summation_roundoff() -> None:
    """A1: mass conserved to summation roundoff over a multi-step rollout (NOT bit-exact)."""
    cfg = FlowLeniaConfig(grid=32, seed=42, steps=20)
    sim = FlowLeniaSim(cfg)
    m0 = total_mass(sim.mass_field())
    for _ in range(cfg.steps):
        sim.step()
        assert abs(total_mass(sim.mass_field()) - m0) <= 1e-10 * abs(m0)


def test_a2_mass_non_negative() -> None:
    """A2: the reintegration step keeps the mass field non-negative."""
    for seed in (42, 7):
        cfg = FlowLeniaConfig(grid=32, seed=seed)
        assert float(np.min(_engine_step(cfg, initial_mass(cfg)))) >= 0.0


def test_a3_zero_flow_identity_exact() -> None:
    """A3: zero flow ⇒ the mass field is unchanged pointwise (EXACT)."""
    cfg = FlowLeniaConfig(grid=32, seed=42)
    a = initial_mass(cfg)
    n = cfg.grid
    z = np.zeros((n, n), dtype=np.float64)
    out = np.zeros((n, n), dtype=np.float64)
    _k.reintegrate(np.ascontiguousarray(a), z, z, out, n, float(cfg.dt))
    assert np.array_equal(out, a)
