"""Gate 10 — Same-stack content-equivalent determinism for the Stack-D
sph-water port (IC-13 contract; IC-14 mechanism).

Invokes ``run_twice_and_diff`` against the Stack-D ``sim_runner_diagnostic``
at the canonical seed; the IC-14 harness returns a
``DeterminismVerdict { content_equivalent, detail }``. Uses the diagnostic-tier
runner (64 particles x 8 steps) rather than the canonical
``sim_runner_seeded`` (100K x 1000 steps) to avoid paying the canonical capture
cost on every pytest invocation (R-T5).

Stage 0 Task 0.5 empirically confirmed the Taichi-cpu DFSPH-shape pipeline is
bit-exact run-twice (``max|Δ|=0.0``) under ``cpu_max_num_threads=1`` (which
serialises ``ti.atomic_add`` grid insertion). The same-stack posture (bit-exact
vs epsilon) is a Stage-1b determinism-docstring design decision per § 1.4.1.

Per import-path convention banked at Stage 0:
``from determinism import run_twice_and_diff`` (NOT
``from determinism.harness import ...``). Mirrors LBM + MPM + RD-2D-Stack-D.

The Stack-D sim module ``sph_water_stack_d.sim`` does NOT exist at the
failing-tests commit — collection fails with ``ModuleNotFoundError`` cleanly
until Stage 1b implements the module.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from sph_water_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_run_twice_content_equivalent(tmp_path: Path) -> None:
    """Two Stack-D diagnostic runs at seed 42 produce content-equivalent captures."""
    out_dir = tmp_path / "sph-stack-d-diag"
    out_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=out_dir)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"
