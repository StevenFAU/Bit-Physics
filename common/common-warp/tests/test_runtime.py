"""Runtime subsystem (Subsystem 1) tests — Warp init + device selection."""

from __future__ import annotations

import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import common_warp


def test_init_idempotent() -> None:
    """init() twice does not raise and resolves to the same device."""
    d1 = common_warp.init()
    d2 = common_warp.init()
    assert d1 == d2


def test_init_defaults_to_cpu() -> None:
    """No device arg -> the D4 bit-determinism backend (cpu)."""
    assert common_warp.init() == "cpu"


def test_get_device_after_explicit_set() -> None:
    common_warp.set_device("cpu")
    assert common_warp.get_device() == "cpu"


def test_get_device_autoinitializes() -> None:
    """get_device() works even as the first call (idempotent self-init)."""
    assert common_warp.get_device() == "cpu"


def test_init_deterministic_flag() -> None:
    """§1.9.1 ``init(device, deterministic)`` (S1b-3 / Task 1c.1).

    The ``deterministic`` flag is accepted positionally + by keyword and is
    reflected by ``runtime.is_deterministic()``; the resolved device is
    unaffected (D4 cpu).
    """
    from common_warp import runtime

    assert common_warp.init("cpu", deterministic=True) == "cpu"
    assert runtime.is_deterministic() is True
    assert common_warp.init("cpu", False) == "cpu"
    assert runtime.is_deterministic() is False
