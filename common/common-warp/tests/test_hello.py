"""Subsystem-7 ``hello-warp`` smoke-sim tests (W-3 + W-2 full gate).

Exercises the smoke simulator (Runtime + Determinism + Capture + Grids) and
the Particles + HashGrid subsystems in the smoke-sim domain, completing the
W-3 "exercises every public subsystem" criterion collectively across the
suite (Stage-0 S0-W1). The W-2 gate fully completes here via both the
``warp_harness`` ``assert_deterministic_run`` and the testkit
``run_twice_and_diff`` (the canonical §1.5.2 W-2 surface).
"""

from __future__ import annotations

import json
from itertools import pairwise
from pathlib import Path

import numpy as np
import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import warp as wp
from capture.manifest import validate_capture_manifest
from determinism import run_twice_and_diff
from equivalence.harness import compare_captures
from hello.sim import DESCRIPTOR_DEFAULT, run_hello_sim

import common_warp

# A reduced config for the run-twice tests (the actual Subsystem-7 sim, smaller
# grid/horizon for sub-second per-invocation cost — mirrors the Stack-D
# ``sim_runner_diagnostic`` pattern). The canonical 64x64x400 run is reserved
# for the trajectory test (Task 1c.4).
_DIAG = {"n": 32, "steps": 40, "capture_interval": 10}


def test_hello_runs_without_error() -> None:
    """The sim completes and returns a populated result."""
    res = run_hello_sim(**_DIAG)
    assert res.final_field is not None
    assert res.final_field.shape == (32, 32, 1)
    assert np.all(np.isfinite(res.final_field))
    assert len(res.max_history) == _DIAG["steps"] + 1


def test_hello_trajectory_bounded_decaying() -> None:
    """W-3 / S6 discipline: max-field monotone-decaying to the design prediction.

    Canonical params (Stage-0 Task 0.6): max-field 1.0 -> ~0.219 over 400
    steps, zero increases, mass conserved under periodic BC.
    """
    res = run_hello_sim(seed=42)  # canonical 64x64x400
    mh = res.max_history
    assert mh[0] == pytest.approx(1.0)
    # strictly non-increasing across the whole 400-step horizon (f32 epsilon)
    assert all(b <= a + 1e-7 for a, b in pairwise(mh))
    # final max matches the Stage-0 design-time prediction (~0.219)
    assert mh[-1] == pytest.approx(0.219, abs=2e-3)
    # mass conserved under periodic BC (f32 roundoff over 400 steps)
    assert res.mass_history[-1] == pytest.approx(res.mass_history[0], rel=1e-5)


def test_hello_capture_produced(tmp_path: Path) -> None:
    """W-1 full gate: the sim writes an HDF5 payload + JSON manifest sidecar."""
    res = run_hello_sim(tmp_path, **_DIAG)
    assert res.capture_path is not None
    assert res.capture_path == tmp_path / f"{DESCRIPTOR_DEFAULT}.json"
    assert res.capture_path.exists()
    assert (tmp_path / f"{DESCRIPTOR_DEFAULT}.h5").exists()


def test_hello_capture_schema_v1_compliant(tmp_path: Path) -> None:
    """The written manifest validates against capture-v1.json."""
    res = run_hello_sim(tmp_path, **_DIAG)
    assert res.capture_path is not None
    manifest = json.loads(res.capture_path.read_text(encoding="utf-8"))
    validate_capture_manifest(manifest)  # raises jsonschema.ValidationError on failure
    assert manifest["sim"] == {
        "name": "hello-warp",
        "category": "smoke",
        "variant": "advection-diffusion-2d-upwind-ftcs",
    }
    assert manifest["determinism"]["claimed"] == "bit-exact-same-hw"


def test_hello_roundtrips_via_read_capture(tmp_path: Path) -> None:
    """The written capture reloads (W-1) with the final density field intact."""
    res = run_hello_sim(tmp_path, **_DIAG)
    assert res.capture_path is not None and res.final_field is not None
    reloaded = common_warp.read_capture(res.capture_path)
    final_key = f"steps/{_DIAG['steps']}/state/density"
    np.testing.assert_array_equal(reloaded.payload[final_key], res.final_field)


def test_hello_determinism_via_warp_harness() -> None:
    """W-2 (full gate, warp_harness path): bit-determinism on CPU per D4.

    ``assert_deterministic_run`` runs the actual smoke sim twice at
    tolerance=0.0 and asserts the final field is bit-identical.
    """
    common_warp.set_warp_deterministic(42, device="cpu")

    def _final_field() -> np.ndarray:
        res = run_hello_sim(seed=42, **_DIAG)
        assert res.final_field is not None
        return res.final_field

    digest = common_warp.assert_deterministic_run(_final_field, runs=2, tolerance=0.0)
    assert len(digest) == 64  # sha256 hex witness


def test_hello_determinism_via_testkit_run_twice_and_diff(tmp_path: Path) -> None:
    """W-2 (full gate, canonical §1.5.2 surface): testkit run_twice_and_diff.

    Runs the SimRunner-protocol ``hello_sim_runner`` twice at the same seed
    and asserts the two captures are content-equivalent (every state array +
    diagnostic entry bit-identical). This is the canonical §1.5.2 W-2 gate.
    """
    from hello.sim import hello_sim_runner

    verdict = run_twice_and_diff(hello_sim_runner, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


# --- Particles + HashGrid in the smoke-sim domain (W-3 collective surface) ---


def _tracer_positions_from_density(field: np.ndarray, k: int) -> np.ndarray:
    """The k highest-density cell centers as 3D tracer-particle positions (z=0)."""
    flat = field[:, :, 0]
    idx = np.argsort(flat, axis=None)[::-1][:k]
    rows, cols = np.unravel_index(idx, flat.shape)
    return np.stack([rows, cols, np.zeros_like(rows)], axis=1).astype(np.float32)


def test_particles_seed_from_density_field() -> None:
    """Particles (Subsystem 4) seeded as tracers over the smoke field; roundtrip."""
    res = run_hello_sim(**_DIAG)
    assert res.final_field is not None
    pos = _tracer_positions_from_density(res.final_field, k=8)
    with wp.ScopedDevice("cpu"):
        parts = common_warp.allocate_particles(8, device="cpu")
        parts.positions.assign(pos)
        payload = parts.to_capture_payload()
        restored = common_warp.Particles.from_capture_payload(payload, device="cpu")
    assert parts.count == 8
    np.testing.assert_array_equal(restored.positions.numpy(), pos)


def test_hashgrid_over_tracer_particles() -> None:
    """HashGrid (Subsystem 6) neighbor query over smoke-field tracer particles."""
    res = run_hello_sim(**_DIAG)
    assert res.final_field is not None
    pos = _tracer_positions_from_density(res.final_field, k=8)
    with wp.ScopedDevice("cpu"):
        pts = wp.from_numpy(pos, dtype=wp.vec3)
        hg = common_warp.HashGrid(cell_size=2.0, max_particles=8, device="cpu")
        hg.build(pts)
        # query around the densest cell (the first tracer) — finds at least itself
        neighbors = hg.query_radius(wp.vec3(float(pos[0, 0]), float(pos[0, 1]), 0.0), 2.0)
        found = neighbors.numpy()
    assert found.size >= 1
    assert 0 in found.tolist()


# --- W-5 full gate: format-interop run-twice-and-diff at capture level ---


def test_hello_w5_compare_captures_run_twice(tmp_path: Path) -> None:
    """W-5 full gate (Task 1c.5): compare_captures on the actual hello-warp capture.

    (a) run the Subsystem-7 sim -> Capture A; (b) run again (same seed,
    deterministic) -> Capture B; (c) compare_captures(A, B); (d) assert
    within_tolerance=True (A and B are bit-identical on CPU per D4); (e)
    assert NO HARD_FAIL on any sim/step/shape/dtype surface. This is the
    run-twice-and-diff at the capture level — W-5 fully completes here.
    """
    from hello.sim import hello_sim_runner

    dir_a = tmp_path / "a"
    dir_b = tmp_path / "b"
    dir_a.mkdir()
    dir_b.mkdir()
    cap_a = hello_sim_runner(42, dir_a)
    cap_b = hello_sim_runner(42, dir_b)

    verdict = compare_captures(cap_a, cap_b)  # category 'smoke' -> defaults.smoke

    # (d) deterministically identical -> within tolerance
    assert verdict.within_tolerance is True
    # (e) no HARD_FAIL marker on any sim.{name,category}/step-set/shape/missing surface
    diff_keys = set(verdict.per_field_diff)
    assert "sim:category-mismatch" not in diff_keys
    assert "step:set-mismatch" not in diff_keys
    assert not any(k.endswith((":missing", ":shape-mismatch")) for k in diff_keys)
    # identical runs -> every per-field diff is exactly zero (no dtype TypeError either)
    assert diff_keys  # the diff actually ran field-by-field (not short-circuited)
    assert all(d["max_abs_err"] == 0.0 for d in verdict.per_field_diff.values())
