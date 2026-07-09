"""Determinism witness (spec
`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 6 G-runtwice):
run-twice bit-identity on the same build/hardware; the witness run is the
capture run (heat-equation posture)."""

from __future__ import annotations

from fdtd_optics.reference import TfsfScene
from fdtd_optics.sim import run_canonical


def test_run_twice_bit_identical_witnessed() -> None:
    scene = TfsfScene(
        n=64,
        ia=12,
        ib=52,
        ja=12,
        jb=52,
        cx=40,
        cy=32,
        r=9,
        steps=128,
        checkpoints=(64, 128),
    )
    r1 = run_canonical(scene)  # internally runs twice and asserts bit-identity
    r2 = run_canonical(scene)
    assert r1.determinism_witness_sha256
    assert r1.determinism_witness_sha256 == r2.determinism_witness_sha256


def test_witness_changes_with_scene() -> None:
    a = run_canonical(
        TfsfScene(
            n=64,
            ia=12,
            ib=52,
            ja=12,
            jb=52,
            cx=40,
            cy=32,
            r=9,
            steps=64,
            checkpoints=(64,),
        )
    )
    b = run_canonical(
        TfsfScene(
            n=64,
            ia=12,
            ib=52,
            ja=12,
            jb=52,
            cx=40,
            cy=32,
            r=9,
            eps_cyl=4.0,
            steps=64,
            checkpoints=(64,),
        )
    )
    assert a.determinism_witness_sha256 != b.determinism_witness_sha256
