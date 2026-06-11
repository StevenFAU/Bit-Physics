"""Frozen-gate Differentiable Logic CA (Stack D / Taichi) - Phase 6 C-1 unit U-2.

Frontier variant of neural-ca (spec § 11.5 item 4.20 / Phase-4 ledger row 28, deferred to
Phase-4-Greenfield-CPU, built in Phase-6 cluster C-1 under the ratified D-3 frozen-gate
scope). The update rule is a hand-constructed circuit of the 16 two-input boolean gates as
multilinear extensions (Miotti et al. 2025, arXiv:2506.04912; CITE-DON'T-IMPORT): exact
Game-of-Life in the hard limit, smooth and tape-differentiable on soft states via the
WU-A autodiff substrate. No training => no EFECT.
"""

from .capture import CANONICAL_DESCRIPTOR, default_capture, write_inverse_capture
from .forward import (
    GATE_TRUTH_TABLES,
    GOL_CIRCUIT,
    N_WIRES,
    DiffLogicConfig,
    blinker_initial_state,
    circuit_step_python,
    eval_circuit_python,
    glider_initial_state,
    gol_rule,
    soft_gate,
)
from .invariants import gradient_matches_finite_difference, hard_limit_matches_truth_table
from .sim import InverseSolution, SoftExcitationID, run_hard_trajectory, solve_recovery

__all__ = [
    "CANONICAL_DESCRIPTOR",
    "GATE_TRUTH_TABLES",
    "GOL_CIRCUIT",
    "N_WIRES",
    "DiffLogicConfig",
    "InverseSolution",
    "SoftExcitationID",
    "blinker_initial_state",
    "circuit_step_python",
    "default_capture",
    "eval_circuit_python",
    "glider_initial_state",
    "gol_rule",
    "gradient_matches_finite_difference",
    "hard_limit_matches_truth_table",
    "run_hard_trajectory",
    "soft_gate",
    "solve_recovery",
    "write_inverse_capture",
]
