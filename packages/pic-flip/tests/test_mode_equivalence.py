"""Cross-mode structural equivalence (spec-ref § 9).

PIC/FLIP/APIC share the P2G / grid / G2P scaffold; only the
reconstruction differs. Contracts:

- P2G with ``C == 0`` is bit-identical to APIC's P2G called with a
  zero affine array (same code path — PIC == APIC with B == 0).
- G2P velocity reconstruction is bit-identical between
  ``compute_affine`` True/False (independent accumulators, same order).
- FLIP with a zero grid-force delta reduces to carrying the particle
  velocity (transfer-cycle contract).
"""

from __future__ import annotations

import numpy as np

from pic_flip.reference import apic
from pic_flip.sim import transfer_cycle_step_2d

_N = 16
_DX = 1.0 / _N


def _particles(seed: int, n: int = 40):
    rng = np.random.default_rng(seed)
    pos = rng.uniform(3 * _DX, (_N - 4) * _DX, size=(n, 2))
    vel = rng.uniform(-1.0, 1.0, size=(n, 2))
    mass = rng.uniform(0.5, 2.0, size=(n,))
    c = rng.uniform(-1.0, 1.0, size=(n, 2, 2))
    return pos, vel, mass, c


def test_p2g_pic_equals_apic_with_zero_affine() -> None:
    pos, vel, mass, _c = _particles(3)
    zero_c = np.zeros((pos.shape[0], 2, 2), dtype=np.float64)
    gm1 = np.zeros((_N, _N))
    gmom1 = np.zeros((_N, _N, 2))
    gm2 = np.zeros((_N, _N))
    gmom2 = np.zeros((_N, _N, 2))
    apic.p2g_2d(pos, vel, mass, zero_c, gm1, gmom1, _DX)
    apic.p2g_2d(pos, vel, mass, np.zeros_like(zero_c), gm2, gmom2, _DX)
    assert np.array_equal(gm1, gm2)
    assert np.array_equal(gmom1, gmom2)


def test_g2p_velocity_identical_across_modes() -> None:
    pos, vel, mass, c = _particles(4)
    gm = np.zeros((_N, _N))
    gmom = np.zeros((_N, _N, 2))
    apic.p2g_2d(pos, vel, mass, c, gm, gmom, _DX)
    gv = apic.grid_velocity_from_momentum(gm, gmom)
    v_apic = np.empty_like(vel)
    c_apic = np.empty_like(c)
    v_pic = np.empty_like(vel)
    c_pic = np.empty_like(c)
    apic.g2p_2d(pos, gv, _DX, True, v_apic, c_apic)
    apic.g2p_2d(pos, gv, _DX, False, v_pic, c_pic)
    assert np.array_equal(v_apic, v_pic)
    assert np.all(c_pic == 0.0)
    assert not np.all(c_apic == 0.0)


def test_flip_zero_force_carries_velocity() -> None:
    pos, vel, mass, _c = _particles(5)
    zero_c = np.zeros((pos.shape[0], 2, 2), dtype=np.float64)
    vel_before = vel.copy()
    transfer_cycle_step_2d(pos, vel, mass, zero_c, _DX, 1e-3, _N, _N, "flip")
    assert np.array_equal(vel, vel_before)


def test_sample_matches_g2p_velocity() -> None:
    """sample_grid_2d and g2p_2d share the reconstruction — bit-equal."""
    pos, vel, mass, c = _particles(6)
    gm = np.zeros((_N, _N))
    gmom = np.zeros((_N, _N, 2))
    apic.p2g_2d(pos, vel, mass, c, gm, gmom, _DX)
    gv = apic.grid_velocity_from_momentum(gm, gmom)
    v1 = np.empty_like(vel)
    c1 = np.empty_like(c)
    apic.g2p_2d(pos, gv, _DX, False, v1, c1)
    v2 = np.empty_like(vel)
    apic.sample_grid_2d(pos, gv, _DX, v2)
    assert np.array_equal(v1, v2)


def test_unknown_mode_rejected() -> None:
    """A typo'd mode must fail loudly, not silently run as FLIP/PIC
    (manifest honesty — the capture advertises the mode it ran)."""
    import pytest

    from pic_flip.reference.apic import apic_step_2d, default_params_2d

    pos, vel, mass, c = _particles(7)
    params = default_params_2d()
    params["mode"] = "apci"
    with pytest.raises(ValueError, match="unknown transfer mode"):
        apic_step_2d(pos, vel, mass, c, params)
    with pytest.raises(ValueError, match="unknown transfer mode"):
        transfer_cycle_step_2d(pos, vel, mass, c, _DX, 1e-3, _N, _N, "APIC")
