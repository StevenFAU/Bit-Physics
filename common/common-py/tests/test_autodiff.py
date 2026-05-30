"""Tests for common_py.autodiff — Taichi ti.ad.Tape inverse-problem surface.

Exercises the full public contract against a genuinely differentiable Taichi
forward (a linear model ``pred[i] = a·x[i] + b``): gradient cross-check,
optimizer convergence (adam/sgd/lbfgs), History recording, and the ParamSpec
pack/unpack bridge.

No ``from __future__ import annotations`` — this module defines a ``@ti.kernel``
whose ``ti.template()`` annotations must stay live objects (IC-12 discipline).
"""

import numpy as np
import pytest
import taichi as ti

from common_py.autodiff import (
    ControlProblem,
    GradientCheckReport,
    History,
    InitialStateRecoveryProblem,
    InverseProblem,
    ParameterIDProblem,
    ParamSpec,
    finite_difference_gradient,
)

_N = 8  # grid points
_A_TRUE = 2.5
_B_TRUE = -1.25


@pytest.fixture(autouse=True)
def _ti_init():
    # Fresh Taichi runtime per test: all fields are created before the first
    # kernel launch (Taichi's field-allocation constraint).
    ti.init(arch=ti.cpu, default_fp=ti.f64, default_ip=ti.i32, random_seed=0)
    yield


@ti.kernel
def _linear_forward(flat: ti.template(), xg: ti.template(), pred: ti.template()):  # type: ignore[no-untyped-def]
    for i in pred:
        pred[i] = flat[0] * xg[i] + flat[1]


class LinearParameterID(ParameterIDProblem):
    """Recover (a, b) of ``pred[i] = a·x[i] + b`` from observed final state."""

    def __init__(self, **kw) -> None:
        super().__init__(**kw)
        self._flat = ti.field(ti.f64, shape=2, needs_grad=True)
        self._pred = ti.field(ti.f64, shape=_N, needs_grad=True)
        self._x = ti.field(ti.f64, shape=_N)
        self._x.from_numpy(np.linspace(-1.0, 1.0, _N).astype(np.float64))
        self.state = self._x

    def params_spec(self) -> ParamSpec:
        def pack(d):
            self._flat[0] = float(d["a"])
            self._flat[1] = float(d["b"])
            return self._flat

        def unpack(flat):
            return {"a": float(flat[0]), "b": float(flat[1])}

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={"a": {"index": 0, "shape": ()}, "b": {"index": 1, "shape": ()}},
        )

    def forward(self, params, state):
        _linear_forward(params, state, self._pred)
        return self._pred


def _target_array() -> np.ndarray:
    xg = np.linspace(-1.0, 1.0, _N)
    return (_A_TRUE * xg + _B_TRUE).astype(np.float64)


def test_finite_difference_gradient_matches_analytic():
    # f(x) = sum(x²) → grad = 2x
    grad = finite_difference_gradient(lambda v: float(np.sum(v**2)), np.array([1.0, -2.0, 3.0]))
    np.testing.assert_allclose(grad, np.array([2.0, -4.0, 6.0]), atol=1e-6)


def test_check_gradient_autodiff_matches_finite_difference():
    prob = LinearParameterID()
    prob.set_target(_target_array())
    report = prob.check_gradient(params={"a": 1.0, "b": 0.0}, eps=1e-4, rel_tol=1e-3)
    assert isinstance(report, GradientCheckReport)
    assert report.passed, report.per_param_relative_error
    assert report.max_relative_error <= 1e-3
    assert set(report.per_param_relative_error) == {"a", "b"}


def test_zero_gradient_for_non_influential_parameter():
    # A parameter not wired into the loss must have ~0 autodiff gradient.
    prob = LinearParameterID()
    prob.set_target(_target_array())
    spec = prob.params_spec()
    spec.pack({"a": _A_TRUE, "b": _B_TRUE})  # at the exact solution loss == 0
    x0 = spec.flat.to_numpy().astype(np.float64)
    loss, grad = prob._loss_and_grad(spec, x0)
    assert loss == pytest.approx(0.0, abs=1e-18)
    np.testing.assert_allclose(grad, np.zeros_like(grad), atol=1e-9)


@pytest.mark.parametrize("optimizer", ["adam", "sgd", "lbfgs"])
def test_fit_recovers_parameters(optimizer):
    lr = {"adam": 0.2, "sgd": 0.1, "lbfgs": 1.0}[optimizer]
    prob = LinearParameterID(optimizer=optimizer, lr=lr, max_iter=2000, tol=1e-12)
    hist = prob.fit(params_init={"a": 0.0, "b": 0.0}, target=_target_array())
    assert isinstance(hist, History)
    assert hist.iter_count >= 1
    recovered = hist.params_trajectory[-1]
    assert recovered["a"] == pytest.approx(_A_TRUE, abs=1e-3)
    assert recovered["b"] == pytest.approx(_B_TRUE, abs=1e-3)
    # losses are non-increasing in the tail (converging)
    assert hist.losses[-1] <= hist.losses[0]


def test_fit_records_history_and_callbacks():
    seen: list[int] = []
    prob = LinearParameterID(optimizer="adam", lr=0.2, max_iter=50, tol=1e-12)
    hist = prob.fit(
        params_init={"a": 0.0, "b": 0.0},
        target=_target_array(),
        callbacks=[lambda it, loss, params: seen.append(it)],
    )
    assert len(hist.losses) == hist.iter_count
    assert len(hist.params_trajectory) == hist.iter_count
    assert seen == list(range(hist.iter_count))


def test_subclass_semantics_present():
    # The three semantic subclasses share the InverseProblem ABC surface.
    for klass in (ParameterIDProblem, InitialStateRecoveryProblem, ControlProblem):
        assert issubclass(klass, InverseProblem)


def test_unknown_optimizer_rejected():
    prob = LinearParameterID(optimizer="rmsprop")
    with pytest.raises(ValueError, match="unknown optimizer"):
        prob.fit(params_init={"a": 0.0, "b": 0.0}, target=_target_array())
