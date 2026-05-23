"""Determinism tests (gate 10).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the agent-based sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1: the stub body
cannot turn GREEN under the charter's gate-4..gate-13 GREEN target;
function signatures, the imported ``sim_runner_seeded`` Protocol
contract, and the test file's import surface are preserved). Gate 10
requires both Appendix D § D.2.3 descriptors to be bit-exact under
``run_twice_and_diff``.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from boids_3d.sim import sim_runner_seeded, sim_runner_seeded_3agent


def test_run_twice_bit_exact(tmp_path: Path) -> None:
    """Both canonical captures reproduce byte-for-byte under fixed seed."""
    flock_dir = tmp_path / "flock-1000"
    flock_dir.mkdir()
    verdict_flock = run_twice_and_diff(sim_runner_seeded, seed=42, tmp_dir=flock_dir)
    assert verdict_flock.content_equivalent, verdict_flock.detail
    assert verdict_flock.detail == "captures match exactly"
    canonical_dir = tmp_path / "flock-3"
    canonical_dir.mkdir()
    verdict_canonical = run_twice_and_diff(
        sim_runner_seeded_3agent, seed=42, tmp_dir=canonical_dir
    )
    assert verdict_canonical.content_equivalent, verdict_canonical.detail
    assert verdict_canonical.detail == "captures match exactly"
