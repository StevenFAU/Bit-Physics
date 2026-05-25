"""Shared paths + fixtures for lattice-boltzmann-d3q19 Stack-E acceptance tests.

Stage 1b produces TWO Stack-E canonical captures at
``captures/lattice-boltzmann-d3q19-stack-e/<descriptor>.{h5,json}`` for the
Phase-1-frozen NumPy-reference descriptors (D4 -- full canonical step horizons
for both; both <=256 MiB so both LFS-committable, no held-local, D14):

  - ``poiseuille-64x32-seed42-step1000`` (202 MB)
  - ``couette-32x16-seed42-step500`` (27 MB; the schema-corpus representative-subset)

The NumPy-reference captures at ``captures/lbm-ref/...`` are the cross-stack
equivalence partners (gate 14; Stage 1c) -- the same frozen Phase-1 reference the
Stack-D Taichi port diffs against (stack-agnostic descriptor per § 1.9.3).

The package is NOT yet a uv-workspace member at Stage 1a (root registration is
Stage 1b per charter § 4 / D2); the ``sys.path`` insertion below makes the
on-disk package importable so the ``tests/`` collect to a clean
``ModuleNotFoundError`` on the absent ``reference`` / ``sim`` / ``invariants``
submodules (the gate-13 RED anchor). Paths resolve relative to the workspace
root regardless of pytest cwd.
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

DESCRIPTOR_POISEUILLE = "poiseuille-64x32-seed42-step1000"
DESCRIPTOR_COUETTE = "couette-32x16-seed42-step500"

# Stack-E captures (Stage 1b deliverable; the gate-14 RIGHT/candidate partner).
STACK_E_CAPTURE_DIR = REPO_ROOT / "captures" / "lattice-boltzmann-d3q19-stack-e"

# NumPy-reference captures (the gate-14 LEFT/reference partner).
REF_CAPTURE_DIR = REPO_ROOT / "captures" / "lbm-ref"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def ref_poiseuille_manifest_path() -> Path:
    return REF_CAPTURE_DIR / f"{DESCRIPTOR_POISEUILLE}.json"


@pytest.fixture(scope="session")
def ref_couette_manifest_path() -> Path:
    return REF_CAPTURE_DIR / f"{DESCRIPTOR_COUETTE}.json"


@pytest.fixture(scope="session")
def stack_e_poiseuille_manifest_path() -> Path:
    return STACK_E_CAPTURE_DIR / f"{DESCRIPTOR_POISEUILLE}.json"


@pytest.fixture(scope="session")
def stack_e_couette_manifest_path() -> Path:
    return STACK_E_CAPTURE_DIR / f"{DESCRIPTOR_COUETTE}.json"
