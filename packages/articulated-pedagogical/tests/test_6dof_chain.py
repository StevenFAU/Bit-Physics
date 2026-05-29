"""Stage 1a RED — 6-DOF (6-link) chain: energy conservation + RK4 convergence.

Two checks for the uniform 6-link chain (plan §6.4 ``6-dof`` tier):

1. **Energy conservation (independent physics oracle).** A frictionless chain
   under gravity conserves total mechanical energy; the symplectic (semi-implicit
   Euler) integrator keeps the drift bounded below ``energy_drift_rel_per_second
   = 1e-3`` (a correctness signal for the ABA dynamics — a wrong EOM leaks
   energy).
2. **RK4 step-size convergence.** Production RK4 at ``dt`` agrees with the RK4
   reference at ``dt/100`` (the numerical baseline) within ``trajectory_abs``
   over a short horizon — self-consistency of the ABA integrator under
   refinement.

Stage 1a — FAILS with ``NotImplementedError``; Stage 1b GREEN.
"""

from __future__ import annotations

import numpy as np

import articulated_pedagogical as ap

_N = 6
_G = 9.81
_DT = 1e-3
_HORIZON = 0.3
_TRAJ_ABS = 1e-2
_ENERGY_DRIFT_REL_PER_SECOND = 1e-3


def _initial_state() -> tuple[np.ndarray, np.ndarray]:
    # Mild fan-out configuration, at rest.
    q0 = np.array([0.3, -0.2, 0.15, -0.1, 0.05, -0.05], dtype=np.float64)
    qd0 = np.zeros(_N, dtype=np.float64)
    return q0, qd0


def test_6dof_energy_conservation_semi_implicit_euler() -> None:
    """Total energy drift stays below 1e-3 per second (symplectic Euler)."""
    chain = ap.make_nlink_chain(_N, link_length=1.0, link_mass=1.0, gravity=_G)
    q0, qd0 = _initial_state()
    n_steps = round(_HORIZON / _DT)
    q_traj, qd_traj = ap.simulate(chain, q0, qd0, _DT, n_steps)

    energies = np.array(
        [ap.total_energy(chain, q, qd) for q, qd in zip(q_traj, qd_traj, strict=True)]
    )
    e0 = energies[0]
    max_abs_drift = float(np.max(np.abs(energies - e0)))
    rel_drift_per_second = (max_abs_drift / abs(e0)) / _HORIZON
    assert rel_drift_per_second < _ENERGY_DRIFT_REL_PER_SECOND


def test_6dof_rk4_matches_refined_reference() -> None:
    """Production RK4 at dt agrees with RK4 reference at dt/100 (atol 1e-2)."""
    chain = ap.make_nlink_chain(_N, link_length=1.0, link_mass=1.0, gravity=_G)
    q0, qd0 = _initial_state()
    n_steps = round(_HORIZON / _DT)

    q_prod, _ = ap.simulate(chain, q0, qd0, _DT, n_steps, integrator="rk4")
    q_ref, _ = ap.rk4_reference(chain, q0, qd0, _DT, n_steps, refine=100)

    prod_pos = np.array([ap.link_positions(chain, q) for q in q_prod])
    ref_pos = np.array([ap.link_positions(chain, q) for q in q_ref])
    np.testing.assert_allclose(prod_pos, ref_pos, atol=_TRAJ_ABS, rtol=0.0)
