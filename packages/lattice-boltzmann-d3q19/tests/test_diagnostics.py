"""Tier 1 + Tier 2 vector_field (IC-6) diagnostics tests (gates 6 + 7).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the lattice-boltzmann-d3q19 sub-phase Stage 1 fills in the bodies (S1
pattern; conventions doc § M.2 inheritance). Per probe report § 2:

  - Tier 1: ``check_health`` (NaN/Inf scan on the canonical trajectory).
  - Tier 2 vector_field: ``check_divergence_free`` (advisory — LBM is
    weakly compressible, so ∇·u ≈ 0 only at O(Ma²)) + ``check_circulation``.

Use ``sim_runner_diagnostic`` (16x8 × 50 steps) — exercises every
kernel without the canonical-capture wall-clock + storage cost.
"""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np

from lattice_boltzmann_d3q19.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_tier1_health_no_nan_inf(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic-tier trajectory has no NaN / Inf in state or diagnostics."""
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        for step_key, step_g in h["steps"].items():
            for name, ds in step_g["state"].items():
                arr = ds[()]
                assert np.all(np.isfinite(arr)), (
                    f"NaN/Inf in state[{name}] at step {step_key}"
                )
            for diag_name, ds in step_g["diagnostics"].items():
                val = ds[()]
                assert np.all(np.isfinite(val)), (
                    f"NaN/Inf in diagnostics[{diag_name}] at step {step_key}"
                )


def test_tier2_vector_field_macroscopic_moments(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """Macroscopic velocity field's divergence stays bounded (IC-6 advisory).

    Per spec § 6.3 / probe report § 2: LBM is weakly compressible, so
    ∇·u is not strictly zero but bounded by O(Ma²). The diagnostic
    ``check_divergence_free`` records max|∇·u| as an advisory; we
    assert it stays below a generous bound (1.0 in lattice-velocity
    × dx⁻¹ units — well above any expected discretization residual).
    The ``check_circulation`` diagnostic records the total ∫u_x dA;
    we assert it stays finite (no overflow).
    """
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    h5_path = manifest_path.with_suffix(".h5")
    with h5py.File(h5_path, "r") as h:
        # Last step
        last_step_key = sorted(h["steps"].keys(), key=int)[-1]
        diag = h["steps"][last_step_key]["diagnostics"]
        max_div = float(diag["check_divergence_free"][()])
        circ = float(diag["check_circulation"][()])
        assert np.isfinite(max_div), (
            f"check_divergence_free not finite at step {last_step_key}"
        )
        assert np.isfinite(circ), (
            f"check_circulation not finite at step {last_step_key}"
        )
        assert max_div < 1.0, (
            f"check_divergence_free max|∇·u| = {max_div:.3e} exceeds advisory bound 1.0 "
            f"(LBM weakly-compressible — expected O(Ma²); see spec § 6.3)"
        )
