"""Rotating-disk angular momentum (calculation validation, spec-ref § 6.4).

Jiang 2017 JCP § 6.1 signature demonstration at the transfer level:
under the transfer-only cycle (no forces — regularizers OFF, projection
off, so the conservative core is isolated), APIC conserves total
angular momentum to integrator/roundoff order while PIC visibly damps
it. Thresholds are measured-then-pinned.
"""

from __future__ import annotations


from pic_flip.sim import (
    make_rotating_disk_2d,
    total_angular_momentum_2d,
    transfer_cycle_step_2d,
)

_N_STEPS = 50
_DT = 2.0e-3


def _run(mode: str) -> tuple[float, float]:
    pos, vel, mass, affine_c, dx, center = make_rotating_disk_2d()
    n = int(round(1.0 / dx))
    l0 = total_angular_momentum_2d(pos, vel, affine_c, mass, dx, center=center)
    for _ in range(_N_STEPS):
        transfer_cycle_step_2d(pos, vel, mass, affine_c, dx, _DT, n, n, mode)
    l1 = total_angular_momentum_2d(pos, vel, affine_c, mass, dx, center=center)
    return l0, l1


def test_apic_conserves_pic_damps() -> None:
    l0_a, l1_a = _run("apic")
    l0_p, l1_p = _run("pic")
    assert l0_a == l0_p  # identical ICs
    drift_apic = abs(l1_a - l0_a) / abs(l0_a)
    decay_pic = abs(l1_p - l0_p) / abs(l0_p)
    # PIC's velocity-only G2P discards the spin term every cycle —
    # measurable decay over 50 steps.
    assert decay_pic > 1e-2, decay_pic
    # APIC drift is orders of magnitude smaller (measured-then-pinned:
    # advection moves particles between transfers, so exact transfer-
    # level conservation becomes a small O(dt) full-cycle drift).
    assert drift_apic < 0.02 * decay_pic, (drift_apic, decay_pic)


def test_apic_transfer_level_exactness_at_dt0() -> None:
    """At dt = 0 (no advection) the P2G/G2P cycle conserves L to
    roundoff — the golden-table statement on the full disk."""
    pos, vel, mass, affine_c, dx, center = make_rotating_disk_2d()
    n = int(round(1.0 / dx))
    l0 = total_angular_momentum_2d(pos, vel, affine_c, mass, dx, center=center)
    transfer_cycle_step_2d(pos, vel, mass, affine_c, dx, 0.0, n, n, "apic")
    l1 = total_angular_momentum_2d(pos, vel, affine_c, mass, dx, center=center)
    assert abs(l1 - l0) <= 1e-12 * abs(l0), (l0, l1)
