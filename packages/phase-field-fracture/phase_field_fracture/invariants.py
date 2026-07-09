"""Invariant checks — the executable form of the spec-ref.md § 6.1 gates.

These are pure functions over solver traces so both the pytest suite and
the PBT harness share one implementation.
"""

from __future__ import annotations

import numpy as np

from .solver import TraceResult


def damage_in_bounds(res: TraceResult, eps: float = 1e-12) -> bool:
    """d in [0, 1] at every checkpoint (AT2 maximum principle + clamp)."""
    return all(
        float(st.d.min()) >= -eps and float(st.d.max()) <= 1.0 + eps
        for st in res.captures
    )


def damage_monotone(res: TraceResult, eps: float = 0.0) -> bool:
    """G-irrev: d never decreases between checkpoints (no healing)."""
    for prev, cur in zip(res.captures, res.captures[1:], strict=False):
        if float(np.min(cur.d - prev.d)) < -eps:
            return False
    return True


def history_monotone(res: TraceResult, eps: float = 0.0) -> bool:
    """H is a running maximum by construction; witness it end-to-end."""
    for prev, cur in zip(res.captures, res.captures[1:], strict=False):
        if float(np.min(cur.h_field - prev.h_field)) < -eps:
            return False
    return True


def ke_over_ie_pre_peak(res: TraceResult, u_min: float = 0.1) -> float:
    """G-QS: the worst KE/IE ratio over the gated quasi-static window
    U in [u_min, U_peak]. The startup transient right after the ramp (KE
    finite while IE is still near zero) is excluded like the published
    explicit-QS practice does; the post-peak burst is legitimately dynamic
    (spec-ref.md § 3.6) and reported separately."""
    diags = res.diagnostics
    forces = np.array([d.reaction for d in diags])
    i_peak = int(np.argmax(forces))
    worst = 0.0
    for d in diags[: i_peak + 1]:
        if abs(d.u_applied) < u_min or d.ie <= 0.0:
            continue
        worst = max(worst, d.ke / d.ie)
    return worst


def energy_residual_pre_peak(res: TraceResult) -> float:
    """G-energy on the gated window: |W_ext - (IE + E_frac + KE + D_damp +
    D_gf)| / max(W_ext) up to the peak, with the settled notch baseline
    subtracted. The post-peak residual is the DISCLOSED hybrid/history
    variational-inconsistency observable (§ 3.3), reported separately."""
    diags = res.diagnostics
    forces = np.array([d.reaction for d in diags])
    i_peak = int(np.argmax(forces))
    base = diags[0].e_frac
    worst = 0.0
    for d in diags[: i_peak + 1]:
        if d.w_ext <= 1e-9 or abs(d.u_applied) < 0.1:
            continue
        tot = d.ie + (d.e_frac - base) + d.ke + d.d_damp + d.d_gf
        worst = max(worst, abs(d.w_ext - tot) / d.w_ext)
    return worst


def crack_path_iou(d_a: np.ndarray, d_b: np.ndarray, threshold: float = 0.5) -> float:
    """Damage-mask intersection-over-union between two runs (G-Gammav /
    G-matched crack-path agreement observable)."""
    a = d_a >= threshold
    b = d_b >= threshold
    union = int(np.sum(a | b))
    if union == 0:
        return 1.0
    return float(np.sum(a & b)) / union
