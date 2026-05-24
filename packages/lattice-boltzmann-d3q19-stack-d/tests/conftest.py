"""Shared paths + fixtures for lattice-boltzmann-d3q19 Stack-D acceptance tests.

Stage 1b produces TWO Stack-D canonical captures at
``captures/lattice-boltzmann-d3q19-stack-d/<descriptor>.{h5,json}`` for the
Phase-1-frozen NumPy-reference descriptors (D4 ratification -- full canonical
step horizons for both):

  - ``poiseuille-64x32-seed42-step1000``
  - ``couette-32x16-seed42-step500``

The NumPy-reference captures at ``captures/lbm-ref/...`` are the cross-stack
equivalence partners (gate 14; Stage 1c) -- NOT a GPU Stack-B/Stack-C capture
(the spec-designated Stack-C Vulkan primary is unimplemented; the frozen diff
partner is the Phase-1 CPU reference, the sph-water/RD-2D Stack-D pattern).

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

DESCRIPTOR_POISEUILLE = "poiseuille-64x32-seed42-step1000"
DESCRIPTOR_COUETTE = "couette-32x16-seed42-step500"

# Stack-D captures (Stage 1b deliverable; the gate-14 RIGHT/candidate partner).
STACK_D_CAPTURE_DIR = REPO_ROOT / "captures" / "lattice-boltzmann-d3q19-stack-d"

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
def stack_d_poiseuille_manifest_path() -> Path:
    return STACK_D_CAPTURE_DIR / f"{DESCRIPTOR_POISEUILLE}.json"


@pytest.fixture(scope="session")
def stack_d_couette_manifest_path() -> Path:
    return STACK_D_CAPTURE_DIR / f"{DESCRIPTOR_COUETTE}.json"
