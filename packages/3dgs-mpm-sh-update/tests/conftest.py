"""Shared fixtures for ``3dgs-mpm-sh-update`` (import package ``gs_mpm_sh_update``).

Gate-4 sources tolerances from the schema-validated canonical tables, never hard-codes them:
``sh_rotation_tolerance`` reads ``[golden_tolerance.neural-rendered.3dgs-mpm-sh-update]`` and
``render_similarity_tolerance`` reads ``[render_similarity.neural-rendered.3dgs-mpm-sh-update]``
from ``tools/testkit/equivalence/tolerance.toml``; ``sh_rotation_golden`` loads the numerical
SH-rotation golden table.
"""

from __future__ import annotations

import json
import tomllib
from pathlib import Path
from typing import Any

import pytest
import warp as wp

# Deterministic gate-13 evidence: suppress Warp's module-load stdout chatter ("Module X
# load on device 'cpu' took Y ms"), whose timing Y varies run-to-run and would otherwise
# perturb the failing-tests-output hash. Set before any @wp.kernel module loads.
wp.config.quiet = True

_REPO_ROOT = Path(__file__).resolve().parents[3]
_TOLERANCE_TOML = _REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"
_SH_GOLDEN = _REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "3dgs-mpm-sh-rotation.json"
_GOLDEN_RENDERS = _REPO_ROOT / "tools" / "testkit" / "golden" / "renders"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return _REPO_ROOT


@pytest.fixture(scope="session")
def sh_rotation_tolerance() -> dict[str, float]:
    """Locked numerical SH-rotation tolerances (Prong 1)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["golden_tolerance"]["neural-rendered"]["3dgs-mpm-sh-update"]


@pytest.fixture(scope="session")
def render_similarity_tolerance() -> dict[str, float]:
    """Locked perceptual render-similarity bounds (Prong 2; the §2.12 floors)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["render_similarity"]["neural-rendered"]["3dgs-mpm-sh-update"]


@pytest.fixture(scope="session")
def sh_rotation_golden() -> dict[str, Any]:
    """The numerical SH-rotation golden table (≥3 anchors)."""
    return json.loads(_SH_GOLDEN.read_text())


@pytest.fixture(scope="session")
def golden_renders_dir() -> Path:
    return _GOLDEN_RENDERS
