"""Phase-5 render-passes smoke harness (TDD; phase plan § 2.1 gate 3 / § 1.3 step 4).

Fast, CI-runnable contract tests for the render-passes pipeline: discovery of the
render:true canonical pool, the h5→field conversion + structured-step selection,
the per-category preset resolver, Blender discovery, and the results-JSON schema.

The heavy convert→export→render→verify gate (``run_pipeline_for_sim``, which shells
out to Blender) is exercised by the per-sim matrix job and gated behind
``BIT_PHYSICS_RENDER_BOOTSTRAP=1`` so the default smoke run stays fast and needs no
Blender. Authored BEFORE the implementation (spec § 1.3): this module fails at
import (no ``pipeline`` / ``convert`` / ``presets`` modules) until STEP 5 lands them.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import h5py
import numpy as np
import pytest

import convert
import pipeline
from presets import get_preset


# --- Discovery -------------------------------------------------------------


def test_discover_returns_canonical_render_sim() -> None:
    sims = pipeline.discover_qualifying_sims()
    assert len(sims) == 1, "Appendix E: discover returns the chosen canonical only"
    sim = sims[0]
    assert sim.name == pipeline.RENDER_CANONICAL == "eulerian-smoke"
    assert isinstance(sim, pipeline.SimSpec)
    assert sim.spec_path.exists()
    assert sim.capture_manifest.exists()


def test_canonical_capture_is_3d_volumetric() -> None:
    sim = pipeline.discover_qualifying_sims()[0]
    doc = json.loads(sim.capture_manifest.read_text(encoding="utf-8"))
    assert len(doc["config"]["dims"]) == 3, "render canonical must be a 3D grid"
    assert doc["payload"]["path"].endswith(".h5")


def test_render_true_pool_detected() -> None:
    pool = pipeline._render_true_canonicals()
    assert "eulerian-smoke" in pool
    assert pool["eulerian-smoke"]["category"] == "volumetric-grid"


# --- Preset resolver -------------------------------------------------------


def test_preset_resolves_scalar_field() -> None:
    assert get_preset("scalar-field") is not None
    assert get_preset("volumetric-grid") is not None  # eulerian-smoke's category


def test_preset_deferred_categories_raise_clearly() -> None:
    for cat in ("particle", "vector-field", "closed-form"):
        with pytest.raises(NotImplementedError):
            get_preset(cat)
    with pytest.raises(KeyError):
        get_preset("nonsense-category")


# --- Conversion (synthetic h5; no LFS dependency) --------------------------


def _make_synthetic_capture(tmp: Path) -> tuple[Path, Path]:
    """A tiny 3-step 8³ capture: step 1 is the only structured frame."""
    h5_path = tmp / "synthetic.h5"
    with h5py.File(h5_path, "w") as f:
        meta = f.create_group("metadata")
        meta.attrs["sim_name"] = "eulerian-smoke"
        meta.attrs["sim_category"] = "volumetric-grid"
        meta.attrs["sim_variant"] = "synthetic"
        for step, std in ((0, 0.0), (1, 1.0), (2, 0.0)):
            grp = f.create_group(f"steps/{step}/state")
            base = (
                np.full((8, 8, 8), 0.3)
                if std == 0.0
                else np.random.default_rng(step).random((8, 8, 8))
            )
            grp.create_dataset("density", data=base.astype(np.float64))
    manifest = {
        "config": {"dims": [8, 8, 8]},
        "payload": {"path": "synthetic.h5", "checksum": "sha256:deadbeef"},
        "sim": {"name": "eulerian-smoke", "category": "volumetric-grid"},
        "stack": {"build_id": "test"},
    }
    mpath = tmp / "synthetic.json"
    mpath.write_text(json.dumps(manifest), encoding="utf-8")
    return h5_path, mpath


def test_extract_field_selects_structured_step(tmp_path: Path) -> None:
    h5_path, mpath = _make_synthetic_capture(tmp_path)
    manifest = convert.load_manifest(mpath)
    meta = convert.extract_field(
        h5_path, tmp_path / "f.npy", tmp_path / "m.json", manifest=manifest
    )
    assert meta["step"] == 1, "must pick the max-std (structured) step"
    assert meta["dims"] == [8, 8, 8]
    assert meta["render_category"] == "volumetric-grid"
    assert meta["source_capture_sha256"] == "sha256:deadbeef"
    arr = np.load(tmp_path / "f.npy")
    assert arr.dtype == np.float64 and arr.shape == (8, 8, 8)


# --- Blender discovery -----------------------------------------------------


def test_find_blender_errors_without_blender(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BIT_PHYSICS_BLENDER", raising=False)
    monkeypatch.setattr(pipeline.shutil, "which", lambda _: None)
    with pytest.raises(FileNotFoundError):
        pipeline.find_blender()


# --- Results JSON schema (§ 5.5) -------------------------------------------


def test_results_json_schema() -> None:
    sim = pipeline.discover_qualifying_sims()[0]
    result = pipeline.PipelineResult(
        sim=sim,
        status="pass",
        artifact_path=Path("docs/renders/eulerian-smoke/hero.png"),
        asset_integrity={"roundtrip_bit_exact": True},
        determinism={"pixel_bit_identical": True, "psnr_db": 99.0, "ssim": 1.0},
        duration_seconds=12.3,
        notes="ok",
    )
    payload = pipeline.results_to_json(
        [result], sub_phase="render-passes", commit_sha="abc"
    )
    assert payload["overall_status"] == "pass"
    assert payload["pass_count"] == 1 and payload["fail_count"] == 0
    assert payload["sim_results"]["eulerian-smoke"]["determinism"][
        "pixel_bit_identical"
    ]


# --- Heavy gate (gated; needs Blender) -------------------------------------


@pytest.mark.skipif(
    os.environ.get("BIT_PHYSICS_RENDER_BOOTSTRAP") != "1",
    reason="render bootstrap gate (shells out to Blender); set BIT_PHYSICS_RENDER_BOOTSTRAP=1",
)
def test_render_bootstrap_gate(tmp_path: Path) -> None:
    sim = pipeline.discover_qualifying_sims()[0]
    result = pipeline.run_pipeline_for_sim(sim, tmp_path / sim.name)
    assert result.status == "pass", result.notes
    assert result.asset_integrity["roundtrip_bit_exact"] is True
    assert result.determinism["pixel_bit_identical"] is True
