"""SimRunner capture round-trip (manifest schema + payload layout)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from capture.reader import load_capture
from phase_field_fracture.sim import sim_runner_diagnostic


def test_diagnostic_capture_roundtrip(tmp_path: Path) -> None:
    manifest_path = sim_runner_diagnostic(42, tmp_path)
    assert manifest_path.exists()
    manifest = json.loads(manifest_path.read_text())
    assert manifest["sim"]["name"] == "phase-field-fracture"
    assert manifest["sim"]["category"] == "fracture"
    assert manifest["config"]["dtype"] == "f64"
    assert manifest["payload"]["checksum"].startswith("sha256:")

    cap = load_capture(manifest_path)
    steps = list(cap.steps())
    assert steps[0].step == 0
    assert steps[-1].step == manifest["run"]["step_count"]
    for s in steps:
        assert set(s.state) == {"ux", "uy", "d", "h_field"}
        assert s.state["d"].shape == (48, 48)
        assert s.state["ux"].shape == (49, 49)
        assert s.state["d"].dtype == np.float64
        assert 0.0 <= s.diagnostics["d_max"] <= 1.0
        assert s.diagnostics["ie"] >= 0.0
        assert s.diagnostics["e_frac"] >= 0.0

    # reaction force grows from zero under the ramp (pre-crack monotone
    # trend is asserted by the SENT gate test at gate resolution)
    reactions = [s.diagnostics["reaction"] for s in steps]
    assert reactions[0] == 0.0
    assert max(reactions) > 0.0
