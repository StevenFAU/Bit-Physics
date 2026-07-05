"""Gate 11 — 2-run determinism witness for the ISF reference."""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from schrodinger_smoke.reference.isf import IsfConfig, run_isf
from schrodinger_smoke.sim import sim_runner_diagnostic, sim_runner_seeded  # noqa: F401


def test_run_twice_epsilon_diff(tmp_path: Path) -> None:
    """Diagnostic capture reproduces byte-for-byte under fixed seed.

    The gated state is a pure grid solver (FFT + gather, no scatter, no
    atomics — spec-ref.md § 8), so the f64 NumPy reference over-achieves
    bit-exact same-stack-same-hw; the WGSL frontend's declared boundary is
    device-scoped bit-exact / cross-device distributional.
    """
    capture_dir = tmp_path / "schrodinger-smoke-diag"
    capture_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=capture_dir)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_run_isf_internal_witness() -> None:
    """``run_isf`` asserts its own 2-run bit-identity witness (spec § 5) and
    records the trajectory sha of the witnessed run."""
    res = run_isf(IsfConfig(n=24, steps=6, capture_every=3))
    assert res.determinism_witness_sha256
    assert len(res.determinism_witness_sha256) == 64
