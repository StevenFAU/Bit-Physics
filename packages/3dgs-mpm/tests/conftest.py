"""Shared fixtures for ``3dgs-mpm`` (import package ``gs_mpm``).

Gate-4 sources tolerances from the schema-validated canonical tables, never hard-codes
them: ``golden_tolerance`` reads ``[golden_tolerance.neural-rendered.3dgs-mpm]`` and
``render_similarity_tolerance`` reads ``[render_similarity.neural-rendered.3dgs-mpm]`` from
``tools/testkit/equivalence/tolerance.toml``; ``coupling_golden`` loads the numerical
coupling golden table.
"""

from __future__ import annotations

import json
import tomllib
from pathlib import Path
from typing import Any

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_TOLERANCE_TOML = _REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"
_COUPLING_GOLDEN = _REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "3dgs-mpm-coupling.json"
_GOLDEN_RENDERS = _REPO_ROOT / "tools" / "testkit" / "golden" / "renders"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    """Absolute repo-root path (tests may run with cwd at the package dir)."""
    return _REPO_ROOT


@pytest.fixture(scope="session")
def golden_tolerance() -> dict[str, float]:
    """Locked numerical coupling-correctness tolerances (Prong 1)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["golden_tolerance"]["neural-rendered"]["3dgs-mpm"]


@pytest.fixture(scope="session")
def render_similarity_tolerance() -> dict[str, float]:
    """Locked perceptual render-similarity bounds (Prong 2; the §2.12 floors)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["render_similarity"]["neural-rendered"]["3dgs-mpm"]


@pytest.fixture(scope="session")
def coupling_golden() -> dict[str, Any]:
    """The numerical coupling golden table (≥3 anchors)."""
    return json.loads(_COUPLING_GOLDEN.read_text())


@pytest.fixture(scope="session")
def golden_renders_dir() -> Path:
    """Directory of committed canonical golden render PNGs."""
    return _GOLDEN_RENDERS
