"""Shared paths + fixtures for articulated-pedagogical acceptance tests.

Stage 1b produces the canonical capture at
``captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.{h5,json}``
via the common-warp batch ``Capture`` API. Stage 1a's failing tests do NOT touch
the canonical capture (it does not exist yet); they exercise the shells and
assert the ``NotImplementedError`` failure mode per charter §2 Stage 1a.
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
CANONICAL_DESCRIPTOR = "pendulum-trajectory-seed42-step1000"
CANONICAL_DIR = REPO_ROOT / "captures" / "rigid-body-pedagogical-ref"
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
