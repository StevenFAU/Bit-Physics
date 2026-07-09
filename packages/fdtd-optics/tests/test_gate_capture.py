"""Gate-scene capture pins (spec
`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 6 G-matched /
G-runtwice): the pinned f64 checkpoint-blob sha256 and the f32-proxy
per-checkpoint diagnostic band (measured 2.8e-7 worst at build, spike
measured 6.6e-7 — asserted with margin at 2e-6)."""

from __future__ import annotations

import hashlib

import numpy as np
from fdtd_optics.reference import GATE_SCENE, run_tfsf
from fdtd_optics.sim import (
    GATE_CHECKPOINT_SHA256,
    checkpoint_blob,
    run_canonical,
)


def test_gate_checkpoint_sha256_pinned() -> None:
    res = run_canonical()
    blob = checkpoint_blob(res)
    assert len(blob) == 4 * 3 * 128 * 128 * 8 == 1_572_864
    assert hashlib.sha256(blob).hexdigest() == GATE_CHECKPOINT_SHA256


def test_gate_diagnostics_shape() -> None:
    res = run_canonical()
    assert [int(d["step"]) for d in res.diagnostics] == [128, 256, 384, 512]
    for d in res.diagnostics:
        assert d["peak_abs_ez"] > 0.9  # the pulse is in the box, order 1
        assert 0.0 < d["max_abs_hx"]
        assert 0.0 < d["max_abs_hy"]


def test_f32_gate_tracks_f64_diagnostics() -> None:
    """f32 WGSL-proxy run vs the f64 reference: worst per-checkpoint
    max-abs/peak diagnostic relative error < 2e-6 (measured 2.8e-7)."""
    c64 = run_tfsf(GATE_SCENE, np.float64)
    c32 = run_tfsf(GATE_SCENE, np.float32)
    worst = 0.0
    for step in GATE_SCENE.checkpoints:
        for f64, f32 in zip(c64[step], c32[step], strict=True):
            peak64 = float(np.max(np.abs(f64)))
            peak32 = float(np.max(np.abs(f32.astype(np.float64))))
            worst = max(worst, abs(peak32 - peak64) / peak64)
    assert worst < 2e-6, f"f32 diagnostic drift {worst:.3e} out of band"
