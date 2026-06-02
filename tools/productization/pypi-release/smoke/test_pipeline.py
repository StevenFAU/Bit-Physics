"""Phase-5 pypi-release smoke harness (TDD; phase plan § 2.1 gate 3).

These are the fast, CI-runnable contract tests for the pypi-release pipeline:
discovery of the qualifying ``pypi:true`` pool, per-sim validation routing,
the pyproject linter, and the results-JSON schema (§ 5.5). The heavy
fresh-venv bootstrap round-trip (§ 3.8 / Appendix D STEP 5a) is exercised by
``run_pipeline_for_sim`` and gated behind ``BIT_PHYSICS_PYPI_BOOTSTRAP=1`` so
the default smoke run stays fast; the per-sim matrix job runs it for real.

Authored BEFORE the implementation (spec § 1.3): this module fails at import
(no ``pipeline`` / ``lint`` module) until STEP 5 lands them.
"""

from __future__ import annotations

import os

import pytest

import lint
import pipeline


# --- Discovery -------------------------------------------------------------


def test_discover_returns_sim_specs() -> None:
    sims = pipeline.discover_qualifying_sims()
    assert sims, "expected a non-empty qualifying pool"
    for s in sims:
        assert isinstance(s, pipeline.SimSpec)
        assert s.name and s.category and s.stack in {"B", "C", "D", "E"}
        assert s.path.exists()


def test_discover_includes_pypi_true_canonicals() -> None:
    names = {s.name for s in pipeline.discover_qualifying_sims()}
    # The seven §13 pypi:true canonical sims.
    for expected in (
        "ising-classical",
        "lenia",
        "neural-ca",
        "mpm-multimaterial",
        "pinn-poisson",
        "3dgs-mpm",
        "articulated-pedagogical",
    ):
        assert expected in names, f"{expected} must qualify (§13 pypi:true)"


def test_discover_includes_pypi_true_variants_and_frontier() -> None:
    names = {s.name for s in pipeline.discover_qualifying_sims()}
    for expected in (
        "lenia-diff",
        "particle-lenia",
        "flow-lenia",
        "mpm-multimaterial-stack-d",
        "mpm-multimaterial-stack-e",
        "mpm-multimaterial-diff",
        "articulated-pedagogical-diff",
        "3dgs-mpm-sh-update",
    ):
        assert expected in names, f"{expected} inherits a pypi:true canonical"


def test_discover_excludes_pypi_false_families() -> None:
    names = {s.name for s in pipeline.discover_qualifying_sims()}
    # Canonical pypi:false → whole family DEFERRED (inheritance), incl. their
    # Stack-D/E ports whose canonical opted out.
    for excluded in (
        "eulerian-smoke",
        "eulerian-smoke-stack-d",
        "reaction-diffusion-2d",
        "reaction-diffusion-3d",
        "lattice-boltzmann-d3q19",
        "sph-water",
        "boids-3d",
        "physarum",
        "mandelbulb-explorer",
        "strange-attractors",
    ):
        assert excluded not in names, f"{excluded} is pypi:false → DEFERRED"


# --- Per-sim validation routing -------------------------------------------


def test_every_qualifying_sim_has_validation_routing() -> None:
    for s in pipeline.discover_qualifying_sims():
        route = pipeline.validation_route(s.name)
        assert route is not None, f"no validation route for {s.name}"
        assert route["method"] in {"capture_roundtrip", "golden_table_surrogate"}
        if route["method"] == "capture_roundtrip":
            assert route.get("reemit"), f"{s.name} round-trip needs a re-emit surface"
            assert route.get("canonical"), (
                f"{s.name} round-trip needs a canonical capture"
            )


def test_capture_roundtrip_canonicals_exist_on_disk() -> None:
    for s in pipeline.discover_qualifying_sims():
        route = pipeline.validation_route(s.name)
        if route["method"] == "capture_roundtrip":
            assert (pipeline.REPO_ROOT / route["canonical"]).exists(), (
                f"{s.name} canonical capture missing: {route['canonical']}"
            )


# --- pyproject linter ------------------------------------------------------


def test_lint_flags_missing_required_fields() -> None:
    bad = {"project": {"name": "x"}}  # missing version/license/deps
    issues = lint.lint_pyproject(bad, sim_name="x")
    codes = {i.code for i in issues}
    assert "missing-version" in codes
    assert "missing-license" in codes
    assert any(i.severity == "fail" for i in issues)


def test_lint_namespace_divergence_is_shifted_not_fail() -> None:
    # Real sims ship plain names (e.g. "ising-classical"), NOT the spec § 4.6
    # bit-physics-<category>-<sim> namespace. That is a SHIFTED finding, never
    # a fail — "Phase 5 does not patch sims".
    doc = {
        "project": {
            "name": "ising-classical",
            "version": "0.0.0",
            "license": {"file": "../../LICENSE"},
            "dependencies": ["numpy>=2.0"],
            "classifiers": ["Programming Language :: Python :: 3.12"],
        },
        "build-system": {"requires": ["hatchling"], "build-backend": "hatchling.build"},
    }
    issues = lint.lint_pyproject(doc, sim_name="ising-classical")
    ns = [i for i in issues if i.code == "namespace-divergence"]
    assert ns and ns[0].severity == "shifted"
    assert all(i.severity != "fail" for i in issues)


# --- Results JSON schema (§ 5.5) ------------------------------------------


def test_results_json_has_required_keys() -> None:
    results = [
        pipeline.PipelineResult(
            sim=pipeline.SimSpec(
                name="ising-classical",
                category="lattice-spin",
                stack="D",
                path=pipeline.REPO_ROOT / "packages/ising-classical",
                metadata={},
            ),
            status="pass",
            artifact_path=None,
            capture_validated=True,
            duration_seconds=1.0,
            notes="ok",
        )
    ]
    payload = pipeline.results_to_json(
        results, sub_phase="pypi-release", commit_sha="deadbeef"
    )
    for key in (
        "sub_phase",
        "commit_sha",
        "qualifying_sims",
        "non_qualifying",
        "sim_results",
        "overall_status",
        "deferred_count",
        "fail_count",
        "pass_count",
    ):
        assert key in payload
    assert payload["overall_status"] == "pass"
    assert payload["pass_count"] == 1


# --- Heavy end-to-end bootstrap (gated; the matrix runs it per-sim) -------


@pytest.mark.skipif(
    os.environ.get("BIT_PHYSICS_PYPI_BOOTSTRAP") != "1",
    reason="fresh-venv bootstrap is slow; set BIT_PHYSICS_PYPI_BOOTSTRAP=1 to run",
)
def test_bootstrap_ising_classical_roundtrip(tmp_path) -> None:
    s = next(
        s for s in pipeline.discover_qualifying_sims() if s.name == "ising-classical"
    )
    result = pipeline.run_pipeline_for_sim(s, tmp_path)
    assert result.status == "pass", result.notes
    assert result.capture_validated
