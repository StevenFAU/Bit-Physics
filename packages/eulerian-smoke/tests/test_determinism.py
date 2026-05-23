"""Determinism tests (gate 11).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body; the
eulerian-smoke sub-phase Stage 1 fills in the body (SHIFTED — parallels
closed-form / agent-based / RD-3D / sph-water Stage 1 S1 inheritance;
the imported ``sim_runner_seeded`` Protocol contract is preserved as
the noqa-tagged contract import).

Spec § 2.5 / sim ``determinism.md`` declares
``epsilon-same-stack-same-hw`` for the Stack-C C++/Vulkan
implementation (pressure-projection iterations involve parallel
reductions; FP reduction-tree shape depends on subgroup-collective
ops). The Python NumPy reference at this sub-phase OVER-ACHIEVES the
``bit-exact-same-stack-same-hw`` claim — none of the
``epsilon``-class sources (parallel reductions, driver FMA fusion,
subgroup-collectives) live in the elementwise-NumPy + ``np.roll`` /
``np.mod`` kernel (see ``sim.py`` module docstring clauses 1–8).
The test name ``test_run_twice_epsilon_diff`` is preserved from the
probe report § 6 contract; the assertion checks ``bit_exact`` —
epsilon-bound trivially satisfied at zero diff — per sub-phase plan
§ 1.5-class over-achievement note (conventions doc § F.4).

Uses ``sim_runner_diagnostic`` (32³ × 10 steps) rather than the
canonical ``sim_runner_seeded`` (128³ × 500 steps) — the canonical
descriptor's wall-clock at Stack-D NumPy reference is 8–16 min per
capture (Stage 0 Task 0.4), so capture-twice-and-diff against the
canonical descriptor would burn 16–32 min per pytest invocation.
Diagnostic-tier is sufficient to witness the bit-exact determinism
contract end-to-end (exercises every kernel: MacCormack SL advection,
vorticity-confinement skeleton, viscous diffusion, Jacobi projection,
scalar advection) without paying the canonical capture cost. The
canonical-tier determinism is witnessed by the Stage 2 gate-13 replay
re-execution of the canonical capture commit.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from eulerian_smoke.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_run_twice_epsilon_diff(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic capture reproduces byte-for-byte under fixed seed."""
    capture_dir = tmp_path / "eulerian-smoke-diag"
    capture_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=capture_dir)
    # Spec declaration is epsilon for Stack-C (Phase 2+); the Python
    # NumPy reference here over-achieves bit-exact (sub-phase plan
    # § 1.5 / conventions doc § F.4).
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"
