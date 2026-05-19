"""Tier 1 determinism check composes the testkit harness verbatim."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from diagnostics.tier1.determinism import check_determinism


def _manifest(payload_name: str, seed: int) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "det", "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={"tier": "test", "dims": [4], "dtype": "f64", "seed": seed, "params": {}},
        run={
            "step_count": 1,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-19T00:00:00Z",
        },
        payload={"format": "hdf5", "path": payload_name, "checksum": "sha256:" + "0" * 64},
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _det_runner(seed: int, out_dir: Path) -> Path:
    rng = np.random.default_rng(seed)
    state = StepState(step=0, state={"U": rng.standard_normal(4)}, diagnostics={})
    return Path(write_capture([state], _manifest("det.h5", seed), out_dir))


def _nondet_runner(seed: int, out_dir: Path) -> Path:
    rng = np.random.default_rng()  # no seed; drifts every call
    state = StepState(step=0, state={"U": rng.standard_normal(4)}, diagnostics={})
    return Path(write_capture([state], _manifest("nondet.h5", seed), out_dir))


def test_deterministic_runner_passes(tmp_path: Path) -> None:
    verdict = check_determinism(_det_runner, seed=7)
    assert verdict.bit_exact, verdict.detail


def test_nondeterministic_runner_fails(tmp_path: Path) -> None:
    verdict = check_determinism(_nondet_runner, seed=7)
    assert not verdict.bit_exact
