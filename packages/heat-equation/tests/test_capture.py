"""SimRunner capture round-trip (manifest schema + payload layout)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from capture.reader import load_capture
from heat_equation.sim import DIAG_MODES, sim_runner_diagnostic


def test_diagnostic_capture_roundtrip(tmp_path: Path) -> None:
    manifest_path = sim_runner_diagnostic(42, tmp_path)
    assert manifest_path.exists()
    manifest = json.loads(manifest_path.read_text())
    assert manifest["sim"]["name"] == "heat-equation"
    assert manifest["sim"]["category"] == "volumetric-grid"
    assert manifest["config"]["dtype"] == "f64"
    assert manifest["payload"]["checksum"].startswith("sha256:")

    cap = load_capture(manifest_path)
    steps = list(cap.steps())
    assert [s.step for s in steps] == [0, 32, 64]
    for s in steps:
        assert set(s.state) == {"t_ftcs", "t_spec"}
        assert s.state["t_ftcs"].shape == (64, 64)
        assert s.state["t_ftcs"].dtype == np.float64
        for m, k in DIAG_MODES:
            assert f"amp_ftcs_{m}_{k}" in s.diagnostics
            assert f"amp_spec_{m}_{k}" in s.diagnostics
        assert s.diagnostics["parseval_rel_err"] <= 1e-13
        assert s.diagnostics["stability_margin"] > 0.0

    # Total heat conserved across the capture (periodic, no source).
    heats = [s.diagnostics["total_heat_ftcs"] for s in steps]
    assert max(abs(h - heats[0]) for h in heats) <= 1e-12 * abs(heats[0])
