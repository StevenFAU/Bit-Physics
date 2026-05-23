"""Determinism tests (gate 11; spec § 2.5).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body; the
mpm-multimaterial sub-phase Stage 1 fills in the body (SHIFTED — S1
pattern, conventions doc § A.2 + § M.2 inheritance). The imported
:func:`sim_runner_seeded` Protocol contract is preserved as the
noqa-tagged contract import per probe report § 5.

Spec ``determinism.md`` declares ``epsilon-same-stack-same-hw`` for the
Stack-D Taichi target (the P2G atomic scatter-add breaks bit-exactness
even on identical hardware at Stack-D Taichi scope). The Stack-D Python
NumPy + numba reference at THIS sub-phase achieves cleanly **content-
equivalent on the same stack + hw** (no atomic-scatter — single-threaded
``@njit`` with ``parallel=False`` default + sorted-particle iteration +
lex 27-cell P2G/G2P stencil — see ``sim.py`` module docstring clauses
1-10). Over-achievement is informational only per conventions doc § F.4.

Determinism contract (sub-phase-capture-determinism-contract; spec
§ 2.5): two runs at the same seed on the same hardware MUST produce
content-equivalent Capture projections (every state array + every
diagnostic entry matches element-wise under ``np.array_equal``
semantics; wall-clock-influenced HDF5 storage-format metadata is
excluded from the comparison). The canonical mechanism is
``tools/testkit/determinism::run_twice_and_diff``, which the
``test_run_twice_epsilon_diff`` body invokes below.

Uses :func:`sim_runner_diagnostic` (16³ × 5K particles × 50 steps)
rather than the canonical :func:`sim_runner_seeded` (128³ × 1M particles
× 500 steps) — the canonical drop-impact capture takes ~8-10 min but
produces a ~1.6 GB payload that we don't want to write to ``tmp_path``
twice per test invocation (sub-phase-eulerian-smoke / RD-3D / sph-water
/ LBM diagnostic-tier precedent).
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff

from mpm_multimaterial.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_run_twice_epsilon_diff(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic capture is content-equivalent under fixed seed.

    Per conventions doc § F.4: the spec declares
    ``epsilon-same-stack-same-hw`` for Stack-D Taichi; the Stack-D
    Python NumPy + numba reference over-achieves to bit-exact —
    the kernel has no atomic-scatter / parallel-reduction / subgroup-
    collective surfaces, so two invocations with the same seed
    produce content-equivalent Capture projections at the same
    hardware (every state array and diagnostic entry matches
    element-wise under the parsed-Capture comparison; storage-format
    metadata excluded per sub-phase-capture-determinism-contract).
    """
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_content_equivalent_gate_catches_drift(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """R-D2 spot-check (sub-phase-capture-determinism-contract § 9).

    A SimRunner whose output drifts across calls MUST produce
    ``verdict.content_equivalent == False`` under the refactored
    content-equivalent contract. The contract surface must be at least
    as strong as the byte-equality surface it replaces; this test is
    the failure-mode-on-bug witness that proves the harness mechanism
    catches synthetic drift.

    Mechanism: a synthetic SimRunner (mirroring the
    ``test_harness.py:nondeterministic_stub`` pattern) that writes a
    capture whose state drifts per invocation. The harness's
    ``np.array_equal`` element-wise comparison MUST flag this as
    mismatch. This is the R-D2 mitigation per charter § 9: the
    refactored contract preserves the failure-mode-on-bug witness.
    """
    import numpy as np
    from capture import CaptureManifest, StepState, write_capture

    call_count = {"n": 0}

    def drifting_runner(seed: int, out_dir: Path) -> Path:
        call_count["n"] += 1
        manifest = CaptureManifest(
            schema_version="1.0.0",
            sim={"name": "mpm-rd2-stub", "category": "mpm", "variant": "ref"},
            stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
            config={
                "tier": "test",
                "dims": [4],
                "dtype": "f64",
                "seed": seed,
                "params": {},
            },
            run={
                "step_count": 1,
                "capture_interval": 1,
                "wall_clock_seconds": 0.0,
                "start_utc": "2026-05-19T00:00:00Z",
            },
            payload={
                "format": "hdf5",
                "path": "stub.h5",
                "checksum": "sha256:" + "0" * 64,
            },
            determinism={
                "claimed": "epsilon",
                "atomic_ops": True,
                "subgroup_ops": False,
            },
        )
        # The fourth element drifts with call count → content mismatch.
        u = np.array([1.0, 2.0, 3.0, float(call_count["n"])], dtype=np.float64)
        states = [StepState(step=0, state={"pos": u}, diagnostics={})]
        return write_capture(states, manifest, out_dir)

    verdict = run_twice_and_diff(drifting_runner, seed=42, tmp_dir=tmp_path)
    assert not verdict.content_equivalent, (
        "R-D2 violation: harness mechanism failed to detect synthetic drift; "
        "content-equivalent contract surface is weaker than the byte-equality "
        "surface it replaced. Investigate before relaxing the test."
    )
    assert "max_abs_err" in verdict.detail
