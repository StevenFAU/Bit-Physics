# mypy: ignore-errors
"""WU-A property-based invariants for the autodiff gradient surface (spec § 2.14).

Two declared invariants over random initial conditions (Hypothesis):

1. **autodiff ≈ finite-difference** — the gradient computed via the Warp
   ``wp.Tape`` backend matches a central finite-difference gradient within a
   small relative tolerance, for random parameter points and random targets.
2. **zero gradient for non-influential parameters** — a parameter wired into
   the ``ParamSpec`` but NOT into the loss has (near-)zero autodiff gradient.

Uses the Warp backend (``common_warp.autodiff``) — locale-clean, so it runs
under the testkit's strict ``filterwarnings = ["error"]`` ini. The model is
``pred[i] = a·x[i] + b`` with an unused third parameter ``c``.
"""

import numpy as np
import warp as wp
from common_warp.autodiff import ParameterIDProblem, ParamSpec
from hypothesis import given, settings
from hypothesis import strategies as st

wp.init()
_N = 8
_DEVICE = "cpu"
_XGRID = np.linspace(-1.0, 1.0, _N).astype(np.float64)


@wp.kernel
def _linear_forward(
    flat: wp.array(dtype=wp.float64),
    xg: wp.array(dtype=wp.float64),
    pred: wp.array(dtype=wp.float64),
):
    i = wp.tid()
    # flat[2] (c) is deliberately NOT read — it must not influence the loss.
    pred[i] = flat[0] * xg[i] + flat[1]


class _LinearWithUnusedParam(ParameterIDProblem):
    """pred = a·x + b; parameter c (index 2) is unused → zero gradient."""

    def __init__(self, **kw):
        super().__init__(**kw)
        self._flat = wp.zeros(3, dtype=wp.float64, requires_grad=True, device=_DEVICE)
        self._pred = wp.zeros(_N, dtype=wp.float64, requires_grad=True, device=_DEVICE)
        self._x = wp.array(_XGRID, dtype=wp.float64, device=_DEVICE)
        self.state = self._x

    def params_spec(self) -> ParamSpec:
        def pack(d):
            self._flat.assign(np.array([d["a"], d["b"], d["c"]], dtype=np.float64))
            return self._flat

        def unpack(flat):
            v = flat.numpy()
            return {"a": float(v[0]), "b": float(v[1]), "c": float(v[2])}

        return ParamSpec(
            flat=self._flat,
            pack=pack,
            unpack=unpack,
            structure={
                "a": {"index": 0, "shape": ()},
                "b": {"index": 1, "shape": ()},
                "c": {"index": 2, "shape": ()},
            },
        )

    def forward(self, params, state):
        wp.launch(_linear_forward, dim=_N, inputs=[params, state, self._pred], device=_DEVICE)
        return self._pred


_finite = st.floats(min_value=-5.0, max_value=5.0, allow_nan=False, allow_infinity=False)


@settings(max_examples=60, deadline=None)
@given(a=_finite, b=_finite, c=_finite, a_t=_finite, b_t=_finite)
def test_autodiff_matches_finite_difference(a, b, c, a_t, b_t):
    target = (a_t * _XGRID + b_t).astype(np.float64)
    prob = _LinearWithUnusedParam()
    prob.set_target(target, device=_DEVICE)
    report = prob.check_gradient(params={"a": a, "b": b, "c": c}, eps=1e-4, rel_tol=1e-2)
    assert report.max_relative_error <= 1e-2, report.per_param_relative_error


@settings(max_examples=60, deadline=None)
@given(a=_finite, b=_finite, c=_finite, a_t=_finite, b_t=_finite)
def test_unused_parameter_has_zero_gradient(a, b, c, a_t, b_t):
    target = (a_t * _XGRID + b_t).astype(np.float64)
    prob = _LinearWithUnusedParam()
    prob.set_target(target, device=_DEVICE)
    spec = prob.params_spec()
    spec.pack({"a": a, "b": b, "c": c})
    x0 = spec.flat.numpy().astype(np.float64)
    _, grad = prob._loss_and_grad(spec, x0)
    assert abs(grad[2]) <= 1e-9, f"unused-param gradient {grad[2]} not ~0"
