"""Stage 1b — golden-value tests (gate-4): production matches the golden tables.

Loads the three committed golden tables and asserts the production
Featherstone-ABA + integrators reproduce them within
`[golden_tolerance.rigid-body.articulated-pedagogical]`
(`pendulum_period_rel=1e-3`, `trajectory_abs=1e-2`). The single-pendulum table
carries the ≥3 independent analytic anchors (A1/A2/A3); the double-pendulum /
6-DOF tables carry independent closed-form / energy-conservation references.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

import articulated_pedagogical as ap

from .conftest import REPO_ROOT

TABLES = REPO_ROOT / "tools" / "testkit" / "golden" / "tables"
_PERIOD_REL = 1e-3
_TRAJ_ABS = 1e-2


def _load(name: str) -> dict:
    return json.loads((TABLES / name).read_text())


def test_pendulum_golden_anchors() -> None:
    table = _load("rigid-body-pendulum-trajectory.json")
    n_anchors = sum(1 for p in table["test_points"] if "independent_reference" in p)
    assert n_anchors >= 3  # spec §2.4
    for p in table["test_points"]:
        q = p["inputs"]
        expected = p["expected"]["value"]
        if q["quantity"] == "small_angle_period":
            got = ap.pendulum_period_small_angle(q["length"], q["gravity"])
            assert got == pytest.approx(expected, rel=_PERIOD_REL)
        elif q["quantity"] == "large_angle_period":
            got = ap.pendulum_period_large_angle(q["length"], q["gravity"], q["theta0"])
            assert got == pytest.approx(expected, rel=_PERIOD_REL)
        elif q["quantity"] == "theta_at_t":
            got = float(ap.pendulum_angle(q["length"], q["gravity"], q["theta0"], q["t"]))
            assert got == pytest.approx(expected, abs=_TRAJ_ABS)


def test_double_pendulum_golden_positions() -> None:
    table = _load("rigid-body-double-pendulum-trajectory.json")
    cfg = table["config"]
    chain = ap.make_double_pendulum(
        cfg["length1"], cfg["length2"], cfg["mass1"], cfg["mass2"], cfg["gravity"]
    )
    q0 = np.array([cfg["theta1_0"], cfg["theta2_0"] - cfg["theta1_0"]], dtype=np.float64)
    qd0 = np.zeros(2, dtype=np.float64)
    max_step = max(p["inputs"]["step"] for p in table["test_points"])
    q_traj, _ = ap.simulate(chain, q0, qd0, 1e-3, max_step, integrator="rk4")
    for p in table["test_points"]:
        step = p["inputs"]["step"]
        pos = ap.link_positions(chain, q_traj[step])
        np.testing.assert_allclose(pos[0], p["expected"]["mass1_xy"], atol=_TRAJ_ABS, rtol=0.0)
        np.testing.assert_allclose(pos[1], p["expected"]["mass2_xy"], atol=_TRAJ_ABS, rtol=0.0)


def test_6dof_golden_energy() -> None:
    table = _load("rigid-body-6dof-trajectory.json")
    cfg = table["config"]
    chain = ap.make_nlink_chain(
        cfg["n_links"], cfg["link_length"], cfg["link_mass"], cfg["gravity"]
    )
    q0 = np.array(cfg["q0"], dtype=np.float64)
    qd0 = np.zeros(cfg["n_links"], dtype=np.float64)
    max_step = max(p["inputs"]["step"] for p in table["test_points"])
    q_traj, qd_traj = ap.simulate(chain, q0, qd0, 1e-3, max_step, integrator="rk4")
    for p in table["test_points"]:
        step = p["inputs"]["step"]
        got = ap.total_energy(chain, q_traj[step], qd_traj[step])
        assert got == pytest.approx(p["expected"]["value"], abs=_TRAJ_ABS)
        # independent energy-conservation reference: E(t) ≈ E(0)
        assert got == pytest.approx(p["independent_reference"]["expected"]["value"], abs=_TRAJ_ABS)
