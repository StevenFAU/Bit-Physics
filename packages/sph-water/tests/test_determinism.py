"""Determinism tests (gate 11).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body;
the particle-fluids sph-water sub-phase Stage 1 fills in the body
(SHIFTED — parallels closed-form / agent-based S1 inheritance; the
imported ``sim_runner_seeded`` contract is preserved as the
noqa-tagged contract import).

Spec § 2.5 declares ``epsilon-same-stack-same-hw`` for the Stack-C
C++/Vulkan implementation (atomic scatter-add in the DFSPH
neighbor accumulator). The Python NumPy reference at this sub-phase
achieves the stronger ``bit-exact-same-stack-same-hw`` claim because
none of the ``epsilon``-class sources (atomic scatter, FMA fusion,
subgroup-collectives) live in the NumPy path (see ``sim.py`` module
docstring). The test name ``test_run_twice_epsilon_diff`` is preserved
from the probe report § 6 contract; the assertion checks ``bit_exact``
(epsilon-bound trivially satisfied at zero diff) per sub-phase plan
§ 1.5 over-achievement note.

Uses ``sim_runner_diagnostic`` (64 particles × 8 steps) rather than
the canonical ``sim_runner_seeded`` (1M particles × 1000 steps) — the
canonical descriptor is R12-STOP-AND-SURFACE-routed at Stage 1 step 5
(sub-phase plan § 9 R12); diagnostic-tier is sufficient to witness the
bit-exact determinism contract end-to-end without paying the canonical
capture cost on every pytest invocation.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from sph_water.sim import (
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_run_twice_epsilon_diff(tmp_path: Path) -> None:
    """Diagnostic capture reproduces byte-for-byte under fixed seed."""
    out_dir = tmp_path / "sph-diag"
    out_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=out_dir)
    # Spec declaration is epsilon for Stack C; the Python NumPy
    # reference here over-achieves bit-exact (sub-phase plan § 1.5).
    assert verdict.bit_exact, verdict.detail
    assert verdict.detail == "captures match exactly"
