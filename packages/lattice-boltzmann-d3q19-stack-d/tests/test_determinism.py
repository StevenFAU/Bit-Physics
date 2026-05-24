"""Determinism tests (gate 11; IC-14; spec 2.5), Stack-D.

The Stack-D Taichi-DSL sim runs under set_taichi_deterministic(arch='cpu')
(cpu_max_num_threads=1, offline_cache=True). Two runs at the same seed on the
same hardware MUST produce content-equivalent Capture projections (every state
array + every diagnostic entry matches element-wise under np.array_equal
semantics; storage-format metadata excluded per the
sub-phase-capture-determinism-contract). Stage-0 Task 0.3 confirmed the
BGK+Guo+stream pipeline is run-twice bit-exact within Stack-D.

The Stack-D sim module ``lattice_boltzmann_d3q19_stack_d.sim`` does NOT exist at
the failing-tests commit -- collection fails with ModuleNotFoundError cleanly
until Stage 1b implements it.
"""

from __future__ import annotations

from pathlib import Path

from determinism import run_twice_and_diff
from lattice_boltzmann_d3q19_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)


def test_run_twice_bit_exact_diagnostic(tmp_path: Path) -> None:
    """Diagnostic capture is content-equivalent under fixed seed (IC-14)."""
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_content_equivalent_gate_catches_drift(tmp_path: Path) -> None:
    """R-D2 spot-check: the harness MUST flag a drifting SimRunner as mismatch.

    A synthetic SimRunner whose state drifts per invocation must produce
    ``verdict.content_equivalent == False`` -- the failure-mode-on-bug witness
    that proves the content-equivalent contract catches synthetic drift.
    """
    import numpy as np
    from capture import CaptureManifest, StepState, write_capture

    call_count = {"n": 0}

    def drifting_runner(seed: int, out_dir: Path) -> Path:
        call_count["n"] += 1
        manifest = CaptureManifest(
            schema_version="1.0.0",
            sim={"name": "lbm-d3q19-stackd-rd2-stub", "category": "lattice", "variant": "ref"},
            stack={"name": "taichi-stub", "version": "0.0.1", "build_id": "stub"},
            config={"tier": "test", "dims": [4], "dtype": "f64", "seed": seed, "params": {}},
            run={
                "step_count": 1,
                "capture_interval": 1,
                "wall_clock_seconds": 0.0,
                "start_utc": "2026-05-24T00:00:00Z",
            },
            payload={"format": "hdf5", "path": "stub.h5", "checksum": "sha256:" + "0" * 64},
            determinism={
                "claimed": "bit-exact-same-hw",
                "atomic_ops": False,
                "subgroup_ops": False,
            },
        )
        u = np.array([1.0, 2.0, 3.0, float(call_count["n"])], dtype=np.float64)
        states = [StepState(step=0, state={"U": u}, diagnostics={})]
        return write_capture(states, manifest, out_dir)

    verdict = run_twice_and_diff(drifting_runner, seed=42, tmp_dir=tmp_path)
    assert not verdict.content_equivalent, (
        "R-D2 violation: harness failed to detect synthetic drift; "
        "content-equivalent contract surface is weaker than expected."
    )
    assert "max_abs_err" in verdict.detail
