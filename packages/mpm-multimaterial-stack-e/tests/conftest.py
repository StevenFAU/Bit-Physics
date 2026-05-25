"""Shared paths + fixtures for mpm-multimaterial Stack-E acceptance tests.

Stage 1b produces the Stack-E canonical capture at
``captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.{h5,json}``
(the gate-14 RIGHT/candidate partner). The NumPy+numba-reference capture at
``captures/mpm-ref/...`` is the cross-stack equivalence partner (gate-14;
Stage 1c) -- the same frozen Phase-1 reference the Stack-D port diffs against
(stack-agnostic descriptor per § 1.9.3).

Paths resolve relative to the workspace root regardless of pytest cwd.
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

DESCRIPTOR = "drop-impact-128cube-seed42-step500"

# Stack-E capture (Stage 1b deliverable; the gate-14 RIGHT/candidate partner).
STACK_E_CAPTURE_DIR = REPO_ROOT / "captures" / "mpm-multimaterial-stack-e"

# NumPy+numba-reference capture (the gate-14 LEFT/reference partner).
REF_CAPTURE_DIR = REPO_ROOT / "captures" / "mpm-ref"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def ref_manifest_path() -> Path:
    return REF_CAPTURE_DIR / f"{DESCRIPTOR}.json"


@pytest.fixture(scope="session")
def stack_e_manifest_path() -> Path:
    return STACK_E_CAPTURE_DIR / f"{DESCRIPTOR}.json"
