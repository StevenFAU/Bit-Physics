"""Deterministic diagnostic trajectory and browser-gate fixture generator."""

from __future__ import annotations

import numpy as np

from .reference.solver import lattice_droplet, step


Trajectory = list[dict[str, object]]


def compute_diagnostic_trajectory(steps: int = 8) -> Trajectory:
    state, params = lattice_droplet(side=12, radius=0.2)
    out: Trajectory = []
    for i in range(steps + 1):
        out.append(
            {
                "step": np.asarray(i),
                "position": state.position.copy(),
                "velocity": state.velocity.copy(),
                "phase": state.phase.copy(),
            }
        )
        if i < steps:
            state, diagnostics = step(state, params)
            out[-1]["diagnostics"] = diagnostics
    return out


def sim_runner_diagnostic(seed: int = 42) -> Trajectory:
    del seed  # lattice canonical is intentionally non-stochastic
    return compute_diagnostic_trajectory()


def sim_runner_seeded(seed: int = 42) -> Trajectory:
    return sim_runner_diagnostic(seed)
