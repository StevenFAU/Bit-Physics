"""Gate-14-analog (single-stack): WU-F differentiable-axis forward-equivalence to the parent.

The diff variant's on-device forward acceleration ``q̈`` must equal the landed parent
``aba_forward_dynamics`` — bit-exact by construction (it reuses the SAME ``aba_kernel``, minus the
``.numpy()`` tape-sever). The FORWARD is exact at any ``n`` (only the ``n≥2`` adjoint is out of
scope), so equivalence is checked at n=1 AND n=2.
"""

from __future__ import annotations

import numpy as np
from articulated_pedagogical.aba import aba_forward_dynamics
from articulated_pedagogical.model import make_double_pendulum, make_simple_pendulum

from articulated_pedagogical_diff.sim import differentiable_qddot


def test_forward_equivalence_single_pendulum() -> None:
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    for q0 in (0.1, 0.5, 1.0, 2.0):
        q = np.array([q0])
        qd = np.array([0.3])
        assert np.array_equal(
            differentiable_qddot(chain, q, qd), aba_forward_dynamics(chain, q, qd)
        )


def test_forward_equivalence_double_pendulum() -> None:
    chain = make_double_pendulum()
    rng = np.random.default_rng(42)
    for _ in range(8):
        q = rng.uniform(-1.5, 1.5, size=2)
        qd = rng.uniform(-1.0, 1.0, size=2)
        assert np.array_equal(
            differentiable_qddot(chain, q, qd), aba_forward_dynamics(chain, q, qd)
        )


def test_forward_equivalence_with_torque() -> None:
    chain = make_simple_pendulum(1.2, 0.8, 9.81)
    q = np.array([0.4])
    qd = np.array([-0.2])
    tau = np.array([0.5])
    assert np.array_equal(
        differentiable_qddot(chain, q, qd, tau), aba_forward_dynamics(chain, q, qd, tau)
    )
