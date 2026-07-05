"""Determinism (spec-ref § 8): pure per-point gather -> run-twice
bit-identity on fixed hardware; capture round-trip via the testkit."""

from __future__ import annotations

import numpy as np

from curl_noise.reference.advect import advect
from curl_noise.reference.curlnoise import (
    CANONICAL_DT,
    seeded_tracers,
    sim_runner_seeded,
)
from curl_noise.reference.fields import CANONICAL_CONFIG


def test_run_twice_witness_holds(canonical_result):
    """advect() asserts the 2-run witness internally; a stable sha comes
    back (64 hex chars)."""
    sha = canonical_result.determinism_witness_sha256
    assert isinstance(sha, str) and len(sha) == 64
    int(sha, 16)


def test_same_seed_reproduces_sha():
    pts = seeded_tracers(42, 128)
    kw = dict(
        n_steps=8,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=1,
        capture_interval=8,
    )
    r1 = advect(pts, CANONICAL_CONFIG, **kw)
    r2 = advect(pts, CANONICAL_CONFIG, **kw)
    assert r1.determinism_witness_sha256 == r2.determinism_witness_sha256
    assert np.array_equal(r1.positions, r2.positions)


def test_cross_seed_distinct():
    assert not np.array_equal(seeded_tracers(1, 64), seeded_tracers(2, 64))


def test_tracer_seeds_clear_of_obstacle():
    pts = seeded_tracers(42)
    center = np.asarray(CANONICAL_CONFIG.obstacle_center)
    assert np.linalg.norm(pts - center, axis=1).min() > CANONICAL_CONFIG.obstacle_radius


def test_capture_roundtrip(tmp_path):
    manifest_path = sim_runner_seeded(42, tmp_path)
    assert manifest_path.exists()
    payload = list(tmp_path.glob("*.h5"))
    assert payload, "capture payload written"
