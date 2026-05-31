"""CLI entry point — ``python -m particle_lenia --steps N``.

Runs the canonical Particle Lenia rollout (LOCAL energy-descent rule) and prints the total-energy
trace endpoints + the max |force - (-∇E_FD)| residual (the energy-based correctness check). Note
the total energy is NOT monotonic under the LOCAL rule.
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence

import numpy as np

from .forward import ParticleLeniaConfig, grad_E_fd, total_energy
from .sim import ParticleLeniaSim


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m particle_lenia")
    parser.add_argument("--n", type=int, default=200, help="particle count")
    parser.add_argument("--steps", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    cfg = ParticleLeniaConfig(n_particles=int(args.n), steps=int(args.steps), seed=int(args.seed))
    sim = ParticleLeniaSim(cfg)
    pos0 = sim.positions()
    e0 = total_energy(pos0, cfg)
    force = sim.compute_force(pos0)
    fd = -grad_E_fd(pos0, cfg)
    resid = float(np.max(np.abs(force - fd)))
    for _ in range(cfg.steps):
        sim.step()
    ef = total_energy(sim.positions(), cfg)
    print(f"n={cfg.n_particles} steps={cfg.steps} seed={cfg.seed} (LOCAL rule)")
    print(f"E_total: start={e0:.6f} end={ef:.6f} (NOT monotonic under LOCAL rule)")
    print(f"max|force - (-grad_E_FD)| = {resid:.3e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
