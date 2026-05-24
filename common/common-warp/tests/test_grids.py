"""Grids subsystem (Subsystem 5) tests — lifecycle + capture round-trip."""

from __future__ import annotations

import numpy as np
import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import common_warp


def test_allocate_scalar_field_shape_and_payload() -> None:
    f = common_warp.allocate_scalar_field((4, 3, 2), device="cpu")
    assert f.shape == (4, 3, 2)
    payload = f.to_capture_payload()
    assert payload["data"].shape == (4, 3, 2)
    assert payload["spacing"].shape == (3,)
    assert payload["origin"].shape == (3,)
    assert not payload["data"].any()


def test_allocate_vector_field_shape_and_payload() -> None:
    f = common_warp.allocate_vector_field((4, 3, 2), spacing=(0.5, 0.5, 0.5), device="cpu")
    assert f.shape == (4, 3, 2)
    payload = f.to_capture_payload()
    assert payload["data"].shape == (4, 3, 2, 3)
    np.testing.assert_array_equal(payload["spacing"], np.array([0.5, 0.5, 0.5]))


def test_scalar_field_capture_payload_round_trips() -> None:
    data = np.arange(24, dtype=np.float32).reshape(4, 3, 2)
    payload = {
        "data": data,
        "spacing": np.array([1.0, 2.0, 3.0]),
        "origin": np.array([0.0, 0.0, 0.0]),
    }
    f = common_warp.ScalarField3D.from_capture_payload(payload, device="cpu")
    assert f.shape == (4, 3, 2)
    assert f.spacing == (1.0, 2.0, 3.0)
    np.testing.assert_array_equal(f.to_capture_payload()["data"], data)


def test_vector_field_capture_payload_round_trips() -> None:
    data = np.arange(72, dtype=np.float32).reshape(4, 3, 2, 3)
    payload = {
        "data": data,
        "spacing": np.array([1.0, 1.0, 1.0]),
        "origin": np.array([0.0, 0.0, 0.0]),
    }
    f = common_warp.VectorField3D.from_capture_payload(payload, device="cpu")
    assert f.shape == (4, 3, 2)
    np.testing.assert_array_equal(f.to_capture_payload()["data"], data)
