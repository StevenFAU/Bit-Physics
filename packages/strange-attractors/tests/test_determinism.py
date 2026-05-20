"""Determinism tests (gate 10).

Phase 1 shipped these as ``ModuleNotFoundError`` failing-imports; the
closed-form sub-phase Stage 1 fills in the bodies (SHIFTED — the Phase
1 stub bodies were ``raise NotImplementedError`` and cannot turn
GREEN under the sub-phase charter without body replacement; the
function signatures and the ``sim_runner_seeded`` import contract are
unchanged).
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from strange_attractors.sim import sim_runner_seeded


def test_run_twice_bit_exact(tmp_path: Path) -> None:
    """`run_twice_and_diff` is byte-equal on a canonical seeded run."""
    verdict = run_twice_and_diff(sim_runner_seeded, seed=42, tmp_dir=tmp_path)
    assert verdict.bit_exact, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_cross_seed_distinct(tmp_path: Path) -> None:
    """Distinct seeds produce distinct captures."""
    from capture import diff_captures

    a_dir = tmp_path / "seed-a"
    b_dir = tmp_path / "seed-b"
    a_dir.mkdir()
    b_dir.mkdir()
    a = sim_runner_seeded(seed=42, out_dir=a_dir)
    b = sim_runner_seeded(seed=43, out_dir=b_dir)
    diff = diff_captures(a, b, mode="bit-exact")
    assert not diff.bit_exact
