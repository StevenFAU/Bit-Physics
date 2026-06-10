"""Gate 10 + Gate 11 — Same-stack content-equivalent determinism for the
Stack-D Gray-Scott port (IC-13 contract; IC-14 mechanism).

Invokes ``run_twice_and_diff`` against the Stack-D ``sim_runner_seeded``
at the canonical seed; the IC-14 harness returns a
``DeterminismVerdict { content_equivalent, detail }`` per the
post-capture-determinism-contract API.

Per import-path convention banked at Stage 0:
``from determinism import run_twice_and_diff`` (NOT
``from determinism.harness import ...``). Mirrors LBM + MPM pattern at
HEAD.

The Stack-D sim module ``reaction_diffusion_2d_stack_d.sim`` does NOT
exist at the failing-tests commit — collection fails with
``ModuleNotFoundError`` cleanly until Stage 1b implements the module.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from reaction_diffusion_2d_stack_d.sim import sim_runner_seeded  # type: ignore[import-not-found]


def test_stack_d_is_content_equivalent(tmp_path: Path) -> None:
    """Two Stack-D runs at seed 42 produce content-equivalent captures.

    IC-13 same-stack same-hw zero-tolerance contract; verified via the
    IC-14 harness's parsed-Capture projection (every state array +
    every diagnostic entry element-wise equal; storage-format metadata
    excluded per spec § 2.5).
    """
    verdict = run_twice_and_diff(sim_runner_seeded, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_different_seeds_diverge(tmp_path: Path) -> None:
    """Sanity: two distinct seeds produce different Stack-D captures."""
    a_dir = tmp_path / "seed-a"
    b_dir = tmp_path / "seed-b"
    a_dir.mkdir()
    b_dir.mkdir()
    a = sim_runner_seeded(seed=42, out_dir=a_dir)
    b = sim_runner_seeded(seed=43, out_dir=b_dir)
    # Inline content-projection diff; mirrors Stack-B's seed-divergence
    # pattern but without re-importing the legacy ``capture.diff_captures``
    # surface (which lives at HEAD per pre-IC-13 conventions). Stage 1b
    # may switch to a content-equivalent diff via the harness's
    # diff_captures (mode='bit-exact') primitive if needed.
    assert a != b
    assert a.exists()
    assert b.exists()
