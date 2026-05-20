"""Determinism Config (IC-4, charter § 3.4).

Surfaces:

- :class:`Config` — ``deterministic`` flag + ``seed``.
- :func:`add_args` — register ``--deterministic`` and ``--seed``
  options on an argparse parser.
- :func:`from_args` — parse an ``argparse.Namespace`` into a
  :class:`Config`.
- :func:`set_taichi_deterministic` — apply ``deterministic_mode``
  when Taichi is present and enabled in the Config; no-op otherwise.

Taichi is intentionally an *optional* dependency
(``common_py[taichi]``); ``set_taichi_deterministic`` returns silently
when ``import taichi`` fails so that Stack B/C consumers can use IC-4
without pulling in the Taichi runtime.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass

__all__ = [
    "Config",
    "add_args",
    "from_args",
    "set_taichi_deterministic",
]


@dataclass
class Config:
    deterministic: bool = False
    seed: int = 0


def add_args(parser: argparse.ArgumentParser) -> None:
    """Register the IC-4 CLI flags on ``parser``."""
    parser.add_argument(
        "--deterministic",
        action="store_true",
        help="Enable bit-exact determinism (Taichi: deterministic_mode=True).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=0,
        help="RNG seed used by the sim and by Taichi initialization.",
    )


def from_args(args: argparse.Namespace) -> Config:
    """Lift parsed argparse output into a :class:`Config`."""
    return Config(
        deterministic=bool(getattr(args, "deterministic", False)),
        seed=int(getattr(args, "seed", 0)),
    )


def set_taichi_deterministic(config: Config) -> None:
    """Apply the deterministic flag to Taichi if installed and enabled.

    No-op when ``config.deterministic`` is ``False`` or when ``taichi``
    is not importable. Re-initializes Taichi if it was already initialized
    (otherwise the deterministic flag does not take effect).
    """
    if not config.deterministic:
        return
    try:
        import taichi as ti  # type: ignore[import-not-found]
    except ImportError:
        return
    # Taichi's deterministic_mode is applied at init time.
    ti.init(  # pragma: no cover - exercised only when taichi is installed
        arch=ti.cpu,
        deterministic_mode=True,
        random_seed=int(config.seed),
    )
