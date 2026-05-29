"""CLI entry point — ``python -m articulated_pedagogical --tier <tier>``.

Tiers (charter §3.2.6 / plan §6.4): ``single-joint`` (simple pendulum),
``double-pendulum``, ``6-dof`` (6-link chain), ``N-link`` (``--n``). Integrator
selectable via ``--integrator {semi-implicit-euler, rk4}`` (default
semi-implicit-euler).
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence

import numpy as np

from .dynamics import total_energy
from .integrators import simulate
from .model import (
    ArticulatedChain,
    make_double_pendulum,
    make_nlink_chain,
    make_simple_pendulum,
)

_TIERS = ("single-joint", "double-pendulum", "6-dof", "N-link")
_INTEGRATORS = ("semi-implicit-euler", "rk4")


def build_parser() -> argparse.ArgumentParser:
    """Construct the CLI parser (argument shape is stable at Stage 1a)."""
    parser = argparse.ArgumentParser(prog="python -m articulated_pedagogical")
    parser.add_argument("--tier", choices=_TIERS, default="single-joint")
    parser.add_argument("--integrator", choices=_INTEGRATORS, default="semi-implicit-euler")
    parser.add_argument("--n", type=int, default=6, help="link count for the N-link tier")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=1000)
    parser.add_argument("--dt", type=float, default=1e-3)
    return parser


def _chain_for_tier(tier: str, n: int) -> ArticulatedChain:
    if tier == "single-joint":
        return make_simple_pendulum()
    if tier == "double-pendulum":
        return make_double_pendulum()
    if tier == "6-dof":
        return make_nlink_chain(6)
    return make_nlink_chain(n)


def main(argv: Sequence[str] | None = None) -> int:
    """Run the selected tier and print a trajectory summary."""
    args = build_parser().parse_args(argv)
    chain = _chain_for_tier(args.tier, args.n)
    n = chain.n_links
    rng = np.random.default_rng(int(args.seed))
    q0 = rng.uniform(-0.5, 0.5, size=n) if args.tier == "N-link" else np.full(n, 0.3)
    qd0 = np.zeros(n, dtype=np.float64)

    q_traj, qd_traj = simulate(chain, q0, qd0, float(args.dt), int(args.steps), args.integrator)
    e0 = total_energy(chain, q_traj[0], qd_traj[0])
    ef = total_energy(chain, q_traj[-1], qd_traj[-1])
    print(f"tier={args.tier} n={n} integrator={args.integrator} steps={args.steps} dt={args.dt}")
    print(f"q0={q_traj[0]}")
    print(f"q_final={q_traj[-1]}")
    print(f"energy: E0={e0:.10f} Ef={ef:.10f} rel_drift={abs(ef - e0) / abs(e0):.3e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
