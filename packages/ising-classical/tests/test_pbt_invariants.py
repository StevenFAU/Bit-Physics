"""Class (c) — Property-based invariants (spec § 2.14; ≥ 2 per § 6.0 item 7).

Two invariants per charter § 5 D-PBT (RESOLVED-IN-CHARTER):

1. ``magnetization_bounded`` — ``|m| = |(1/N) Σ s_i| ≤ 1`` at every step.
2. ``energy_per_spin_bounded`` — ``E/N ∈ [-2, 2]`` for the 2D
   nearest-neighbour Ising (J=1) at every step.

Both are mathematically pristine for Ising spins (the lenia Stage-1b
``mass_approximately_conserved`` falsification does NOT translate).

Each runs with ``n_examples = 20`` per Phase-3 budget over
seed-sampled short runs (10 sweeps, 32x32) at temperatures sweeping
``[1.0, 4.0]``.

Stage 1a: ``sim_runner_pbt`` raises ``NotImplementedError``; the
harness call propagates it. Stage 1b inverts to GREEN.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from capture import Capture
from property.harness import Fail, Invariant, InvariantOutcome, Pass, run_invariants
from property.strategies import random_seed


def _load_sim() -> object:
    from ising_classical import sim

    return sim


def _energy_per_spin_from_field(spins: np.ndarray) -> float:
    """E/N for the 2D nearest-neighbour Ising (J=1, periodic BCs).

    E = -J Σ_<ij> s_i s_j over the 2N bonds; per spin ∈ [-2, 2].
    Each bond counted once via the +x and +y neighbour rolls.
    """
    s = spins.astype(np.float64)
    bond_energy = -(s * np.roll(s, -1, axis=0) + s * np.roll(s, -1, axis=1))
    return float(bond_energy.sum() / s.size)


def magnetization_bounded() -> Invariant:
    """``|m| ≤ 1`` at every captured step."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        for stp in capture.steps():
            if "spins" not in stp.state:
                return Fail(detail=f"missing field 'spins' at step {stp.step}")
            spins = stp.state["spins"]
            m = float(np.mean(spins.astype(np.float64)))
            if not np.isfinite(m) or abs(m) > 1.0 + 1e-12:
                return Fail(
                    detail=f"magnetization_bounded: |m|={abs(m)} > 1 at step {stp.step}",
                    counter_example={"step": stp.step, "m": m},
                )
        return Pass(detail="magnetization_bounded: |m| ≤ 1 across all steps")

    return Invariant(
        name="magnetization_bounded",
        applies_to_category="lattice-spin",
        check_fn=check_fn,
    )


def energy_per_spin_bounded() -> Invariant:
    """``E/N ∈ [-2, 2]`` at every captured step (2D NN Ising, J=1)."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        for stp in capture.steps():
            if "spins" not in stp.state:
                return Fail(detail=f"missing field 'spins' at step {stp.step}")
            e = _energy_per_spin_from_field(stp.state["spins"])
            if not np.isfinite(e) or e < -2.0 - 1e-12 or e > 2.0 + 1e-12:
                return Fail(
                    detail=f"energy_per_spin_bounded: E/N={e} out of [-2, 2] at step {stp.step}",
                    counter_example={"step": stp.step, "energy_per_spin": e},
                )
        return Pass(detail="energy_per_spin_bounded: E/N ∈ [-2, 2] across all steps")

    return Invariant(
        name="energy_per_spin_bounded",
        applies_to_category="lattice-spin",
        check_fn=check_fn,
    )


def test_pbt_magnetization_bounded(tmp_path: Path) -> None:
    sim = _load_sim()
    verdict = run_invariants(
        sim.sim_runner_pbt,  # type: ignore[attr-defined]
        [magnetization_bounded()],
        strategy=random_seed(),
        n_examples=20,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed, [(r.invariant, r.detail, r.counter_example) for r in verdict.results]


def test_pbt_energy_per_spin_bounded(tmp_path: Path) -> None:
    sim = _load_sim()
    verdict = run_invariants(
        sim.sim_runner_pbt,  # type: ignore[attr-defined]
        [energy_per_spin_bounded()],
        strategy=random_seed(),
        n_examples=20,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed, [(r.invariant, r.detail, r.counter_example) for r in verdict.results]
