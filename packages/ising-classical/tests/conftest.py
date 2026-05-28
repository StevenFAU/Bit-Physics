"""Shared paths + fixtures for Ising-classical acceptance tests.

The canonical capture lives at repo-root
``captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}``
(descriptor LOCKED per spec Appendix D § D.2.3). Stage 1a's failing
tests do NOT touch the canonical capture (it doesn't exist yet); Stage
1b produces it via ``sim_runner_seeded`` + ``capture.write_capture``.

Tests resolve paths relative to the workspace root regardless of
pytest cwd.
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
CANONICAL_DESCRIPTOR = "metropolis-128sq-T2.27-seed42-step10000"
CANONICAL_DIR = REPO_ROOT / "captures" / "ising-classical-ref"
CANONICAL_MANIFEST = CANONICAL_DIR / f"{CANONICAL_DESCRIPTOR}.json"
CANONICAL_PAYLOAD = CANONICAL_DIR / f"{CANONICAL_DESCRIPTOR}.h5"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def canonical_manifest_path() -> Path:
    return CANONICAL_MANIFEST


@pytest.fixture(scope="session")
def canonical_payload_path() -> Path:
    return CANONICAL_PAYLOAD
