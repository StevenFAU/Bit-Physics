"""Shared paths + fixtures for RD-2D Stack-D acceptance tests.

The Stage 1b implementation will produce a Stack-D canonical capture at
``captures/reaction-diffusion-2d-stack-d/<descriptor>.{h5,json}`` (where
``<descriptor>`` matches the HEAD-frozen Stack-B descriptor
``gray-scott-lambda-128sq-seed42-step2000`` per probe § 6.1; D4
ratification). The Stack-B reference capture at
``captures/reaction-diffusion-2d-ref/...`` is the cross-stack equivalence
partner (gate 14; Stage 1c).

Tests resolve paths relative to the workspace root regardless of pytest
cwd.
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
CANONICAL_DESCRIPTOR = "gray-scott-lambda-128sq-seed42-step2000"

STACK_D_CAPTURE_DIR = REPO_ROOT / "captures" / "reaction-diffusion-2d-stack-d"
STACK_D_MANIFEST = STACK_D_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.json"
STACK_D_PAYLOAD = STACK_D_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.h5"

STACK_B_CAPTURE_DIR = REPO_ROOT / "captures" / "reaction-diffusion-2d-ref"
STACK_B_MANIFEST = STACK_B_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.json"
STACK_B_PAYLOAD = STACK_B_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.h5"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def stack_d_manifest_path() -> Path:
    return STACK_D_MANIFEST


@pytest.fixture(scope="session")
def stack_d_payload_path() -> Path:
    return STACK_D_PAYLOAD


@pytest.fixture(scope="session")
def stack_b_manifest_path() -> Path:
    return STACK_B_MANIFEST


@pytest.fixture(scope="session")
def stack_b_payload_path() -> Path:
    return STACK_B_PAYLOAD
