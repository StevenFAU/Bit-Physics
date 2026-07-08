"""Capture manifest round-trip via the SimRunner Protocol."""

import json
from pathlib import Path

import numpy as np
from capture import load_capture

from signal_workbench.sim import sim_runner_diagnostic


def test_diagnostic_capture_roundtrip(tmp_path: Path) -> None:
    manifest_path = sim_runner_diagnostic(42, tmp_path)
    assert manifest_path.exists()
    manifest = json.loads(manifest_path.read_text())
    assert manifest["sim"]["name"] == "signal-workbench"
    assert manifest["sim"]["category"] == "signal-processing"
    assert manifest["config"]["dtype"] == "f64"
    assert manifest["payload"]["checksum"].startswith("sha256:")
    cap = load_capture(manifest_path)
    steps = list(cap.steps())
    assert [s.step for s in steps] == [0]
    (s,) = steps
    assert set(s.state) == {
        "x_fm",
        "X_fm_re",
        "X_fm_im",
        "x_leak",
        "X_leak_re",
        "X_leak_im",
    }
    n = manifest["config"]["params"]["n"]
    for key in s.state:
        assert s.state[key].shape == (n,)
        assert s.state[key].dtype == np.float64
        assert np.isfinite(s.state[key]).all()
    assert s.diagnostics["parseval_rel_err_fm"] <= 1e-13
    assert s.diagnostics["parseval_rel_err_leak"] <= 1e-13
    assert s.diagnostics["max_line_err_fm"] <= 1e-12
    assert s.diagnostics["max_skirt_err_leak"] <= 1e-11
    assert s.diagnostics["crest_fm"] > 1.0
