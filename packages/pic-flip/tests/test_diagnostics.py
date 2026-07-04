"""Diagnostics + capture surface (spec-ref § 10; gate-7-style checks)."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from capture import load_capture

from pic_flip.sim import (
    diagnostic_params_3d,
    run_dam_break_3d,
    sim_runner_diagnostic,
)


def test_dam_break_diagnostics_finite_and_sane() -> None:
    params = diagnostic_params_3d()
    frames, steps, diags, rho_rest = run_dam_break_3d(42, params, 8, 2)
    assert rho_rest > 0.0
    assert steps[0] == 0 and steps[-1] == 8
    n0 = frames[0]["position"].shape[0]
    for frame, diag in zip(frames, diags):
        for name in ("position", "velocity", "affine_c"):
            arr = frame[name]
            assert arr.shape[0] == n0
            assert np.all(np.isfinite(arr)), name
        assert diag["fluid_node_count"] > 0.0
        assert diag["kinetic_energy"] >= 0.0
        assert np.isfinite(diag["max_div_fluid"])
    # The collapse gains kinetic energy from rest.
    assert diags[-1]["kinetic_energy"] > diags[0]["kinetic_energy"]
    # Particle count is conserved trivially; fluid-cell volume must not
    # collapse (drift compensation ON in the diagnostic params).
    assert diags[-1]["fluid_node_count"] >= 0.5 * diags[0]["fluid_node_count"]


def test_capture_roundtrip(tmp_path: Path) -> None:
    manifest_path = sim_runner_diagnostic(42, tmp_path)
    cap = load_capture(manifest_path)
    steps = list(cap.steps())
    assert len(steps) >= 3
    first = steps[0]
    for field in ("position", "velocity", "affine_c"):
        assert np.all(np.isfinite(np.asarray(first.state[field])))
