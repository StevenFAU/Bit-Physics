"""Shared fixtures for ``eulerian-smoke-neural`` (import package ``eulerian_smoke_neural``).

Gate-4 sources tolerances from the schema-validated canonical tables, never hard-codes them:
``coupling_tolerance`` reads ``[golden_tolerance.neural-rendered.eulerian-smoke-neural]`` and
``render_similarity_tolerance`` reads ``[render_similarity.neural-rendered.eulerian-smoke-neural]``
from ``tools/testkit/equivalence/tolerance.toml``; ``coupling_golden`` loads the numerical
coupling golden table.
"""

from __future__ import annotations

import json
import tomllib
from pathlib import Path
from typing import Any

import pytest
import warp as wp
from hypothesis import Phase, settings

# Deterministic gate-13 evidence: suppress Warp's module-load stdout chatter (timing varies
# run-to-run and would otherwise perturb the failing-tests-output hash). Set before any
# @wp.kernel module loads. (The Sim-A 3dgs-mpm-sh-update lesson, pre-applied.)
# Numerics-free (log-verbosity only; touches no kernel/array/RNG state). Version-adaptive:
# the 1.13.0 authoring pin uses `wp.config.quiet`; a newer Warp (resolved by the
# `>=1.13,<2.0` floor in a fresh venv) DEPRECATED `quiet` in favor of `wp.config.log_level`
# and promotes the DeprecationWarning to a collection-abort error under `filterwarnings=
# ["error"]`. `wp.config.log_level` / `wp.LOG_WARNING` do NOT exist on 1.13.0, so a bare
# swap would AttributeError on the pin — set whichever knob the installed Warp exposes.
if hasattr(wp.config, "log_level"):
    wp.config.log_level = wp.LOG_WARNING  # newer Warp: the sanctioned replacement
else:
    wp.config.quiet = True  # warp 1.13.0 (authoring pin): predates the log_level API

# Deterministic gate-13 evidence (Hypothesis): disable the example DATABASE (so a cached vs
# fresh `.hypothesis/` does not change which example is reported) and the EXPLAIN phase (whose
# "# or any other generated value" annotation is non-deterministic across fresh-vs-cached DBs).
# The structural RED (per-test outcome + traceback) is what the failing-tests hash attests.
settings.register_profile(
    "bitphysics_det",
    database=None,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target, Phase.shrink),
)
settings.load_profile("bitphysics_det")

_REPO_ROOT = Path(__file__).resolve().parents[3]
_TOLERANCE_TOML = _REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"
_COUPLING_GOLDEN = (
    _REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "eulerian-smoke-neural-coupling.json"
)
_GOLDEN_RENDERS = _REPO_ROOT / "tools" / "testkit" / "golden" / "renders"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return _REPO_ROOT


@pytest.fixture(scope="session")
def coupling_tolerance() -> dict[str, float]:
    """Locked numerical coupling-correctness tolerances (Prong 1)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["golden_tolerance"]["neural-rendered"]["eulerian-smoke-neural"]


@pytest.fixture(scope="session")
def render_similarity_tolerance() -> dict[str, float]:
    """Locked perceptual render-similarity bounds (Prong 2; the §2.12 floors)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["render_similarity"]["neural-rendered"]["eulerian-smoke-neural"]


@pytest.fixture(scope="session")
def coupling_golden() -> dict[str, Any]:
    """The numerical coupling golden table (≥3 anchors)."""
    return json.loads(_COUPLING_GOLDEN.read_text())


@pytest.fixture(scope="session")
def golden_renders_dir() -> Path:
    return _GOLDEN_RENDERS
