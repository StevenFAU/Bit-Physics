"""Determinism (gate-10/11): the engine force + a short rollout are bit-identical across runs.

The force kernel is a deterministic function of fixed inputs (Taichi CPU single-thread serial; no
atomics; explicit f64 accumulators; seed-pinned IC); MEASURE then declare per charter §2.2 (no EFECT
— no training-loss distribution). **Pointwise-vs-trajectory:** pointwise determinism holds
run-to-run; the GOLDEN is the force/symmetry invariant, not the trajectory (Particle Lenia rollouts
can be sensitive). Registry row ``tools/testkit/determinism/registry.toml``
``[continuous-ca.particle-lenia]`` (a 1b deliverable — RED until authored).
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import numpy as np

from particle_lenia.forward import ParticleLeniaConfig, initial_positions
from particle_lenia.sim import ParticleLeniaSim


def _rollout(steps: int) -> np.ndarray:
    cfg = ParticleLeniaConfig(n_particles=24, seed=42, steps=steps)
    sim = ParticleLeniaSim(cfg)
    for _ in range(steps):
        sim.step()
    return sim.positions()


def test_force_bit_identical_across_runs() -> None:
    cfg = ParticleLeniaConfig(n_particles=24, seed=42)
    pos = initial_positions(cfg)
    f1 = ParticleLeniaSim(cfg).compute_force(pos)
    f2 = ParticleLeniaSim(cfg).compute_force(pos)
    assert np.array_equal(f1, f2)


def test_rollout_bit_identical_across_runs() -> None:
    assert np.array_equal(_rollout(10), _rollout(10))


def test_determinism_registry_row_present() -> None:
    registry = (
        Path(__file__).resolve().parents[3] / "tools" / "testkit" / "determinism" / "registry.toml"
    )
    data = tomllib.loads(registry.read_text())
    row = data["continuous-ca"]["particle-lenia"]
    assert row["class"] == "bit-exact"
    assert row["scope"] == "same-stack-same-hw"
    assert row["atomic_ops"] == "none"
    assert row["seed_pinned"] is True
