"""Determinism Config (IC-4, charter § 3.4; IC-11 Taichi-init wrapper).

Surfaces:

- :class:`Config` — ``deterministic`` flag + ``seed``.
- :func:`add_args` — register ``--deterministic`` and ``--seed``
  options on an argparse parser.
- :func:`from_args` — parse an ``argparse.Namespace`` into a
  :class:`Config`.
- :func:`set_taichi_deterministic` — initialize Taichi with the
  determinism contract per ``docs/common/taichi.md`` § 2: pinned arch,
  ``random_seed``, ``cpu_max_num_threads=1``, ``offline_cache=True``.
  No-op when Taichi is missing or the Config disables determinism.

Taichi is a hard dependency of ``common_py`` post-
sub-phase-taichi-integration (per Task 0.3 routing (a)); the
``ImportError`` fallback in :func:`set_taichi_deterministic` remains
for the testkit-only invocation path (where ``common_py`` may be
imported without its full dependency closure).
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass

__all__ = [
    "SUPPORTED_TAICHI_ARCHS",
    "Config",
    "add_args",
    "from_args",
    "set_taichi_deterministic",
]


# Per docs/common/taichi.md § 2.1 — supported backends. CPU is the
# default + load-bearing for bit-determinism per cpu_max_num_threads=1
# discipline; GPU backends are epsilon-bounded-cross-stack per spec § 4.4.
SUPPORTED_TAICHI_ARCHS: tuple[str, ...] = ("cpu", "cuda", "vulkan", "metal")


@dataclass
class Config:
    deterministic: bool = False
    seed: int = 0


def add_args(parser: argparse.ArgumentParser) -> None:
    """Register the IC-4 CLI flags on ``parser``."""
    parser.add_argument(
        "--deterministic",
        action="store_true",
        help="Enable bit-exact determinism (Taichi: pin cpu_max_num_threads=1 + offline_cache).",
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


def set_taichi_deterministic(config: Config, *, arch: str = "cpu") -> None:
    """Initialize Taichi with the project's determinism contract.

    Per ``docs/common/taichi.md`` § 2, the canonical form is::

        ti.init(
            arch=ti.cpu,
            random_seed=<seed>,
            cpu_max_num_threads=1,
            offline_cache=True,
        )

    This is the **actual** Taichi 1.7.4 determinism mechanism — the
    earlier ``deterministic_mode=True`` kwarg name from spec § 4.4 is
    NOT a valid Taichi 1.7.4 ``ti.init`` parameter (verified at
    sub-phase-taichi-integration Stage 1; reference: ``ti.init``
    signature inspection at HEAD).

    Args:
        config: IC-4 :class:`Config`. No-op when
            ``config.deterministic`` is ``False``.
        arch: Backend selection per :data:`SUPPORTED_TAICHI_ARCHS`.
            Default ``"cpu"`` is the only backend with bit-determinism
            guarantees per the convention (GPU backends are
            epsilon-bounded-cross-stack per spec § 4.4 + the convention
            doc § 4.4). Raises :class:`ValueError` on unrecognised arch.

    Returns silently when ``import taichi`` fails — preserves backward
    compatibility with the testkit-only invocation path where
    ``common_py`` may be imported without its full dependency closure.

    Re-initializes Taichi if it was already initialized (otherwise the
    determinism settings do not take effect on a subsequent ``ti.init``
    call).
    """
    if not config.deterministic:
        return
    if arch not in SUPPORTED_TAICHI_ARCHS:
        raise ValueError(
            f"set_taichi_deterministic: unrecognised arch {arch!r}; "
            f"expected one of {SUPPORTED_TAICHI_ARCHS}"
        )
    try:
        import taichi as ti  # type: ignore[import-not-found]
    except ImportError:
        return
    arch_map = {
        "cpu": ti.cpu,
        "cuda": ti.cuda,
        "vulkan": ti.vulkan,
        "metal": ti.metal,
    }
    ti.init(  # pragma: no cover - exercised only when taichi is installed
        arch=arch_map[arch],
        random_seed=int(config.seed),
        cpu_max_num_threads=1,
        offline_cache=True,
    )
