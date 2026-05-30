"""Producer-coverage tests for the golden-table GENERATORS (B-2a generalization).

The back-test re-audit found `sph_water_dfsph_generator` scored 0.000 because its
runner tested the frozen TABLE, not the GENERATOR. The generalization pass
(`findings-ledger.md` B-2a "THEN GENERALIZE") audited every generator under
`tools/testkit/golden/generator/` and found the same shape on 7 more:
- BAD (no test called the producer): boids_3agent_step1, mandelbulb_de_samples,
  mls_mpm_quadratic_bspline, physarum_deposit_step1
- WEAK (only sim-side / C++ tests, never the generator): d3q19_equilibrium,
  lorenz_structural, cloth_catenary

Each generator owns a recompute-and-compare path (`verify()` for the uniform six;
`build_hanging`/`build_stretched` dict-equality for cloth). These tests exercise
THE GENERATOR: a mutation to any compute step diverges from the committed table
(`verify` returns 1 / the rebuilt dict differs), and the missing/wrong-table
cases constrain the failure-detection branch. This source tree is the
`golden` mutation target's path, so these tests raise that target too.

cubic_spline + dfsph_density_evolution already have producer tests
(test_generator.py, test_dfsph_density_generator.py) and are not duplicated here.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from golden.generator import (
    boids_3agent_step1,
    cloth_catenary,
    mandelbulb_de_samples,
    mls_mpm_quadratic_bspline,
    physarum_deposit_step1,
)
from golden.generator import d3q19_equilibrium as d3q19
from golden.generator import lorenz_structural as lorenz

# The six generators sharing the uniform compute_canonical / verify(table) API.
_UNIFORM = {
    "boids_3agent_step1": boids_3agent_step1,
    "mandelbulb_de_samples": mandelbulb_de_samples,
    "mls_mpm_quadratic_bspline": mls_mpm_quadratic_bspline,
    "physarum_deposit_step1": physarum_deposit_step1,
    "d3q19_equilibrium": d3q19,
    "lorenz_structural": lorenz,
}


def _bump_first_numeric(obj: Any) -> bool:
    """Mutate the first float/int leaf in-place by +1.0. Returns True if done."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                obj[k] = v + 1.0
                return True
            if _bump_first_numeric(v):
                return True
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                obj[i] = v + 1.0
                return True
            if _bump_first_numeric(v):
                return True
    return False


@pytest.mark.parametrize("name", sorted(_UNIFORM))
def test_generator_verify_passes_on_committed_table(name: str) -> None:
    """gen.verify() recomputes via compute_canonical and matches the table."""
    gen = _UNIFORM[name]
    assert gen.verify() == 0
    assert gen.TABLE_PATH.exists()


@pytest.mark.parametrize("name", sorted(_UNIFORM))
def test_generator_compute_canonical_is_nonempty(name: str) -> None:
    """compute_canonical returns a populated mapping (catches a gutted producer)."""
    gen = _UNIFORM[name]
    out = gen.compute_canonical()
    assert isinstance(out, dict)
    assert len(out) >= 1


@pytest.mark.parametrize("name", sorted(_UNIFORM))
def test_generator_verify_reports_missing_table(name: str, tmp_path: Path) -> None:
    """verify() returns 1 (not 0) when the table file is absent."""
    gen = _UNIFORM[name]
    assert gen.verify(tmp_path / f"{name}-absent.json") == 1


@pytest.mark.parametrize("name", sorted(_UNIFORM))
def test_generator_verify_rejects_a_perturbed_table(name: str, tmp_path: Path) -> None:
    """verify() returns 1 when one expected value diverges from the recomputation.

    Constrains the per-key divergence loop, the tolerance comparison, and the
    non-zero return — the producer must actually CHECK its output against the
    table, not rubber-stamp it.
    """
    gen = _UNIFORM[name]
    with gen.TABLE_PATH.open(encoding="utf-8") as fh:
        table = json.load(fh)
    perturbed = copy.deepcopy(table)
    assert _bump_first_numeric(perturbed["test_points"][0]["expected"]), (
        f"{name}: no numeric leaf found to perturb"
    )
    bad = tmp_path / f"{name}-wrong.json"
    with bad.open("w", encoding="utf-8") as fh:
        json.dump(perturbed, fh)
    assert gen.verify(bad) == 1


# --- cloth_catenary: build_*() dict-equality (different producer shape) ---


def test_cloth_build_hanging_reproduces_committed_table() -> None:
    """build_hanging() regenerates the committed cloth-hanging table exactly."""
    on_disk = json.loads(cloth_catenary.HANGING_PATH.read_text(encoding="utf-8"))
    assert cloth_catenary.build_hanging() == on_disk


def test_cloth_build_stretched_reproduces_committed_table() -> None:
    """build_stretched() regenerates the committed cloth-stretched table exactly."""
    on_disk = json.loads(cloth_catenary.STRETCHED_PATH.read_text(encoding="utf-8"))
    assert cloth_catenary.build_stretched() == on_disk


def test_cloth_build_hanging_is_nontrivial() -> None:
    """A gutted build_hanging (empty / no test_points) is caught."""
    table = cloth_catenary.build_hanging()
    assert isinstance(table, dict)
    assert table.get("test_points"), "build_hanging produced no test_points"
