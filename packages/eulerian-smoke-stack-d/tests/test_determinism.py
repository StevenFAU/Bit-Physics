"""Determinism tests (gate 10; IC-14; spec § 2.5), Stack-D.

The Stack-D Taichi-DSL sim runs under ``set_taichi_deterministic(arch='cpu')``
(cpu_max_num_threads=1, offline_cache=True). Two runs at the same seed on the
same hardware MUST produce content-equivalent Capture projections (every state
array + every diagnostic entry matches element-wise; storage-format metadata
excluded per the capture-determinism-contract).

Spec § 2.5 / sim ``determinism.md`` declares ``epsilon-same-stack-same-hw`` for
the Phase-2+ Stack-C target (pressure-projection parallel reductions); the
Stack-D Taichi CPU port OVER-ACHIEVES ``bit-exact-same-stack-same-hw`` via the
fixed Jacobi sweep count + deterministic stencils + serialised single-thread (no
atomics, no RNG) -- recorded as informational per conventions doc § F.4 (the
over-achievement does NOT promote the spec declaration).

Uses ``sim_runner_diagnostic`` (32³ x 10 steps) rather than the canonical
128³ x 500 runner so the run-twice-and-diff stays sub-second-per-invocation.

The Stack-D sim module ``eulerian_smoke_stack_d.sim`` does NOT exist at the
failing-tests commit -- collection fails with ModuleNotFoundError cleanly until
the implementation lands.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff
from eulerian_smoke_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)


def test_run_twice_epsilon_diff(tmp_path: Path) -> None:
    """Diagnostic capture reproduces content-equivalent under fixed seed (IC-14)."""
    capture_dir = tmp_path / "eulerian-smoke-stack-d-diag"
    capture_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=capture_dir)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"
