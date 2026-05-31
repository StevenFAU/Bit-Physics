"""Determinism (gate-10/11): the engine step + rollout are bit-identical across runs.

The reintegration scatter uses ``ti.atomic_add``, but Taichi CPU single-thread serial fixes the
accumulation order → bit-identical run-to-run (``atomic_ops = "sum-only"``). **Distinct from the
mass INVARIANT**, which is conserved only to summation roundoff (~Nε). MEASURE then declare per
charter §2.2 (no EFECT). Registry row ``tools/testkit/determinism/registry.toml``
``[continuous-ca.flow-lenia]`` (a 1b deliverable — RED until authored).
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import numpy as np

from flow_lenia.forward import FlowLeniaConfig
from flow_lenia.sim import FlowLeniaSim


def _rollout(steps: int) -> np.ndarray:
    sim = FlowLeniaSim(FlowLeniaConfig(grid=32, seed=42, steps=steps))
    for _ in range(steps):
        sim.step()
    return sim.mass_field()


def test_step_bit_identical_across_runs() -> None:
    a = FlowLeniaSim(FlowLeniaConfig(grid=32, seed=42))
    b = FlowLeniaSim(FlowLeniaConfig(grid=32, seed=42))
    a.step()
    b.step()
    assert np.array_equal(a.mass_field(), b.mass_field())


def test_rollout_bit_identical_across_runs() -> None:
    assert np.array_equal(_rollout(10), _rollout(10))


def test_determinism_registry_row_present() -> None:
    registry = (
        Path(__file__).resolve().parents[3] / "tools" / "testkit" / "determinism" / "registry.toml"
    )
    data = tomllib.loads(registry.read_text())
    row = data["continuous-ca"]["flow-lenia"]
    assert row["class"] == "bit-exact"
    assert row["scope"] == "same-stack-same-hw"
    assert row["atomic_ops"] == "sum-only"
    assert row["seed_pinned"] is True
