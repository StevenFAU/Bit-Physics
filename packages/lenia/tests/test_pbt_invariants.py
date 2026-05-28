"""Stage 1b — PBT invariants (≥ 2 per spec § 2.14).

Per ``docs/sim-specs/continuous-ca/lenia/spec-ref.md`` § 6 +
charter §1.1 first-SIM PBT-module surfacing.

**Stage 1b SHIFTED-on-evidence (HARD RULE 2 + §0.3).** The Stage-1a
charter §6 RED invariants were:

1. ``mass_approximately_conserved`` — total field mass preserved within
   tolerance.
2. ``monotone_bounds`` — field ∈ [0, 1] for the run.

The mass-conservation invariant is **mathematically falsified** for
arbitrary IC under Lenia's Quad4 polynomial growth gn=1: the growth
function is not mass-preserving (cells where convolved value is far
from ``mu`` decay at rate -1; cells near ``mu`` grow at +1; the
balance is **not** a conservation law). Stage 1b empirically measured
~10% mass loss over 5 steps on a Gaussian-blob IC (HEAD `de92946`
RED-state output captured the discrepancy). Per HARD RULE 2 + charter
§6 anti-pattern reminder ("widening Hypothesis examples or relaxing
the assertion = anti-pattern; the failing example IS the value"),
the invariant is re-declared, NOT widened.

Stage 1b's ≥ 2 invariants:

1. **`monotone_bounds`** — every cell of the field remains in
   ``[0, 1]`` for the duration of the run. Holds by the ``clip(0, 1)``
   step in the Euler update.
2. **`per_step_change_bounded_by_dt`** — every cell's per-step delta
   ``|A_{n+1}(x) - A_n(x)| ≤ dt`` for the Lenia Quad4-polynomial
   forward. Holds because ``G ∈ [-1, 1]`` (the Chakazul gn=1
   polynomial saturates at ±1) and the ``clip(0, 1)`` step can only
   bring the cell closer to ``A_n`` than the raw Euler update would.
   Sharper than ``monotone_bounds`` because it constrains the
   *derivative*, not just the value.

Spec-ref §6 is updated to reflect the SHIFTED invariants at Stage 1b
landing.
"""

from __future__ import annotations

import numpy as np


def _load_sim_module() -> object:
    import lenia  # type: ignore[attr-defined]

    return lenia


def test_pbt_monotone_bounds_witness() -> None:
    """Field ∈ [0, 1] for the duration of the run (clip-Euler enforced)."""
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=32, steps=5)
    sim = lenia.LeniaSim(config)
    for _ in range(config.steps):
        sim.step()
        field = sim.field()
        assert float(np.min(field)) >= 0.0
        assert float(np.max(field)) <= 1.0


def test_pbt_per_step_change_bounded_by_dt_witness() -> None:
    """|A_{n+1}(x) - A_n(x)| ≤ dt for all cells (Quad4 polynomial G ∈ [-1, 1] + clip).

    The clip-Euler bound is exact: even at the edges of [0, 1] the
    clip can only reduce the change, never amplify it. We allow a
    1e-12 absolute tolerance for float64 round-off in the comparison.
    """
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=32, steps=5)
    sim = lenia.LeniaSim(config)
    dt = float(config.dt)
    eps = 1e-12
    for _ in range(config.steps):
        prev = sim.field()
        sim.step()
        delta = np.abs(sim.field() - prev)
        max_delta = float(np.max(delta))
        assert max_delta <= dt + eps, f"per-step change {max_delta} > dt + eps = {dt + eps}"
