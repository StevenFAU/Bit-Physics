"""Canonical gate captures: run-twice witness + committed-blob sha pins
(spec § 6.2; the same assertions the deploy gate re-runs in CI)."""

import hashlib

import numpy as np

from lbm_multiphase.sim import (
    GATE_DROP_B,
    GATE_FLAT_A,
    REFERENCE_SHA256,
    T_C_CS,
    checkpoint_blob,
    load_ic,
    run_canonical,
)
from lbm_multiphase.thermo import cs_critical_point


def test_t_c_pin():
    """The scene-frozen C-S critical temperature literal must equal the
    solver's value (sim.py pins it so scenes are import-time constants)."""
    t_c, _ = cs_critical_point()
    assert abs(t_c - T_C_CS) < 1e-12


def test_canonical_run_twice_and_sha_pins():
    res = run_canonical()  # asserts run-twice bit-identity internally
    for key, scene in (("flat", GATE_FLAT_A), ("droplet", GATE_DROP_B)):
        sha = hashlib.sha256(checkpoint_blob(res[key], scene)).hexdigest()
        assert sha == REFERENCE_SHA256[key], f"{key} reference blob drifted"
    assert res["droplet"].psi_min_arg > 0.0  # no silent psi clamp (honesty)


def test_committed_reference_bins_match_pins():
    from lbm_multiphase.sim import WEB_PUBLIC

    for key, scene in (("flat", GATE_FLAT_A), ("droplet", GATE_DROP_B)):
        blob = (WEB_PUBLIC / f"lbm-gate-{key}-step{scene.steps}.bin").read_bytes()
        assert hashlib.sha256(blob).hexdigest() == REFERENCE_SHA256[key]
        n2 = scene.nx * scene.ny
        assert len(blob) == len(scene.checkpoints) * 3 * n2 * 8


def test_committed_ics_are_near_equilibrium():
    """The committed gate ICs are pre-equilibrated: a 2000-step re-run must
    keep the BULK coexistence probes essentially static (no runaway
    transient). Pointwise interface cells legitimately breathe a fraction
    of a cell during the rest-reseed re-settle — bulk means are the
    equilibrium witnesses, not steep-gradient cells."""
    res = run_canonical()
    rho = res["flat"].checkpoints[GATE_FLAT_A.steps][0]
    ic = load_ic("lbm-gate-ic-flatA.bin", 128, 8)
    drift_l = abs(float(rho[56:72].mean() - ic[56:72].mean()))
    drift_v = abs(
        float(
            np.concatenate([rho[:8], rho[120:]]).mean()
            - np.concatenate([ic[:8], ic[120:]]).mean()
        )
    )
    assert drift_l < 2e-2  # measured 2000-step reseed offset: 9.9e-3 (returns by 12k)
    assert drift_v < 5e-3
    assert float(np.abs(rho - ic).max()) < 0.1  # interface breathing bound
