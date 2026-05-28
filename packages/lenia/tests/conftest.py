"""Shared paths + fixtures for Lenia acceptance tests.

Stage 1b will produce the canonical capture at
``captures/lenia/orbium-256sq-seed42-step1000.{h5,json}`` via
``common_py.capture.Writer``. Stage 1a's failing tests do NOT touch
the canonical capture (it doesn't exist yet); they merely import
the shells and assert the ``NotImplementedError`` failure mode per
``docs/phases/phase-3-plan.md:1337`` + charter §2 Stage 1a.

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
CANONICAL_DESCRIPTOR = "orbium-256sq-seed42-step1000"
CANONICAL_DIR = REPO_ROOT / "captures" / "lenia"
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
