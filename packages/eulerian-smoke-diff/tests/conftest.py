"""Shared fixtures for eulerian-smoke-diff acceptance tests (Stack E / Warp).

Warp inits its CPU runtime once globally (``wp.init()`` in ``sim.py``); unlike the Taichi
Stack-D sibling diff sims there is no per-test runtime re-init fixture. Warp CPU ``wp.launch`` is
single-thread serial → the SL-advect gathers + the L2/adjoint ``wp.atomic_add`` reductions are
order-deterministic and bit-identical run-to-run.
"""

from __future__ import annotations

from pathlib import Path

import pytest


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() and (parent / "tools" / "testkit").is_dir():
            return parent
    raise RuntimeError(f"could not locate repo root above {here}")


REPO_ROOT = _repo_root()
GRADIENT_TABLE = (
    REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "eulerian-smoke-diff-gradient.json"
)


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def gradient_table() -> Path:
    return GRADIENT_TABLE
