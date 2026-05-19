"""Schema-version policy + iter helpers."""

from __future__ import annotations

import pytest
from capture import Capture

from diagnostics.tier1.capture_io import (
    SUPPORTED_SCHEMA_MAJOR,
    UnsupportedSchemaError,
    enforce_schema_version,
    iter_step_arrays,
)


def test_supported_schema_passes(healthy_capture: Capture) -> None:
    enforce_schema_version(healthy_capture)


def test_unsupported_future_major_rejected(future_schema_capture: Capture) -> None:
    with pytest.raises(UnsupportedSchemaError):
        enforce_schema_version(future_schema_capture)


def test_supported_schema_major_constant_is_one() -> None:
    """Pin the constant; bumping it requires a deliberate spec amendment."""
    assert SUPPORTED_SCHEMA_MAJOR == 1


def test_iter_step_arrays_yields_in_order(healthy_capture: Capture) -> None:
    pairs = list(iter_step_arrays(healthy_capture, "U"))
    assert [p[0] for p in pairs] == [0, 1, 2]
    for _step, arr in pairs:
        assert arr.shape == (8, 8)


def test_iter_step_arrays_skips_missing_field(healthy_capture: Capture) -> None:
    pairs = list(iter_step_arrays(healthy_capture, "missing"))
    assert pairs == []
