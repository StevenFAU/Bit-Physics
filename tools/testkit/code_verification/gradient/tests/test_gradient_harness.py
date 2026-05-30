"""Tests for the gradient-verification harness.

Writes a fixture sim module (a Warp-backed InverseProblem subclass) to a tmp
dir, puts it on sys.path, and drives ``verify_sim_gradients`` end-to-end
against a canonical test-points JSON — exercising the real import path.
"""

from __future__ import annotations

import json
import sys

import pytest

from code_verification.gradient import GradientVerificationReport, verify_sim_gradients

_FIXTURE_SIM = """# mypy: ignore-errors
import numpy as np
import warp as wp
from common_warp.autodiff import ParameterIDProblem, ParamSpec

wp.init()
_N = 8
_DEVICE = "cpu"


@wp.kernel
def _linear_forward(
    flat: wp.array(dtype=wp.float64),
    xg: wp.array(dtype=wp.float64),
    pred: wp.array(dtype=wp.float64),
):
    i = wp.tid()
    pred[i] = flat[0] * xg[i] + flat[1]


class LinearParameterID(ParameterIDProblem):
    def __init__(self, **kw):
        super().__init__(**kw)
        self._flat = wp.zeros(2, dtype=wp.float64, requires_grad=True, device=_DEVICE)
        self._pred = wp.zeros(_N, dtype=wp.float64, requires_grad=True, device=_DEVICE)
        self._x = wp.array(
            np.linspace(-1.0, 1.0, _N).astype(np.float64), dtype=wp.float64, device=_DEVICE
        )
        self.state = self._x

    def params_spec(self):
        def pack(d):
            self._flat.assign(np.array([d["a"], d["b"]], dtype=np.float64))
            return self._flat

        def unpack(flat):
            v = flat.numpy()
            return {"a": float(v[0]), "b": float(v[1])}

        return ParamSpec(
            flat=self._flat, pack=pack, unpack=unpack,
            structure={"a": {"index": 0, "shape": ()}, "b": {"index": 1, "shape": ()}},
        )

    def forward(self, params, state):
        wp.launch(_linear_forward, dim=_N, inputs=[params, state, self._pred], device=_DEVICE)
        return self._pred
"""


def _target(a: float, b: float) -> list[float]:
    xg = list(__import__("numpy").linspace(-1.0, 1.0, 8))
    return [a * x + b for x in xg]


@pytest.fixture
def fixture_sim_on_path(tmp_path):
    (tmp_path / "fixture_sim.py").write_text(_FIXTURE_SIM, encoding="utf-8")
    sys.path.insert(0, str(tmp_path))
    yield "fixture_sim"
    sys.path.remove(str(tmp_path))
    sys.modules.pop("fixture_sim", None)


def test_verify_sim_gradients_all_passed(fixture_sim_on_path, tmp_path):
    points = [
        {"params": {"a": 1.0, "b": 0.0}, "target": _target(2.5, -1.25)},
        {"params": {"a": -0.5, "b": 2.0}, "target": _target(2.5, -1.25)},
        {"params": {"a": 3.0, "b": 3.0}, "target": _target(2.5, -1.25)},
    ]
    pts_file = tmp_path / "points.json"
    pts_file.write_text(json.dumps(points), encoding="utf-8")

    report = verify_sim_gradients(
        fixture_sim_on_path, "LinearParameterID", str(pts_file), rel_tol=1e-3
    )
    assert isinstance(report, GradientVerificationReport)
    assert report.test_points_total == 3
    assert report.test_points_passed == 3
    assert report.all_passed is True
    assert report.sim == "fixture_sim"


def test_verify_sim_gradients_missing_class(fixture_sim_on_path, tmp_path):
    pts_file = tmp_path / "points.json"
    pts_file.write_text(json.dumps([{"params": {"a": 1.0, "b": 0.0}, "target": _target(1, 1)}]))
    with pytest.raises(AttributeError):
        verify_sim_gradients(fixture_sim_on_path, "NoSuchProblem", str(pts_file))


def test_test_points_must_be_list(fixture_sim_on_path, tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"not": "a list"}), encoding="utf-8")
    with pytest.raises(ValueError, match="must contain a JSON list"):
        verify_sim_gradients(fixture_sim_on_path, "LinearParameterID", str(bad))


def test_empty_points_is_not_all_passed(fixture_sim_on_path, tmp_path):
    # An empty test-point set is NOT "all passed" — vacuous-truth guard.
    empty = tmp_path / "empty.json"
    empty.write_text(json.dumps([]), encoding="utf-8")
    report = verify_sim_gradients(fixture_sim_on_path, "LinearParameterID", str(empty))
    assert report.test_points_total == 0
    assert report.test_points_passed == 0
    assert report.all_passed is False


def test_single_point_all_passed(fixture_sim_on_path, tmp_path):
    one = tmp_path / "one.json"
    one.write_text(
        json.dumps([{"params": {"a": 1.0, "b": 0.0}, "target": _target(2.5, -1.25)}]),
        encoding="utf-8",
    )
    report = verify_sim_gradients(fixture_sim_on_path, "LinearParameterID", str(one), rel_tol=1e-3)
    assert report.test_points_total == 1
    assert report.test_points_passed == 1
    assert report.all_passed is True
