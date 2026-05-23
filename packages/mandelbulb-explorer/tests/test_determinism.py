"""Determinism tests (gate 10).

Phase 1 shipped these as failing-imports; the closed-form sub-phase
Stage 1 fills in the body (SHIFTED — Phase 1 stub body was
``raise NotImplementedError`` and cannot turn GREEN without
replacement; signature and import preserved).
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from mandelbulb_explorer.sim import sim_runner_seeded


def test_run_twice_bit_exact(tmp_path: Path) -> None:
    """`run_twice_and_diff` is byte-equal on a canonical seeded run."""
    verdict = run_twice_and_diff(sim_runner_seeded, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"
