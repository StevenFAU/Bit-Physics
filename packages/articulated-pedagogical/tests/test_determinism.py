"""Stage 1a RED — D-DET bit-exact same-stack-same-hw MEASURE.

Per charter §6 D-DET + spec-ref §8: bit-exact same-stack-same-hw via the Warp
CPU serial launch + f64 accumulators (no atomics, no subgroup ops). Two runs of
the production trajectory with identical inputs must produce byte-equal arrays.

Stage 1b additionally wires ``common_warp.assert_deterministic_run`` on the sim
runner; this in-package test runs ``simulate`` twice and asserts bit-equality.

Stage 1a — FAILS with ``NotImplementedError`` from the integrator shell;
Stage 1b inverts to GREEN (MEASURED bit-exact).
"""

from __future__ import annotations

import common_warp
import numpy as np

import articulated_pedagogical as ap


def test_two_runs_bit_equal() -> None:
    """D-DET MEASURE: two identical double-pendulum runs are byte-equal."""
    chain = ap.make_double_pendulum(1.0, 1.0, 1.0, 1.0, 9.81)
    q0 = np.array([0.5, 0.2], dtype=np.float64)
    qd0 = np.zeros(2, dtype=np.float64)
    dt = 1e-3
    n_steps = 200

    q_a, qd_a = ap.simulate(chain, q0, qd0, dt, n_steps)
    q_b, qd_b = ap.simulate(chain, q0, qd0, dt, n_steps)

    np.testing.assert_array_equal(q_a, q_b)
    np.testing.assert_array_equal(qd_a, qd_b)


def test_assert_deterministic_run_bit_exact() -> None:
    """D-DET MEASURE via common_warp.assert_deterministic_run (bit-exact,
    tolerance=0.0 → sha256 over raw bytes identical across runs)."""
    chain = ap.make_nlink_chain(6, link_length=1.0, link_mass=1.0, gravity=9.81)
    q0 = np.array([0.3, -0.2, 0.15, -0.1, 0.05, -0.05], dtype=np.float64)
    qd0 = np.zeros(6, dtype=np.float64)

    def run() -> np.ndarray:
        q_traj, _qd_traj = ap.simulate(chain, q0, qd0, 1e-3, 100)
        return q_traj

    # Raises AssertionError if any run diverges (tolerance=0.0 bit-exact).
    digest = common_warp.assert_deterministic_run(run, runs=3, tolerance=0.0)
    assert isinstance(digest, str) and len(digest) == 64
