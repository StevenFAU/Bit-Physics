"""Particles subsystem (Subsystem 4) tests — lifecycle + capture round-trip."""

from __future__ import annotations

import numpy as np
import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import common_warp


def test_allocate_particles_zeroed() -> None:
    p = common_warp.allocate_particles(8, device="cpu")
    assert p.count == 8
    payload = p.to_capture_payload()
    assert payload["positions"].shape == (8, 3)
    assert payload["velocities"].shape == (8, 3)
    assert payload["masses"].shape == (8,)
    assert not payload["positions"].any()
    assert not payload["masses"].any()


def test_particles_capture_payload_round_trips() -> None:
    n = 5
    payload = {
        "positions": np.arange(n * 3, dtype=np.float32).reshape(n, 3),
        "velocities": (np.arange(n * 3, dtype=np.float32) * -1.0).reshape(n, 3),
        "masses": np.linspace(1.0, 2.0, n, dtype=np.float32),
    }
    p = common_warp.Particles.from_capture_payload(payload, device="cpu")
    assert p.count == n
    out = p.to_capture_payload()
    np.testing.assert_array_equal(out["positions"], payload["positions"])
    np.testing.assert_array_equal(out["velocities"], payload["velocities"])
    np.testing.assert_array_equal(out["masses"], payload["masses"])
