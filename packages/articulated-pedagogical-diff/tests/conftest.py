"""Shared paths + fixtures for articulated-pedagogical-diff acceptance tests.

Stage 1b produces the gradient golden table
(``tools/testkit/golden/tables/articulated-pedagogical-diff-gradient.json``), the determinism
registry rows, and the canonical inverse-solution capture under
``captures/articulated-pedagogical-diff-ref/``. Stage 1a's failing tests assert these 1b
deliverables exist (RED until 1b authors them).
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
    REPO_ROOT
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "articulated-pedagogical-diff-gradient.json"
)
CANONICAL_DESCRIPTOR = "articulated-pedagogical-diff-recover-state-seed42"
CANONICAL_DIR = REPO_ROOT / "captures" / "articulated-pedagogical-diff-ref"
CANONICAL_MANIFEST = CANONICAL_DIR / f"{CANONICAL_DESCRIPTOR}.json"
CANONICAL_PAYLOAD = CANONICAL_DIR / f"{CANONICAL_DESCRIPTOR}.h5"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def gradient_table() -> Path:
    return GRADIENT_TABLE


@pytest.fixture(scope="session")
def canonical_manifest_path() -> Path:
    return CANONICAL_MANIFEST


@pytest.fixture(scope="session")
def canonical_payload_path() -> Path:
    return CANONICAL_PAYLOAD
