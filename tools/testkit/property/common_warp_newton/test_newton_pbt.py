"""Phase-4 WU-D property-based tests (spec §2.14; plan §7.5 v9 addendum).

Two declared invariants exercisable on the CPU-only host (the third suggested
invariant, ``solver_no_overpenetration``, requires the Newton solver runtime =
CUDA, which is BLOCKED — see the WU-D probe/audit):

- ``usd_round_trip_preserves_pose`` — any valid rigid-body position set survives
  capture → USD export → USD read within fp tolerance.
- ``determinism_declaration_consistent`` — every solver maps to its registered
  posture and the declaration validates.
"""

from __future__ import annotations

import numpy as np
import pytest
from common_warp.newton import DeterminismDeclaration, NewtonBackend
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

_SETTINGS = settings(max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow])


@_SETTINGS
@given(solver=st.sampled_from(NewtonBackend.SOLVERS), hw=st.sampled_from(["cpu", "cuda"]))
def test_determinism_declaration_consistent(solver: str, hw: str) -> None:
    decl = DeterminismDeclaration.for_solver(solver, hardware_class=hw)
    assert decl.solver == solver
    assert decl.hardware_class == hw
    assert decl.posture in ("bit-exact-same-hw", "epsilon-bounded", "non-deterministic-by-design")
    # Backend exposes the same posture for the same solver.
    assert (
        NewtonBackend(usd_path="x.usd", solver=solver).determinism_declaration.posture
        == decl.posture
    )


pxr = pytest.importorskip("pxr", reason="usd-core (pxr) not installed")


@_SETTINGS
@given(seed=st.integers(0, 2**31 - 1), n_bodies=st.integers(1, 4), n_steps=st.integers(1, 4))
def test_usd_round_trip_preserves_pose(
    seed: int, n_bodies: int, n_steps: int, tmp_path_factory
) -> None:
    from common_warp.capture import write_frames_capture
    from common_warp.usd import export_capture_to_usd
    from pxr import Usd, UsdGeom

    rng = np.random.default_rng(seed)
    positions = {k: rng.uniform(-5, 5, (n_bodies, 3)).astype(np.float64) for k in range(n_steps)}
    frames = [(k, {"positions": positions[k]}, {}) for k in range(n_steps)]
    manifest = {
        "schema_version": "1.1.0",
        "sim": {"name": "newton-usd-pbt", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-d-pbt"},
        "config": {"tier": "test", "dims": [n_bodies], "dtype": "f64", "seed": seed, "params": {}},
        "run": {
            "step_count": n_steps,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": "p.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }
    d = tmp_path_factory.mktemp("usd_pbt")
    manifest["payload"]["path"] = "pose.h5"
    json_path = write_frames_capture(frames, manifest, d)
    out = d / "anim.usda"
    export_capture_to_usd(str(json_path), str(out), fps=60.0)

    stage = Usd.Stage.Open(str(out))
    for i in range(n_bodies):
        xf = UsdGeom.Xformable(stage.GetPrimAtPath(f"/World/body_{i}"))
        op = next(o for o in xf.GetOrderedXformOps() if "translate" in o.GetOpName())
        for k in range(n_steps):
            got = np.array(op.Get(Usd.TimeCode(float(k))))
            np.testing.assert_allclose(got, positions[k][i], atol=1e-6)
