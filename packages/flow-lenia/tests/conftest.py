"""Shared paths + fixtures for flow-lenia acceptance tests.

Stage 1b produces the conservation golden table
(``tools/testkit/golden/tables/flow-lenia-conservation.json``), the determinism registry row, and
the canonical rollout capture under ``captures/flow-lenia-ref/``. Stage 1a's failing tests assert
these 1b deliverables exist (RED until 1b authors them).
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
GOLDEN_TABLE = (
    REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "flow-lenia-conservation.json"
)
CANONICAL_DESCRIPTOR = "flow-lenia-32sq-seed42-step40"
CANONICAL_DIR = REPO_ROOT / "captures" / "flow-lenia-ref"
CANONICAL_MANIFEST = CANONICAL_DIR / f"{CANONICAL_DESCRIPTOR}.json"
CANONICAL_PAYLOAD = CANONICAL_DIR / f"{CANONICAL_DESCRIPTOR}.h5"


@pytest.fixture(scope="session", autouse=True)
def _init_taichi_deterministic() -> None:
    """Initialise Taichi (CPU, single-thread, deterministic) once per session.

    Tests that call the ``flow_lenia._taichi_kernels`` kernels directly (the A2/A3 conservation
    anchors) need Taichi materialised; without this the result depends on whether an earlier test
    instantiated a sim first (order-dependent under pytest). Mirrors the sim's ``_ensure_taichi``.
    """
    from common_py.determinism import Config as DeterminismConfig
    from common_py.determinism import set_taichi_deterministic

    set_taichi_deterministic(DeterminismConfig(deterministic=True, seed=42), arch="cpu")


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def golden_table() -> Path:
    return GOLDEN_TABLE


@pytest.fixture(scope="session")
def canonical_manifest_path() -> Path:
    return CANONICAL_MANIFEST


@pytest.fixture(scope="session")
def canonical_payload_path() -> Path:
    return CANONICAL_PAYLOAD
