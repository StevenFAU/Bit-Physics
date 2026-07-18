"""TDD smoke tests for the Phase-5 web-deploy pipeline (sub-phase 5.1).

These exercise the parts of the browser-delivery pipeline that DO NOT require a
headless browser (unavailable in this environment — see the probe report § 4):

  * sim discovery (the qualifying Stack-B web frontends),
  * the smoke-results JSON contract (phase plan § 5.5),
  * `verify.py` — the per-sim gate applied to a browser-emitted capture — exercised
    against a browser-shaped bundle reconstructed from each sim's COMMITTED canonical,
    which proves the gate *harness* (parse → criterion → verdict) end-to-end without a
    browser. The browser-WebGPU emission itself is the cloud-CI gate (web-deploy.yml).
  * the no-widening guard: `verify.py`'s thresholds are byte-equal to the established
    `gpu_gate.py` gate (the web-build track), asserted against its source.

The `web-deploy/` dir is hyphenated (not importable); modules are loaded by path,
mirroring how the workflow invokes `pipeline.py`.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import numpy as np
import pytest

TOOL = Path(__file__).resolve().parent.parent  # tools/productization/web-deploy
REPO = TOOL.parents[2]
WEB_BUILD = REPO / "tools/productization/web-build"

EXPECTED_SIMS = {
    "reaction-diffusion-2d",
    "mandelbulb-explorer",
    "neural-ca",
    "ising-classical",
    "strange-attractors",
    "boids-2d",
    "boids-3d",
    "curl-noise",
    "heat-equation",
    "signal-workbench",
    "phase-field-fracture",
    "fdtd-optics",
    "lbm-multiphase",
    "eulerian-smoke",
    "mpm-multimaterial",
    "physarum",
    "pic-flip",
    "schrodinger-smoke",
    "sph-water",
    "sph-multiphase",
    "flow-lenia",
}


def _load(name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, TOOL / f"{name}.py")
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod  # dataclasses resolve annotations via cls.__module__
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def pipeline() -> ModuleType:
    return _load("pipeline")


@pytest.fixture(scope="module")
def verify() -> ModuleType:
    return _load("verify")


# --------------------------------------------------------------------------- #
# Discovery
# --------------------------------------------------------------------------- #
def test_discover_finds_the_qualifying_sims(pipeline: ModuleType) -> None:
    sims = pipeline.discover_qualifying_sims()
    names = {s.name for s in sims}
    assert names == EXPECTED_SIMS
    for s in sims:
        assert s.stack == "B"
        assert (s.path / "package.json").exists()
        assert "gate_kind" in s.metadata


def test_discover_cli_emits_valid_json(pipeline: ModuleType, capsys) -> None:
    rc = pipeline.main_discover(["--json"])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert {s["name"] for s in out} == EXPECTED_SIMS


# --------------------------------------------------------------------------- #
# No-widening guard — verify.py reuses gpu_gate.py's exact thresholds
# --------------------------------------------------------------------------- #
def test_verify_thresholds_are_byte_equal_to_web_build_gate(verify: ModuleType) -> None:
    """Every threshold verify.py gates on must appear verbatim in gpu_gate.py.

    This is the structural guarantee that 5.1 reuses each sim's ESTABLISHED gate
    and widens nothing (Discipline: never add/widen a tolerance).
    """
    src = (WEB_BUILD / "gpu_gate.py").read_text()
    for label, literal in verify.ESTABLISHED_THRESHOLDS.items():
        assert literal in src, (
            f"threshold {label}={literal!r} not found verbatim in gpu_gate.py"
        )


# --------------------------------------------------------------------------- #
# verify.py — gate harness exercised against canonical-shaped browser bundles
# --------------------------------------------------------------------------- #
def test_verify_roundtrip_accepts_canonical_bundle(
    verify: ModuleType, tmp_path
) -> None:
    """rd2d capture_roundtrip: a bundle == the canonical clears the 1e-4 gate."""
    bundle = verify.canonical_as_browser_bundle("reaction-diffusion-2d")
    p = tmp_path / "rd2d.json"
    p.write_text(json.dumps(bundle))
    res = verify.verify_browser_capture("reaction-diffusion-2d", [p])
    assert res.passed, res.detail
    assert res.kind == "capture_roundtrip"


def test_verify_neural_ca_bit_exact(verify: ModuleType, tmp_path) -> None:
    bundle = verify.canonical_as_browser_bundle("neural-ca")
    p = tmp_path / "nca.json"
    p.write_text(json.dumps(bundle))
    res = verify.verify_browser_capture("neural-ca", [p])
    assert res.passed, res.detail
    assert res.detail.get("bit_exact") is True


def test_verify_new_canonical_run_twice_and_anchor(
    verify: ModuleType, tmp_path
) -> None:
    """physarum: two identical bundles are run-twice byte-identical + mass anchor holds."""
    bundle = verify.canonical_as_browser_bundle("physarum")
    paths = []
    for i in range(2):
        p = tmp_path / f"phys{i}.json"
        p.write_text(json.dumps(bundle))
        paths.append(p)
    res = verify.verify_browser_capture("physarum", paths)
    assert res.run_twice_identical is True
    assert res.passed, res.detail


def test_verify_rejects_divergent_capture(verify: ModuleType, tmp_path) -> None:
    """A corrupted field must FAIL the gate — the gate actually discriminates."""
    bundle = verify.canonical_as_browser_bundle("reaction-diffusion-2d")
    last = bundle["steps"][-1]["state"]
    fkey = next(iter(last))
    last[fkey]["data"] = list(np.zeros(len(last[fkey]["data"])))  # wipe the field
    p = tmp_path / "bad.json"
    p.write_text(json.dumps(bundle))
    res = verify.verify_browser_capture("reaction-diffusion-2d", [p])
    assert not res.passed


def test_verify_run_twice_detects_nondeterminism(verify: ModuleType, tmp_path) -> None:
    """Two DIFFERING bundles for a new_canonical sim must fail run-twice byte-identity."""
    b0 = verify.canonical_as_browser_bundle("physarum")
    b1 = verify.canonical_as_browser_bundle("physarum")
    st = b1["steps"][-1]["state"]
    fkey = "trail_map"
    st[fkey]["data"][0] = float(st[fkey]["data"][0]) + 1.0
    paths = []
    for i, b in enumerate((b0, b1)):
        p = tmp_path / f"nd{i}.json"
        p.write_text(json.dumps(b))
        paths.append(p)
    res = verify.verify_browser_capture("physarum", paths)
    assert res.run_twice_identical is False
    assert not res.passed


# --------------------------------------------------------------------------- #
# Smoke-results JSON contract (phase plan § 5.5)
# --------------------------------------------------------------------------- #
def test_smoke_results_json_has_required_keys(pipeline: ModuleType) -> None:
    doc = pipeline.empty_results_doc()
    for k in (
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
        assert k in doc
    assert doc["sub_phase"] == "web-deploy"
