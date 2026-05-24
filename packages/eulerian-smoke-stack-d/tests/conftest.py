"""Shared paths + fixtures for eulerian-smoke Stack-D acceptance tests.

Stage 1 produces TWO Stack-D canonical captures at
``captures/eulerian-smoke-stack-d/<descriptor>.{h5,json}`` for the Phase-1-frozen
NumPy-reference descriptors (D4 ratification -- full canonical step horizons for
both):

  - ``taylor-green-128cube-seed42-step500`` (3D)
  - ``lid-driven-cavity-128sq-re100-seed42-step1000`` (2D)

The NumPy-reference captures at ``captures/eulerian-smoke-ref/...`` are the
cross-stack equivalence partners (gate 14) -- NOT a GPU Stack-B/Stack-C capture
(the spec-designated Stack-C Vulkan primary is unimplemented; the frozen diff
partner is the Phase-1 CPU reference, the sph-water/LBM/MPM Stack-D pattern).

Paths resolve relative to the workspace root regardless of pytest cwd.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PKG_ROOT = Path(__file__).resolve().parent.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() and (parent / "tools" / "testkit").is_dir():
            return parent
    raise RuntimeError(f"could not locate repo root above {here}")


REPO_ROOT = _repo_root()

DESCRIPTOR_3D = "taylor-green-128cube-seed42-step500"
DESCRIPTOR_2D = "lid-driven-cavity-128sq-re100-seed42-step1000"

# Stack-D captures (Stage 1 deliverable; the gate-14 RIGHT/candidate partner).
STACK_D_CAPTURE_DIR = REPO_ROOT / "captures" / "eulerian-smoke-stack-d"

# NumPy-reference captures (the gate-14 LEFT/reference partner).
REF_CAPTURE_DIR = REPO_ROOT / "captures" / "eulerian-smoke-ref"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def ref_taylor_green_manifest_path() -> Path:
    return REF_CAPTURE_DIR / f"{DESCRIPTOR_3D}.json"


@pytest.fixture(scope="session")
def ref_lid_driven_cavity_manifest_path() -> Path:
    return REF_CAPTURE_DIR / f"{DESCRIPTOR_2D}.json"


@pytest.fixture(scope="session")
def stack_d_taylor_green_manifest_path() -> Path:
    return STACK_D_CAPTURE_DIR / f"{DESCRIPTOR_3D}.json"


@pytest.fixture(scope="session")
def stack_d_lid_driven_cavity_manifest_path() -> Path:
    return STACK_D_CAPTURE_DIR / f"{DESCRIPTOR_2D}.json"
