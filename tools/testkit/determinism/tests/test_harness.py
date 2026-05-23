"""Determinism harness tests.

Two stub `SimRunner`s exercise the gate:

  - `deterministic_stub`: re-seeds `np.random.default_rng` on every call,
    writes the same capture every time, and passes the gate.
  - `nondeterministic_stub`: uses `np.random.default_rng()` without a seed
    on every call, so two captures differ; fails the gate.

Both stubs use Block-1's `write_capture` to emit canonical captures.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from capture import CaptureManifest, StepState, write_capture
from determinism import run_twice_and_diff


def _manifest(payload_name: str, sim_name: str, seed: int) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": sim_name, "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={
            "tier": "test",
            "dims": [8],
            "dtype": "f64",
            "seed": seed,
            "params": {},
        },
        run={
            "step_count": 2,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-19T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def deterministic_stub(seed: int, out_dir: Path) -> Path:
    """Re-seed every call: bit-identical captures across invocations."""
    rng = np.random.default_rng(seed)
    field = rng.standard_normal(8).astype(np.float64)
    states = [
        StepState(step=0, state={"U": field}, diagnostics={}),
        StepState(step=1, state={"U": field * 0.5}, diagnostics={}),
    ]
    return write_capture(states, _manifest("det-pass.h5", "det-pass-stub", seed), out_dir)


def nondeterministic_stub(seed: int, out_dir: Path) -> Path:
    """Ignore the seed on the RNG; subsequent calls drift."""
    rng = np.random.default_rng()  # no seed -- nondeterministic
    field = rng.standard_normal(8).astype(np.float64)
    states = [
        StepState(step=0, state={"U": field}, diagnostics={}),
        StepState(step=1, state={"U": field * 0.5}, diagnostics={}),
    ]
    return write_capture(states, _manifest("det-fail.h5", "det-fail-stub", seed), out_dir)


def test_deterministic_stub_passes_the_gate(tmp_path: Path) -> None:
    verdict = run_twice_and_diff(deterministic_stub, seed=7, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_nondeterministic_stub_fails_the_gate(tmp_path: Path) -> None:
    verdict = run_twice_and_diff(nondeterministic_stub, seed=7, tmp_dir=tmp_path)
    assert not verdict.content_equivalent
    assert "max_abs_err" in verdict.detail


def test_harness_creates_two_independent_run_dirs(tmp_path: Path) -> None:
    """The harness writes to ./run-a and ./run-b beneath the tmp_dir."""
    run_twice_and_diff(deterministic_stub, seed=42, tmp_dir=tmp_path)
    assert (tmp_path / "run-a").is_dir()
    assert (tmp_path / "run-b").is_dir()
    assert (tmp_path / "run-a" / "det-pass.h5").is_file()
    assert (tmp_path / "run-b" / "det-pass.h5").is_file()
