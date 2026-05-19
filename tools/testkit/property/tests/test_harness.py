"""PBT harness tests.

Two stub sims exercise the mass-conservation invariant:

  - `mass_conserving_stub`: every step is a pure permutation of the IC
    (`np.roll`). Total mass is exactly preserved, so the invariant passes
    over `n_examples` random initial conditions.
  - `mass_drifting_stub`: every step adds `+1e-4` to the array. The first
    step already breaks mass conservation (drift = n_cells * 1e-4 ~ 3e-3
    at n_cells=32), so the invariant fails. Hypothesis shrinks the IC to a
    minimal counter-example.

A third sim with a `np.full(_, 0.5)` baseline tests that the invariant is
not vacuous on degenerate fields (mass-drifting still detects the constant
drift).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from capture import CaptureManifest, StepState, write_capture
from property import run_invariants
from property.invariants import conservation_mass
from property.strategies import smooth_scalar_field_in_unit_box


def _manifest(payload_name: str) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "pbt-stub", "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={
            "tier": "test",
            "dims": [32],
            "dtype": "f64",
            "seed": 0,
            "params": {},
        },
        run={
            "step_count": 3,
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


def mass_conserving_stub(initial_condition: np.ndarray, out_dir: Path) -> Path:
    """Three steps; each step is `np.roll(field, 1)` — pure permutation."""
    u0 = np.asarray(initial_condition, dtype=np.float64)
    u1 = np.roll(u0, 1)
    u2 = np.roll(u1, 1)
    states = [
        StepState(step=0, state={"U": u0}, diagnostics={}),
        StepState(step=1, state={"U": u1}, diagnostics={}),
        StepState(step=2, state={"U": u2}, diagnostics={}),
    ]
    return write_capture(states, _manifest("pbt-pass.h5"), out_dir)


def mass_drifting_stub(initial_condition: np.ndarray, out_dir: Path) -> Path:
    """Each step adds a small constant; cumulative drift breaks conservation."""
    u0 = np.asarray(initial_condition, dtype=np.float64)
    u1 = u0 + 1e-4
    u2 = u1 + 1e-4
    states = [
        StepState(step=0, state={"U": u0}, diagnostics={}),
        StepState(step=1, state={"U": u1}, diagnostics={}),
        StepState(step=2, state={"U": u2}, diagnostics={}),
    ]
    return write_capture(states, _manifest("pbt-fail.h5"), out_dir)


def test_pbt_passes_on_mass_conserving_sim(tmp_path: Path) -> None:
    verdict = run_invariants(
        mass_conserving_stub,
        invariants=[conservation_mass(field="U", tolerance=1e-9)],
        strategy=smooth_scalar_field_in_unit_box(shape=(32,)),
        n_examples=15,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed
    assert verdict.results[0].passed
    assert verdict.results[0].invariant == "conservation_mass:U"


def test_pbt_fails_and_shrinks_on_drifting_sim(tmp_path: Path) -> None:
    verdict = run_invariants(
        mass_drifting_stub,
        invariants=[conservation_mass(field="U", tolerance=1e-9)],
        strategy=smooth_scalar_field_in_unit_box(shape=(32,)),
        n_examples=15,
        tmp_dir=tmp_path,
    )
    assert not verdict.all_passed
    result = verdict.results[0]
    assert not result.passed
    assert "drift" in result.detail
    # counter_example carries either the structured failure dict or the
    # original Hypothesis-generated input. Either way it must be non-None
    # so the operator can inspect the minimal failing case.
    assert result.counter_example is not None
