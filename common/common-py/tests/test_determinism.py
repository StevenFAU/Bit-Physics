"""IC-4 determinism Config tests."""

from __future__ import annotations

import argparse

from common_py.determinism import Config, add_args, from_args, set_taichi_deterministic


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
    # Should silently return without touching taichi (even if it
    # weren't installed).
    set_taichi_deterministic(Config(deterministic=False, seed=99))


def test_set_taichi_deterministic_silent_when_taichi_missing() -> None:
    # Taichi is *not* installed in the .venv this test runs under;
    # the call must not raise.
    set_taichi_deterministic(Config(deterministic=True, seed=7))
