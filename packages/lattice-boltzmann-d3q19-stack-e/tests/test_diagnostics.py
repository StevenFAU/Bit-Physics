"""Tier 1 + Tier 2 vector_field (IC-6) diagnostics tests (gates 5 + 6), Stack-E.

Mirrors the Phase-1 / Stack-D ``test_diagnostics`` against the Stack-E NVIDIA Warp
sim's diagnostic-tier runner:

  - Tier 1 (gate 5): ``check_health`` (NaN/Inf scan on the diagnostic trajectory).
  - Tier 2 vector_field (IC-6, gate 6): ``check_divergence_free`` (advisory -- LBM
    is weakly compressible, so div(u) ~ 0 only at O(Ma^2)) + ``check_circulation``.

Uses ``sim_runner_diagnostic`` (coarse grid x few steps) -- exercises every kernel
(streaming, BGK collision, Guo forcing, bounce-back) without the canonical-capture
wall-clock + storage cost. Laminar regime; Ma < 0.1 asserted at sim-init (R-LBM-3).

The Stack-E sim module ``lattice_boltzmann_d3q19_stack_e.sim`` does NOT exist at
the failing-tests commit (Stage 1a) -- collection fails with ModuleNotFoundError
cleanly until the Stage-1b implementation lands.
"""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np
from lattice_boltzmann_d3q19_stack_e.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)


def test_tier1_health_no_nan_inf(tmp_path: Path) -> None:
    """Diagnostic-tier trajectory has no NaN / Inf in state or diagnostics."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        for step_key, step_g in h["steps"].items():
            for name, ds in step_g["state"].items():
                arr = ds[()]
                assert np.all(np.isfinite(arr)), f"NaN/Inf in state[{name}] at step {step_key}"
            for diag_name, ds in step_g["diagnostics"].items():
                val = ds[()]
                assert np.all(np.isfinite(val)), (
                    f"NaN/Inf in diagnostics[{diag_name}] at step {step_key}"
                )


def test_tier2_vector_field_macroscopic_moments(tmp_path: Path) -> None:
    """Macroscopic velocity field divergence stays bounded (IC-6 advisory).

    LBM is weakly compressible, so div(u) is not strictly zero but bounded by
    O(Ma^2). ``check_divergence_free`` records max|div(u)| as advisory; assert it
    stays below a generous bound. ``check_circulation`` (total integral of u_x)
    must stay finite.
    """
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        last_step_key = sorted(h["steps"].keys(), key=int)[-1]
        diag = h["steps"][last_step_key]["diagnostics"]
        max_div = float(diag["check_divergence_free"][()])
        circ = float(diag["check_circulation"][()])
        assert np.isfinite(max_div), f"check_divergence_free not finite at step {last_step_key}"
        assert np.isfinite(circ), f"check_circulation not finite at step {last_step_key}"
        assert max_div < 1.0, (
            f"check_divergence_free max|div(u)| = {max_div:.3e} exceeds advisory bound 1.0 "
            f"(LBM weakly-compressible -- expected O(Ma^2); see spec 6.3)"
        )
