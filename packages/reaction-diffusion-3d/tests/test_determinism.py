"""Determinism tests (gate 11).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body; the
continuous-CA-rd3d sub-phase Stage 1 fills in the body (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1 + agent-based
sub-phase Stage 1 audit S1; the imported ``sim_runner_seeded`` Protocol
contract is preserved). Gate 11 requires the canonical descriptor at
Appendix D § D.2.3 (``gray-scott-lambda-64cube-seed42-step2000``) to be
bit-exact under ``run_twice_and_diff``.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from reaction_diffusion_3d.sim import sim_runner_seeded  # type: ignore[import-not-found]


def test_run_twice_bit_exact(tmp_path: Path) -> None:
    """Canonical 64³ RD-3D capture reproduces byte-for-byte under fixed seed."""
    capture_dir = tmp_path / "rd3d-canonical"
    capture_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_seeded, seed=42, tmp_dir=capture_dir)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"
