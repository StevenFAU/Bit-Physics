"""Determinism witness (spec-ref.md § 8): run-twice bit-identity on the same
build/hardware for BOTH solver paths; the witness run is the capture run."""

from __future__ import annotations

from heat_equation.sim import HeatConfig, run_canonical


def test_run_twice_bit_identical_witnessed() -> None:
    cfg = HeatConfig(n=64, steps=64, capture_every=32)
    r1 = run_canonical(cfg)  # internally runs twice and asserts bit-identity
    r2 = run_canonical(cfg)
    assert r1.determinism_witness_sha256
    assert r1.determinism_witness_sha256 == r2.determinism_witness_sha256


def test_witness_changes_with_config() -> None:
    a = run_canonical(HeatConfig(n=64, steps=32, capture_every=16))
    b = run_canonical(HeatConfig(n=64, steps=64, capture_every=16))
    assert a.determinism_witness_sha256 != b.determinism_witness_sha256
