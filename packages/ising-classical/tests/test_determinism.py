"""Class (b) — Determinism (D-WEBGPU-DET, Layer 1: CI-visible oracle).

Block-3's ``run_twice_and_diff`` against the Python sim runner. The
WebGPU sim's ``bit-exact-same-hw`` declaration is exercised LOCALLY per
spec § 7.8 (Layer 2); CI verifies the NumPy reference's determinism
(the load-bearing oracle, Layer 1).

Stage 1a: ``sim_runner_seeded`` raises ``NotImplementedError``; the
harness call propagates it. Stage 1b inverts to GREEN (bit-exact).
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff


def _load_sim() -> object:
    """Deferred import — module imports cleanly at Stage 1a (shells)."""
    from ising_classical import sim

    return sim


def test_numpy_reference_is_bit_deterministic(tmp_path: Path) -> None:
    sim = _load_sim()
    verdict = run_twice_and_diff(sim.sim_runner_seeded, seed=42, tmp_dir=tmp_path)  # type: ignore[attr-defined]
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_different_seeds_diverge(tmp_path: Path) -> None:
    """Sanity: two distinct seeds produce different spin captures."""
    sim = _load_sim()
    a_dir = tmp_path / "seed-a"
    b_dir = tmp_path / "seed-b"
    a_dir.mkdir()
    b_dir.mkdir()
    a = sim.sim_runner_seeded(seed=42, out_dir=a_dir)  # type: ignore[attr-defined]
    b = sim.sim_runner_seeded(seed=43, out_dir=b_dir)  # type: ignore[attr-defined]
    from capture import diff_captures

    diff = diff_captures(a, b, mode="bit-exact")
    assert not diff.bit_exact
