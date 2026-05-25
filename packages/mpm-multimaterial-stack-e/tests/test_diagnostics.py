"""Gates 5 + 6 — Tier-1 (NaN/Inf health) + Tier-2 (IC-5 particle + IC-6 vector_field).

Drives the diagnostic-tier trajectory (16^3 x 5K x 50) and asserts the
diagnostic contracts over the captured frames.
"""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np

from mpm_multimaterial_stack_e.sim import sim_runner_diagnostic


def test_tier1_health_no_nan_inf(tmp_path: Path) -> None:
    """Gate 5 — diagnostic trajectory has no NaN / Inf in state or diagnostics."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        for step_key, step_g in h["steps"].items():
            for name, ds in step_g["state"].items():
                arr = ds[()]
                if np.issubdtype(arr.dtype, np.floating):
                    assert np.all(np.isfinite(arr)), f"NaN/Inf in state[{name}] at {step_key}"
            for diag_name, ds in step_g["diagnostics"].items():
                val = ds[()]
                assert np.all(np.isfinite(val)), f"NaN/Inf in diag[{diag_name}] at {step_key}"


def test_tier2_particle_count_invariance(tmp_path: Path) -> None:
    """Gate 6 — IC-5 ``check_count_invariance``: particle count fixed across the trajectory."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        for step_key in sorted(h["steps"].keys(), key=int):
            step_g = h["steps"][step_key]
            n_p = int(step_g["state"]["particle_pos"][()].shape[0])
            n_p_diag = int(step_g["diagnostics"]["check_count_invariance"][()])
            assert n_p == n_p_diag == 5000


def test_tier2_particle_momentum_conservation(tmp_path: Path) -> None:
    """Gate 6 — IC-5 ``check_momentum_conservation_drift``: advisory drift stays finite/bounded."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        last_step_key = sorted(h["steps"].keys(), key=int)[-1]
        diag = h["steps"][last_step_key]["diagnostics"]
        drift = float(diag["check_momentum_conservation_drift"][()])
        assert np.isfinite(drift)
        assert drift < 1.0


def test_tier2_vector_field_grid_momentum(tmp_path: Path) -> None:
    """Gate 6 — IC-6 ``check_circulation_grid_mom_l1``: grid-momentum field finite + bounded."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        last_step_key = sorted(h["steps"].keys(), key=int)[-1]
        diag = h["steps"][last_step_key]["diagnostics"]
        mom_l1 = float(diag["check_circulation_grid_mom_l1"][()])
        assert np.isfinite(mom_l1)
        assert mom_l1 >= 0.0
        assert mom_l1 < 100.0
