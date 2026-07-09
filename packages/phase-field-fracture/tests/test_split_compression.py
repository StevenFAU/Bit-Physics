"""G-split (spec-ref.md § 6.1): the Miehe strain-spectral driving force
produces NO damage growth under pure compression — cracks do not grow in
compression."""

from __future__ import annotations

import numpy as np
from phase_field_fracture.reference import psi_plus_miehe
from phase_field_fracture.solver import FractureConfig, run_trace


def test_compressed_block_stays_undamaged() -> None:
    """Un-notched block compressed to |U| = 0.25 (same magnitude that takes
    the SENT specimen most of the way to peak in tension): no damage
    localization anywhere.

    Measured-then-declared: the free lateral edges bulge (Poisson), so thin
    side bands see GENUINE small lateral tension — measured d_max = 3.7e-3
    at 48^2 (physical, non-localizing) -> declared ceiling 0.02 (~5x). The
    pointwise-zero claim for pure-compression strain STATES is asserted
    exactly in test_psi_plus_zero_for_pure_compression_states below."""
    cfg = FractureConfig(
        n=48, u_end=-0.25, notch="none", capture_every=20000, diag_every=500
    )
    res = run_trace(cfg)
    d_final = res.captures[-1].d
    assert float(d_final.max()) <= 0.02
    # and the block really was loaded (reaction is compressive)
    reactions = [d.reaction for d in res.diagnostics]
    assert min(reactions) < -50.0


def test_psi_plus_zero_for_pure_compression_states() -> None:
    """Pointwise split correctness: biaxial and uniaxial-with-Poisson
    compression states have psi_plus == 0; pure tension recovers psi_iso."""
    lam, mu = 673.0769, 448.7179
    zero = np.zeros((4, 4))
    # equibiaxial compression
    exx = np.full((4, 4), -1e-2)
    assert float(np.max(psi_plus_miehe(exx, exx, zero, lam, mu))) == 0.0
    # uniaxial strain compression (eyy = 0)
    assert float(np.max(psi_plus_miehe(exx, zero, zero, lam, mu))) == 0.0
    # pure biaxial tension: psi_plus equals the full isotropic energy
    ett = np.full((4, 4), 1e-2)
    got = psi_plus_miehe(ett, ett, zero, lam, mu)
    want = 0.5 * lam * (2e-2) ** 2 + mu * 2.0 * (1e-2) ** 2
    assert float(np.max(np.abs(got - want))) <= 1e-12 * want


def test_shear_splits_evenly() -> None:
    """Pure shear has eigenvalues +/- gamma: exactly the mu*e1^2 tensile
    half drives damage (lambda term vanishes, tr = 0)."""
    lam, mu = 673.0769, 448.7179
    zero = np.zeros((2, 2))
    exy = np.full((2, 2), 1e-2)
    got = psi_plus_miehe(zero, zero, exy, lam, mu)
    want = mu * 1e-4
    assert float(np.max(np.abs(got - want))) <= 1e-12
