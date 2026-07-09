"""Determinism witness (spec-ref.md § 6.1 G-runtwice): run-twice
bit-identity on the same build/hardware; the witness run is the capture
run."""

from __future__ import annotations

from phase_field_fracture.sim import run_canonical
from phase_field_fracture.solver import FractureConfig


def test_run_twice_bit_identical_witnessed() -> None:
    cfg = FractureConfig(n=48, capture_every=2000, diag_every=200)
    _r1, w1 = run_canonical(cfg)  # internally runs twice, asserts bit-identity
    _r2, w2 = run_canonical(cfg)
    assert w1
    assert w1 == w2


def test_witness_changes_with_config() -> None:
    _, wa = run_canonical(FractureConfig(n=48, u_end=0.2, capture_every=2000))
    _, wb = run_canonical(FractureConfig(n=48, u_end=0.25, capture_every=2000))
    assert wa != wb
