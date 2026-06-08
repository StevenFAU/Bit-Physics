"""Phase-5 binary-release smoke harness (TDD; phase plan § 2.1 gate 3).

Fast, CI-runnable contract tests for the binary-release pipeline: discovery of
the qualifying Stack-C CMake pool (§ 6.2), per-package bootstrap-validation
routing (§ 3.8 / R1 + R3), the CMakeLists linter, and the results-JSON schema
(§ 5.5). The heavy bootstrap gate (clean CMake build → run the capture binary →
``compare_captures`` round-trip / in-binary witness + PBT surrogate) is exercised
by ``run_pipeline_for_sim`` and gated behind ``BIT_PHYSICS_BINARY_BOOTSTRAP=1``
so the default smoke run stays fast; the per-package matrix job runs it for real.

Authored BEFORE the implementation (spec § 1.3): this module fails at import
(no ``pipeline`` / ``lint`` module) until STEP 5 lands them.
"""

from __future__ import annotations

import os

import lint
import pipeline
import pytest

# --- Discovery -------------------------------------------------------------


def test_discover_returns_sim_specs() -> None:
    sims = pipeline.discover_qualifying_sims()
    assert sims, "expected a non-empty qualifying CMake pool"
    for s in sims:
        assert isinstance(s, pipeline.SimSpec)
        assert s.name and s.category
        assert s.stack == "C", "every binary-release sim is Stack-C (C++/Vulkan)"
        assert s.path.exists()
        assert (s.path / "CMakeLists.txt").exists()


def test_discover_is_exactly_the_two_cmake_packages() -> None:
    # MEASURED scope (reconciliation §C): exactly two packages carry a Stack-C
    # CMake build with a headless capture target. rd2d-stack-c (full round-trip)
    # + mass-spring-cloth (witness + PBT surrogate). If a third C++ package turns
    # up, this test fails LOUDLY (a §0.3 SHIFT to surface, not silently absorb).
    names = {s.name for s in pipeline.discover_qualifying_sims()}
    assert names == {"reaction-diffusion-2d-stack-c", "mass-spring-cloth"}, (
        f"binary-release pool drifted from the reconciliation-§C 2-package scope: {names}"
    )


def test_discover_excludes_python_only_binary_true_canonicals() -> None:
    # The four Python-only binary:true canonical sims (sph-water, eulerian-smoke,
    # lattice-boltzmann-d3q19, reaction-diffusion-3d) have NO CMakeLists → they
    # ship via 5.3 (pypi), NOT 5.2. They must not appear in the binary pool.
    names = {s.name for s in pipeline.discover_qualifying_sims()}
    for excluded in (
        "sph-water",
        "eulerian-smoke",
        "lattice-boltzmann-d3q19",
        "reaction-diffusion-3d",
    ):
        assert excluded not in names, (
            f"{excluded} is Python-only (no CMake) → 5.3, not 5.2"
        )


# --- Per-package validation routing ---------------------------------------


def test_every_qualifying_sim_has_validation_routing() -> None:
    for s in pipeline.discover_qualifying_sims():
        route = pipeline.validation_route(s.name)
        assert route is not None, f"no validation route for {s.name}"
        assert route["method"] in {"capture_roundtrip", "witness_pbt_surrogate"}
        assert route.get("target"), f"{s.name} needs a CMake capture target"
        if route["method"] == "capture_roundtrip":
            assert route.get("canonical"), (
                f"{s.name} round-trip needs an in-repo canonical capture"
            )


def test_capture_roundtrip_canonicals_exist_on_disk() -> None:
    for s in pipeline.discover_qualifying_sims():
        route = pipeline.validation_route(s.name)
        if route["method"] == "capture_roundtrip":
            assert (pipeline.REPO_ROOT / route["canonical"]).exists(), (
                f"{s.name} canonical capture missing: {route['canonical']}"
            )


def test_cloth_is_witness_pbt_surrogate_not_fabricated_tolerance() -> None:
    # The soft-body cloth has no NumPy oracle and no compare_captures tolerance op;
    # its § 3.8 gate is the in-binary 2-run determinism witness + the Hypothesis PBT
    # re-check (reconciliation §R3) — NEVER a fabricated tolerance row.
    route = pipeline.validation_route("mass-spring-cloth")
    assert route["method"] == "witness_pbt_surrogate"
    assert route.get("pbt"), "cloth surrogate must name its PBT driver"
    assert "canonical" not in route or route.get("payload_checksum_gated") is False


# --- CMakeLists linter -----------------------------------------------------


def test_lint_flags_missing_capture_target() -> None:
    bad = "add_library(foo src/foo.cpp)\n"  # no *_capture executable
    issues = lint.lint_cmakelists(bad, sim_name="foo")
    codes = {i.code for i in issues}
    assert "missing-capture-target" in codes
    assert any(i.severity == "fail" for i in issues)


def test_lint_passes_a_well_formed_capture_cmakelists() -> None:
    good = (
        "add_executable(bit_physics_foo_capture src/foo_capture_main.cpp)\n"
        "target_compile_features(bit_physics_foo PUBLIC cxx_std_20)\n"
    )
    issues = lint.lint_cmakelists(good, sim_name="foo")
    assert all(i.severity != "fail" for i in issues)


# --- Results JSON schema (§ 5.5) ------------------------------------------


def test_results_json_has_required_keys() -> None:
    results = [
        pipeline.PipelineResult(
            sim=pipeline.SimSpec(
                name="reaction-diffusion-2d-stack-c",
                category="continuous-ca",
                stack="C",
                path=pipeline.REPO_ROOT / "packages/reaction-diffusion-2d-stack-c",
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
        results, sub_phase="binary-release", commit_sha="deadbeef"
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


# --- Heavy end-to-end bootstrap (gated; the matrix runs it per-package) ---


@pytest.mark.skipif(
    os.environ.get("BIT_PHYSICS_BINARY_BOOTSTRAP") != "1",
    reason="clean CMake build + bootstrap is slow; set BIT_PHYSICS_BINARY_BOOTSTRAP=1 to run",
)
def test_bootstrap_rd2d_stack_c_roundtrip(tmp_path) -> None:
    s = next(
        s
        for s in pipeline.discover_qualifying_sims()
        if s.name == "reaction-diffusion-2d-stack-c"
    )
    result = pipeline.run_pipeline_for_sim(s, tmp_path)
    assert result.status == "pass", result.notes
    assert result.capture_validated
