"""CLI entry point — ``python -m articulated_pedagogical_diff --mode <mode>``.

Modes (gate-8 public API): ``gradient`` prints the autodiff ``∂q̈/∂q`` + ``∂q̈/∂τ`` for the simple
pendulum at a chosen angle alongside the closed-form analytic references; ``recover`` solves the
initial-state-recovery inverse problem and prints the recovered ``(q0, qd0)`` + final loss.
Single-pendulum scope (Stage-0 WARP-NATIVE-TAPE probe).
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence

import numpy as np
from articulated_pedagogical.model import make_simple_pendulum

from .forward import ArticulatedDiffConfig, analytic_dqddot_dq, analytic_dqddot_dtau
from .sim import qddot_gradient, solve_recovery

_MODES = ("gradient", "recover")


def build_parser() -> argparse.ArgumentParser:
    """Construct the CLI parser (argument shape is stable at Stage 1a)."""
    parser = argparse.ArgumentParser(prog="python -m articulated_pedagogical_diff")
    parser.add_argument("--mode", choices=_MODES, default="gradient")
    parser.add_argument("--q", type=float, default=0.4, help="joint angle for the gradient mode")
    parser.add_argument("--length", type=float, default=1.0)
    parser.add_argument("--mass", type=float, default=1.0)
    parser.add_argument("--gravity", type=float, default=9.81)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the selected mode and print a summary."""
    args = build_parser().parse_args(argv)
    chain = make_simple_pendulum(length=args.length, mass=args.mass, gravity=args.gravity)

    if args.mode == "gradient":
        q = np.array([float(args.q)], dtype=np.float64)
        qd = np.zeros(1, dtype=np.float64)
        _, dq = qddot_gradient(chain, q, qd, wrt="q")
        _, dtau = qddot_gradient(chain, q, qd, wrt="tau")
        ana_dq = analytic_dqddot_dq(args.length, args.gravity, float(args.q))
        ana_dtau = analytic_dqddot_dtau(args.mass, args.length)
        print(f"q={args.q} L={args.length} m={args.mass} g={args.gravity}")
        print(f"dqddot_dq  : autodiff={dq:.12e}  analytic={ana_dq:.12e}")
        print(f"dqddot_dtau: autodiff={dtau:.12e}  analytic={ana_dtau:.12e}")
        return 0

    cfg = ArticulatedDiffConfig(length=args.length, mass=args.mass, gravity=args.gravity)
    sol = solve_recovery(chain, cfg)
    print(f"planted   q0={sol.planted_q0} qd0={sol.planted_qd0}")
    print(f"recovered q0={sol.recovered_q0} qd0={sol.recovered_qd0}")
    print(f"final_loss={sol.loss_trajectory[-1]:.3e} iters={len(sol.loss_trajectory)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
