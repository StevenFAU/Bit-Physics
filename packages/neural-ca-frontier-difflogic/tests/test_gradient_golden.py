"""Gate-4 gradient golden table - >=3 independent anchors.

* **A1** the 16 gates' truth tables in the hard limit + multilinear midpoint values
  (closed form, hand-derived: g(a,b) = sum_corners t_ab * weights).
* **A2** the exhaustive-512 GoL-circuit equality count (independent source: the GoL rule
  itself - Gardner 1970) - stored as the match count 512.
* **A3** central finite-difference baseline on ``dLoss/dalpha`` through the soft circuit
  (WU-A; distinct numerical method).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from neural_ca_frontier_difflogic.forward import (
    DiffLogicConfig,
    eval_circuit_python,
    gol_rule,
    soft_gate,
)
from neural_ca_frontier_difflogic.invariants import hard_limit_matches_truth_table
from neural_ca_frontier_difflogic.sim import SoftExcitationID

ALGORITHM = "neural-ca-frontier-difflogic-gradient"


def _gate_eval(inp: dict[str, Any]) -> dict[str, float]:
    return {"value": float(soft_gate(int(inp["gate"]), float(inp["a"]), float(inp["b"])))}


def _exhaustive_gol(inp: dict[str, Any]) -> dict[str, float]:
    matches = 0
    for center in (0, 1):
        for mask in range(256):
            nb = [(mask >> k) & 1 for k in range(8)]
            out = eval_circuit_python(np.array([center, *nb], dtype=np.float64))
            if out == float(gol_rule(center, sum(nb))):
                matches += 1
    return {"matches": float(matches)}


def _autodiff_alpha_grad(inp: dict[str, Any]) -> dict[str, float]:
    cfg = DiffLogicConfig(soft_steps=int(inp["soft_steps"]))
    prob = SoftExcitationID(cfg)
    target = prob.final_state(float(inp["alpha_target"]))
    grad = prob.grad_wrt_alpha(float(inp["alpha"]), target)
    return {"grad_alpha": float(grad)}


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    anchor = inputs["anchor"]
    if anchor == "a1-gate-multilinear":
        return _gate_eval(inputs)
    if anchor == "a2-gol-exhaustive":
        return _exhaustive_gol(inputs)
    if anchor == "a3-fd-alpha":
        return _autodiff_alpha_grad(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_all_sixteen_gates_exact_at_corners() -> None:
    """A1 cross-check: every gate's hard limit is exact (no tolerance)."""
    for gate in range(16):
        assert hard_limit_matches_truth_table(gate), f"gate {gate}"


def test_a1_midpoint_is_truth_table_mean() -> None:
    """g(0.5, 0.5) == mean of the truth table (multilinear extension property)."""
    from neural_ca_frontier_difflogic.forward import GATE_TRUTH_TABLES

    for gate in range(16):
        expected = sum(GATE_TRUTH_TABLES[gate]) / 4.0
        assert abs(soft_gate(gate, 0.5, 0.5) - expected) <= 1e-15, f"gate {gate}"


def test_a3_gradient_matches_finite_difference_report() -> None:
    """A3 anchor mechanism: GradientCheckReport passes (autodiff vs central FD)."""
    cfg = DiffLogicConfig()
    prob = SoftExcitationID(cfg)
    target = prob.final_state(0.75)
    prob.set_target(target)
    report = prob.check_gradient(params={"alpha": 0.40}, eps=1e-6, rel_tol=1e-3)
    assert report.passed
    assert report.max_relative_error < 1e-3
