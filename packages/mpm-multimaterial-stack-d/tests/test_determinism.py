"""Determinism tests (gate 10; spec 2.5).

Spec ``determinism.md`` declares ``epsilon-same-stack-same-hw`` for the
Stack-D Taichi target (the canonical P2G atomic scatter-add breaks
bit-exactness under parallelism even on identical hardware -- empirically
confirmed at Stage 0 Task 0.3 posture (ii)). The Stack-D Taichi port is
implemented under ``cpu_max_num_threads=1`` (posture (i); Stage 0 Task 0.3
lean), which is run-to-run BIT-EXACT (Stage 0 Task 0.3 + Task 0.5) -- so the
port achieves **content-equivalent on the same stack + hw** at the diagnostic
tier.

Determinism contract (sub-phase-capture-determinism-contract; spec 2.5):
two runs at the same seed on the same hardware MUST produce content-equivalent
Capture projections (every state array + every diagnostic entry matches
element-wise; storage-format metadata excluded). The canonical mechanism is
``tools/testkit/determinism::run_twice_and_diff``, which ``test_run_twice_
epsilon_diff`` invokes below.

Uses :func:`sim_runner_diagnostic` (16^3 x 5K particles x 50 steps) rather
than the canonical :func:`sim_runner_seeded` (128^3 x 1M particles x 500
steps) -- the canonical drop-impact capture takes ~minutes + produces a
~1.05 GiB payload we don't want to write to ``tmp_path`` twice per test
(eulerian-smoke / sph-water / LBM diagnostic-tier precedent).

The Stack-D sim module ``mpm_multimaterial_stack_d.sim`` does NOT exist at
the failing-tests commit -- collection fails with ModuleNotFoundError cleanly
until Stage 1b implements it.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff
from mpm_multimaterial_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)


def test_run_twice_epsilon_diff(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic capture is content-equivalent under fixed seed.

    The Stack-D port runs at ``cpu_max_num_threads=1`` (posture (i)); the
    serialised P2G atomic-scatter is run-to-run bit-exact (Stage 0 Task 0.3),
    so two invocations with the same seed produce content-equivalent Capture
    projections at the same hardware (every state array and diagnostic entry
    matches element-wise; storage-format metadata excluded).
    """
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_content_equivalent_gate_catches_drift(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """R-D2 spot-check (sub-phase-capture-determinism-contract 9).

    A SimRunner whose output drifts across calls MUST produce
    ``verdict.content_equivalent == False`` under the content-equivalent
    contract. This is the failure-mode-on-bug witness that proves the harness
    mechanism catches synthetic drift (the contract surface must be at least
    as strong as the byte-equality surface it replaces).
    """
    import numpy as np
    from capture import CaptureManifest, StepState, write_capture

    call_count = {"n": 0}

    def drifting_runner(seed: int, out_dir: Path) -> Path:
        call_count["n"] += 1
        manifest = CaptureManifest(
            schema_version="1.0.0",
            sim={"name": "mpm-stack-d-stub", "category": "mpm", "variant": "ref"},
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
                "start_utc": "2026-05-24T00:00:00Z",
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
        # The fourth element drifts with call count -> content mismatch.
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
