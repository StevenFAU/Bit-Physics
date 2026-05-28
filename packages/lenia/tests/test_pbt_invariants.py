"""Stage 1a RED — PBT invariants (≥ 2 per spec § 2.14).

Per ``docs/sim-specs/continuous-ca/lenia/spec-ref.md`` § 6 +
charter §1.1 first-SIM PBT-module surfacing:

1. ``mass_approximately_conserved`` — total field mass preserved within
   a numerical tolerance bound over a small Euler step horizon.
2. ``monotone_bounds`` — every cell stays in ``[0, 1]`` for the run.

Stage 1a — both invariants FAIL with ``NotImplementedError`` from the
``LeniaSim`` shell. Stage 1b lands the implementation + the
shared PBT module under ``tools/testkit/property/sims/lenia/`` (per
§ 6.0 item 7) + the Hypothesis examples DB at
``packages/lenia/.hypothesis/`` (NOT gitignored per § 2.14).

The per-sim sanity tests below are the in-package witnesses; the
testkit/property/sims/lenia/ module is the shared definition.
"""

from __future__ import annotations

import numpy as np


def _load_sim_module() -> object:
    import lenia  # type: ignore[attr-defined]

    return lenia


def test_pbt_mass_approximately_conserved_witness() -> None:
    """Mass-conservation invariant under a small horizon.

    Stage 1a — fails with ``NotImplementedError``. Stage 1b: total
    field mass preserved within tolerance over short Euler horizons.
    """
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=32, steps=5)
    sim = lenia.LeniaSim(config)
    mass_initial = float(np.sum(sim.field()))
    for _ in range(config.steps):
        sim.step()
    mass_final = float(np.sum(sim.field()))
    # Tolerance bound set at Stage 1b after the Taichi reduction is measured;
    # for Stage 1a's RED the call to .field() fails first.
    assert abs(mass_final - mass_initial) <= 0.05 * max(mass_initial, 1e-6)


def test_pbt_monotone_bounds_witness() -> None:
    """Field ∈ [0, 1] for the duration of the run.

    Stage 1a — fails with ``NotImplementedError``. Stage 1b: every
    cell remains in ``[0, 1]`` under the clip-step in the Euler update.
    """
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=32, steps=5)
    sim = lenia.LeniaSim(config)
    for _ in range(config.steps):
        sim.step()
        field = sim.field()
        assert float(np.min(field)) >= 0.0
        assert float(np.max(field)) <= 1.0
