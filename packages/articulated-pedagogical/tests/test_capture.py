"""Stage 1b — replayable-capture round-trip (gate-9) + determinism decl (gate-10).

``sim_runner_seeded`` emits the canonical capture via the common-warp batch
``Capture`` API; this test writes it to a temp dir, reads it back, and asserts
(a) the payload round-trips, (b) the manifest's ``determinism.claimed`` matches
the registry declaration ``bit-exact-same-hw``, and (c) re-running the sim
produces a byte-identical payload (the gate-10 determinism contract).
"""

from __future__ import annotations

from pathlib import Path

import common_warp
import numpy as np

import articulated_pedagogical as ap


def test_capture_roundtrip_and_determinism_decl(tmp_path: Path) -> None:
    manifest_path = ap.sim_runner_seeded(42, tmp_path)
    assert manifest_path.exists()
    assert manifest_path.name == "pendulum-trajectory-seed42-step1000.json"

    cap = common_warp.read_capture(tmp_path / "pendulum-trajectory-seed42-step1000")
    assert cap.manifest["determinism"]["claimed"] == "bit-exact-same-hw"
    assert cap.manifest["config"]["dtype"] == "f64"
    assert cap.manifest["schema_version"] == "1.0.0"
    # step 0 theta is the canonical release angle.
    np.testing.assert_array_equal(cap.payload["steps/0/state/theta"], np.array([2.0]))


def test_capture_payload_bit_identical_across_runs(tmp_path: Path) -> None:
    """gate-10: two seeded runs produce byte-identical capture payloads."""
    a = common_warp.read_capture(ap.sim_runner_seeded(42, tmp_path / "a").with_suffix(""))
    b = common_warp.read_capture(ap.sim_runner_seeded(42, tmp_path / "b").with_suffix(""))
    assert set(a.payload) == set(b.payload)
    for key in a.payload:
        np.testing.assert_array_equal(a.payload[key], b.payload[key])
