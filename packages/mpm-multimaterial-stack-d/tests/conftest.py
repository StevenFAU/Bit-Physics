"""Shared paths + fixtures for mpm-multimaterial Stack-D acceptance tests.

Stage 1b produces ONE Stack-D canonical capture at
``captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.{h5,json}``
for the Phase-1-frozen NumPy+numba-reference descriptor (D4 ratification --
the full canonical step-500 horizon, ONE capture).

The NumPy+numba-reference capture at ``captures/mpm-ref/...`` is the cross-stack
equivalence partner (gate 14; Stage 1c) -- NOT a GPU Stack-B/Stack-C capture
(the spec-designated Stack-E Warp port is unimplemented; the frozen diff
partner is the Phase-1 CPU reference, the sph-water/LBM Stack-D pattern).

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

# Stack-D capture (Stage 1b deliverable; the gate-14 RIGHT/candidate partner).
STACK_D_CAPTURE_DIR = REPO_ROOT / "captures" / "mpm-multimaterial-stack-d"

# NumPy+numba-reference capture (the gate-14 LEFT/reference partner).
REF_CAPTURE_DIR = REPO_ROOT / "captures" / "mpm-ref"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def ref_manifest_path() -> Path:
    return REF_CAPTURE_DIR / f"{DESCRIPTOR}.json"


@pytest.fixture(scope="session")
def stack_d_manifest_path() -> Path:
    return STACK_D_CAPTURE_DIR / f"{DESCRIPTOR}.json"
