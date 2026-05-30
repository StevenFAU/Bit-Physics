"""``common_warp.newton`` tests — metadata surface + CUDA-gated runtime guard.

The Newton solver runtime needs the ``newton`` package + CUDA 12 (absent on the
CPU-only Phase-4.0 host), so the runtime methods raise a clear ``RuntimeError``
(the operator-ratified CPU-fallback BLOCKED posture, surfaced loudly). The
metadata surface (SOLVERS, solver validation, NewtonState, determinism) is
available on any host and is what these CPU tests pin.
"""

from __future__ import annotations

import numpy as np
import pytest

from common_warp.newton import DeterminismDeclaration, NewtonBackend, NewtonState
from common_warp.newton.backend import _newton_runtime_available

RUNTIME = _newton_runtime_available()


def test_solvers_are_the_six_documented() -> None:
    assert NewtonBackend.SOLVERS == (
        "mujoco_warp",
        "kamino",
        "xpbd",
        "featherstone",
        "semi_implicit",
        "vbd",
    )


def test_unknown_solver_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown solver"):
        NewtonBackend(usd_path="x.usd", solver="bullet")


def test_substeps_validated() -> None:
    with pytest.raises(ValueError, match="substeps"):
        NewtonBackend(usd_path="x.usd", substeps=0)


@pytest.mark.skipif(RUNTIME, reason="Newton runtime present (CUDA) — BLOCKED path not exercised")
def test_runtime_blocked_raises_clearly_without_cuda() -> None:
    b = NewtonBackend(usd_path="x.usd", solver="mujoco_warp")
    for call in (lambda: b.step(), lambda: b.state(), lambda: b.reset_to_initial()):
        with pytest.raises(RuntimeError, match=r"BLOCKED|CUDA"):
            call()
    with pytest.raises(RuntimeError, match=r"BLOCKED|CUDA"):
        _ = b.newton_instance


def test_determinism_declaration_available_without_runtime() -> None:
    decl = NewtonBackend(usd_path="x.usd", solver="mujoco_warp").determinism_declaration
    assert isinstance(decl, DeterminismDeclaration)
    assert decl.posture == "bit-exact-same-hw"
    assert decl.solver == "mujoco_warp"


@pytest.mark.parametrize(
    ("solver", "posture"),
    [
        ("mujoco_warp", "bit-exact-same-hw"),
        ("featherstone", "bit-exact-same-hw"),
        ("semi_implicit", "bit-exact-same-hw"),
        ("xpbd", "bit-exact-same-hw"),
        ("kamino", "non-deterministic-by-design"),
        ("vbd", "non-deterministic-by-design"),
    ],
)
def test_per_solver_determinism_posture(solver: str, posture: str) -> None:
    assert DeterminismDeclaration.for_solver(solver).posture == posture


def test_determinism_declaration_validates_posture() -> None:
    with pytest.raises(ValueError, match="Unknown posture"):
        DeterminismDeclaration(posture="kinda-deterministic", solver="x", hardware_class="cpu")
    with pytest.raises(ValueError, match="Unknown solver"):
        DeterminismDeclaration.for_solver("bullet")


def test_newton_state_dataclass_roundtrip() -> None:
    s = NewtonState(
        body_positions=np.zeros((2, 3)),
        body_orientations=np.zeros((2, 4)),
        body_linear_velocities=np.zeros((2, 3)),
        body_angular_velocities=np.zeros((2, 3)),
        joint_positions=np.zeros((1,)),
        joint_velocities=np.zeros((1,)),
        sim_time=0.5,
    )
    assert s.sim_time == 0.5
    assert s.body_positions.shape == (2, 3)
