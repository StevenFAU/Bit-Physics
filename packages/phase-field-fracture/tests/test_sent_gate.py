"""SENT benchmark gates on the canonical 96^2 gate scene (spec-ref.md § 6.1).

Bands are measured-then-declared (measured 2026-07-09 on this exact scene,
f64 NumPy):

- peak reaction 259.76 (= 701.36 N with the Miehe force unit) vs the
  PhaseFieldX example-1711 reproduction 0.7012 kN -> measured 0.02 % off;
  DECLARED band +/-10 % per spec-ref.md § 6.1 G-SENT (the published-value
  band, not a widened self-band).
- G-QS: worst KE/IE on U in [0.1, U_peak] measured 6.3e-3 -> declared 0.05
  (the spec's 5 % ceiling; 1 % gold target holds everywhere past startup).
- G-energy (pre-peak window): measured 4.7e-3 -> declared 0.03.
- post-peak KE/IE measured 0.11 — the snap-back IS dynamic (§ 3.6 honesty:
  asserted as a floor, not gated small).
"""

from __future__ import annotations

import numpy as np
from phase_field_fracture.invariants import (
    damage_in_bounds,
    damage_monotone,
    energy_residual_pre_peak,
    history_monotone,
    ke_over_ie_pre_peak,
)
from phase_field_fracture.reference import FORCE_UNIT_N, SENT_PEAK_REPRODUCTION_KN
from phase_field_fracture.sim import peak_reaction
from phase_field_fracture.solver import TraceResult

GateRun = tuple[TraceResult, str]


def test_sent_peak_in_published_band(gate_run: GateRun) -> None:
    res, _ = gate_run
    peak, u_peak = peak_reaction(res)
    peak_kn = peak * FORCE_UNIT_N / 1000.0
    rel = abs(peak_kn - SENT_PEAK_REPRODUCTION_KN) / SENT_PEAK_REPRODUCTION_KN
    assert rel <= 0.10, f"peak {peak_kn:.4f} kN vs 0.7012 kN: {100 * rel:.1f} %"
    # pre-peak F-delta monotone (low-pass by the diag cadence)
    diags = res.diagnostics
    forces = np.array([d.reaction for d in diags])
    i_peak = int(np.argmax(forces))
    pre = forces[: i_peak + 1]
    upre = np.array([d.u_applied for d in diags[: i_peak + 1]])
    sel = upre >= 0.1
    assert float(np.min(np.diff(pre[sel]))) > -0.02 * float(pre.max())
    # brittle drop present: force collapses past the peak
    assert float(forces[-1]) <= 0.25 * float(forces[i_peak])
    assert 0.2 <= u_peak <= 0.45


def test_quasi_static_discipline(gate_run: GateRun) -> None:
    res, _ = gate_run
    assert ke_over_ie_pre_peak(res) <= 0.05  # G-QS declared ceiling
    # the post-peak snap-back is legitimately dynamic — witness the spike
    last = res.diagnostics[-1]
    assert last.ke / last.ie >= 0.02


def test_energy_balance_pre_peak(gate_run: GateRun) -> None:
    res, _ = gate_run
    assert energy_residual_pre_peak(res) <= 0.03  # G-energy declared


def test_irreversibility_and_bounds(gate_run: GateRun) -> None:
    res, _ = gate_run
    assert damage_in_bounds(res)
    assert damage_monotone(res)  # G-irrev
    assert history_monotone(res)


def test_crack_ran_the_ligament(gate_run: GateRun) -> None:
    """Final regularized surface energy ~ crack length: the burst must have
    carried the crack across the remaining ligament (~L/2 = 33.3 ell), and
    the void notch itself contributes ~0 (measured 34.38 total)."""
    res, _ = gate_run
    e_frac = res.diagnostics[-1].e_frac
    half = res.config.l_domain / 2.0
    assert 0.9 * half <= e_frac <= 1.25 * half
    # crack reached the far edge: damage on the last column of cells
    d_final = res.captures[-1].d
    assert float(d_final[-1, :].max()) >= 0.9
