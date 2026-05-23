"""IC-4 determinism Config tests + IC-11 Taichi-init wrapper tests."""

from __future__ import annotations

import argparse
import builtins
import sys

import pytest

from common_py.determinism import (
    SUPPORTED_TAICHI_ARCHS,
    Config,
    add_args,
    from_args,
    set_taichi_deterministic,
)


def test_default_config_is_non_deterministic() -> None:
    cfg = Config()
    assert cfg.deterministic is False
    assert cfg.seed == 0


def test_add_args_then_from_args_parses_flags() -> None:
    parser = argparse.ArgumentParser()
    add_args(parser)
    args = parser.parse_args(["--deterministic", "--seed", "42"])
    cfg = from_args(args)
    assert cfg.deterministic is True
    assert cfg.seed == 42


def test_add_args_defaults() -> None:
    parser = argparse.ArgumentParser()
    add_args(parser)
    args = parser.parse_args([])
    cfg = from_args(args)
    assert cfg.deterministic is False
    assert cfg.seed == 0


def test_set_taichi_deterministic_noop_when_not_enabled() -> None:
    """``deterministic=False`` short-circuits before any Taichi work."""
    set_taichi_deterministic(Config(deterministic=False, seed=99))
    # Also confirms an unrecognised arch is ignored on the noop path
    # (validation only happens when deterministic=True is active).
    set_taichi_deterministic(Config(deterministic=False, seed=99), arch="cuda")


def test_set_taichi_deterministic_silent_when_taichi_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Simulate Taichi-missing via monkeypatch; call must not raise.

    Post-sub-phase-taichi-integration, Taichi is a required dependency of
    ``common_py``; the missing-import path is still load-bearing for the
    testkit-only invocation context (where ``common_py`` may be imported
    without its full dependency closure).
    """
    real_import = builtins.__import__

    def fake_import(
        name: str,
        globals_=None,
        locals_=None,
        fromlist=(),
        level: int = 0,
    ) -> object:
        if name == "taichi" or name.startswith("taichi."):
            raise ImportError(f"simulated: {name} not installed")
        return real_import(name, globals_, locals_, fromlist, level)

    # Evict any cached taichi modules so the import inside
    # set_taichi_deterministic actually goes through __import__.
    for mod in list(sys.modules):
        if mod == "taichi" or mod.startswith("taichi."):
            monkeypatch.delitem(sys.modules, mod, raising=False)
    monkeypatch.setattr(builtins, "__import__", fake_import)
    set_taichi_deterministic(Config(deterministic=True, seed=7))


def test_set_taichi_deterministic_rejects_unrecognised_arch() -> None:
    """ValueError surfaces unrecognised arch BEFORE attempting Taichi import."""
    with pytest.raises(ValueError, match="unrecognised arch"):
        set_taichi_deterministic(Config(deterministic=True, seed=42), arch="opencl")


def test_supported_taichi_archs_is_exactly_four_backends() -> None:
    """Lock the supported-arch surface to spec § 4.4's four backends."""
    assert SUPPORTED_TAICHI_ARCHS == ("cpu", "cuda", "vulkan", "metal")


@pytest.mark.parametrize("arch", ["cpu", "cuda", "vulkan", "metal"])
def test_set_taichi_deterministic_dispatches_each_arch(
    arch: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Each supported arch routes to the matching ``ti.<arch>`` selector.

    We mock the ``taichi`` module so this test runs without requiring a
    real GPU runtime (Taichi GPU backends are not generally available in
    CI per the R-T1 charter § 9 mitigation).
    """

    captured: dict[str, object] = {}

    class _FakeArch:
        def __init__(self, name: str) -> None:
            self.name = name

        def __repr__(self) -> str:  # pragma: no cover - diagnostic only
            return f"<FakeArch:{self.name}>"

    class _FakeTaichi:
        cpu = _FakeArch("cpu")
        cuda = _FakeArch("cuda")
        vulkan = _FakeArch("vulkan")
        metal = _FakeArch("metal")

        @staticmethod
        def init(**kwargs: object) -> None:
            captured.update(kwargs)

    monkeypatch.setitem(sys.modules, "taichi", _FakeTaichi)
    set_taichi_deterministic(Config(deterministic=True, seed=99), arch=arch)
    assert isinstance(captured["arch"], _FakeArch)
    assert captured["arch"].name == arch  # type: ignore[attr-defined]
    assert captured["random_seed"] == 99
    assert captured["cpu_max_num_threads"] == 1
    assert captured["offline_cache"] is True


def test_set_taichi_deterministic_backward_compat_no_arch_kwarg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Existing callers without the new ``arch=`` kwarg still get cpu backend."""
    captured: dict[str, object] = {}

    class _FakeArch:
        def __init__(self, name: str) -> None:
            self.name = name

    class _FakeTaichi:
        cpu = _FakeArch("cpu")
        cuda = _FakeArch("cuda")
        vulkan = _FakeArch("vulkan")
        metal = _FakeArch("metal")

        @staticmethod
        def init(**kwargs: object) -> None:
            captured.update(kwargs)

    monkeypatch.setitem(sys.modules, "taichi", _FakeTaichi)
    # No arch= kwarg — same call shape as pre-sub-phase-taichi-integration.
    set_taichi_deterministic(Config(deterministic=True, seed=42))
    assert captured["arch"].name == "cpu"  # type: ignore[attr-defined]
