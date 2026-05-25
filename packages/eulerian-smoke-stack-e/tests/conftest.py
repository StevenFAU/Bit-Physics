"""Shared paths + fixtures for eulerian-smoke Stack-E acceptance tests.

Stage 1b produces TWO Stack-E canonical captures at
``captures/eulerian-smoke-stack-e/<descriptor>.{h5,json}`` for the Phase-1-frozen
NumPy-reference descriptors (D4 -- full canonical step horizons for both):

  - ``taylor-green-128cube-seed42-step500`` (3D; 738 MB, held local per D14)
  - ``lid-driven-cavity-128sq-re100-seed42-step1000`` (2D; the 4.4 MB
    schema-corpus representative-subset)

The NumPy-reference captures at ``captures/eulerian-smoke-ref/...`` are the
cross-stack equivalence partners (gate 14; Stage 1c) -- the same frozen Phase-1
reference the Stack-D port diffs against (stack-agnostic descriptor per § 1.9.3).

The package is NOT yet a uv-workspace member at Stage 1a (root registration is
Stage 1b per charter § 4); the ``sys.path`` insertion below makes the on-disk
package importable so the ``tests/`` collect to a clean ``ModuleNotFoundError``
on the absent ``reference`` / ``sim`` / ``invariants`` submodules (the gate-13
RED anchor). Paths resolve relative to the workspace root regardless of pytest cwd.
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

# Stack-E captures (Stage 1b deliverable; the gate-14 RIGHT/candidate partner).
STACK_E_CAPTURE_DIR = REPO_ROOT / "captures" / "eulerian-smoke-stack-e"

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
def stack_e_taylor_green_manifest_path() -> Path:
    return STACK_E_CAPTURE_DIR / f"{DESCRIPTOR_3D}.json"


@pytest.fixture(scope="session")
def stack_e_lid_driven_cavity_manifest_path() -> Path:
    return STACK_E_CAPTURE_DIR / f"{DESCRIPTOR_2D}.json"
