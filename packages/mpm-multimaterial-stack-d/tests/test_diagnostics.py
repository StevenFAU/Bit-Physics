"""Tier 1 + Tier 2 particle (IC-5) + vector_field (IC-6) diagnostics
(gates 5 + 6).

Stage 1b fills the diagnostic bodies in ``mpm_multimaterial_stack_d.sim``.
Per probe report:

  - Tier 1: ``check_health`` (NaN/Inf scan on the canonical trajectory).
  - Tier 2 particle (IC-5):
      * ``check_count_invariance`` -- particle count stays fixed.
      * ``check_momentum_conservation`` -- advisory; drop-impact has
        gravity force injecting downward momentum.
  - Tier 2 vector_field (IC-6) on the grid momentum field:
      * ``check_circulation_grid_mom_l1`` -- finite + bounded.

MPM is the FIRST sub-phase to consume BOTH IC-5 AND IC-6 at Tier-2
(probe finding); the Stack-D port mirrors that surface.

Uses ``sim_runner_diagnostic`` (16^3 x 5K particles x 50 steps) --
exercises every kernel without the canonical-capture wall-clock +
storage cost.

The Stack-D sim module ``mpm_multimaterial_stack_d.sim`` does NOT exist
at the failing-tests commit -- collection fails with ModuleNotFoundError
cleanly until Stage 1b implements it.
"""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np

from mpm_multimaterial_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)


def test_tier1_health_no_nan_inf(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic-tier trajectory has no NaN / Inf in state or diagnostics."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        for step_key, step_g in h["steps"].items():
            for name, ds in step_g["state"].items():
                arr = ds[()]
                if np.issubdtype(arr.dtype, np.floating):
                    assert np.all(np.isfinite(arr)), f"NaN/Inf in state[{name}] at step {step_key}"
            for diag_name, ds in step_g["diagnostics"].items():
                val = ds[()]
                assert np.all(np.isfinite(val)), (
                    f"NaN/Inf in diagnostics[{diag_name}] at step {step_key}"
                )


def test_tier2_particle_count_invariance(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """IC-5 ``check_count_invariance`` -- particle count fixed across trajectory."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    counts: list[int] = []
    with h5py.File(h5_path, "r") as h:
        for step_key in sorted(h["steps"].keys(), key=int):
            step_g = h["steps"][step_key]
            n_p = int(step_g["state"]["particle_pos"][()].shape[0])
            counts.append(n_p)
            n_p_diag = int(step_g["diagnostics"]["check_count_invariance"][()])
            assert n_p == n_p_diag, (
                f"step {step_key}: state particle_pos len {n_p} != "
                f"diagnostics check_count_invariance {n_p_diag}"
            )
    assert len(set(counts)) == 1, (
        f"particle count varied across trajectory: distinct counts = {set(counts)}"
    )


def test_tier2_particle_momentum_conservation(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """IC-5 ``check_momentum_conservation`` -- advisory drift stays finite/bounded.

    Drop-impact applies gravity downward; total particle momentum
    drifts negatively in z by ~ ``N * m * g * t``. The advisory
    diagnostic records the absolute drift magnitude -- we assert it
    stays finite and below a conservative upper bound (10x
    expected free-fall drift, well above any expected impulse).
    """
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        last_step_key = sorted(h["steps"].keys(), key=int)[-1]
        diag = h["steps"][last_step_key]["diagnostics"]
        drift = float(diag["check_momentum_conservation_drift"][()])
        assert np.isfinite(drift), (
            f"check_momentum_conservation_drift not finite at step {last_step_key}"
        )
        # Conservative bound: 1.0 (drift in particle-momentum units).
        assert drift < 1.0, (
            f"check_momentum_conservation drift = {drift:.3e} exceeds advisory "
            f"bound 1.0 (drop-impact with gravity; expected drift << 1 over 50 steps x 1e-4 dt)"
        )


def test_tier2_vector_field_grid_momentum(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """IC-6 ``check_circulation_grid_mom_l1`` -- grid momentum field finite + bounded.

    Per probe report: the grid momentum field is derived (P2G of particle
    momentum) rather than primitively stored; the L1 norm (volume-weighted)
    is a finite proxy for the circulation diagnostic at this sub-phase.
    """
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        last_step_key = sorted(h["steps"].keys(), key=int)[-1]
        diag = h["steps"][last_step_key]["diagnostics"]
        mom_l1 = float(diag["check_circulation_grid_mom_l1"][()])
        assert np.isfinite(mom_l1), (
            f"check_circulation_grid_mom_l1 not finite at step {last_step_key}"
        )
        assert mom_l1 >= 0.0, f"check_circulation_grid_mom_l1 = {mom_l1:.3e} negative (L1 norm)"
        # Upper bound: 100.0 in volume-weighted momentum units (well above
        # expected ~5K particle x ~1e-4 mass x ~2 m/s velocity x ~unit volume).
        assert mom_l1 < 100.0, (
            f"check_circulation_grid_mom_l1 = {mom_l1:.3e} exceeds advisory bound 100.0"
        )
