"""Determinism gate — run-twice byte-identity contract (spec-ref § 8).

``bit-exact-same-hw``: lex-order single-threaded kernels, fixed-cap
Jacobi, deterministic regularizer sweeps, seeded ICs (see the
``pic_flip.sim`` module docstring for the seven-clause declaration).
Uses the diagnostic-tier runner (12-cube, 8 steps).
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from pic_flip.sim import (
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import
)


def test_run_twice_bit_exact(tmp_path: Path) -> None:
    out_dir = tmp_path / "pic-flip-diag"
    out_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=out_dir)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"
