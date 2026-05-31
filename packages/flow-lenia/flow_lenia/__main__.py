"""CLI entry point — ``python -m flow_lenia --steps N``.

Runs the canonical Flow Lenia rollout (reintegration tracking) and prints the per-step mass-
conservation residual (max relative drift over the rollout) + the min mass (non-negativity). Mass is
conserved to summation roundoff (~Nε), NOT bit-exact.
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence

import numpy as np

from .forward import FlowLeniaConfig, total_mass
from .sim import FlowLeniaSim


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m flow_lenia")
    parser.add_argument("--grid", type=int, default=32)
    parser.add_argument("--steps", type=int, default=40)
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    cfg = FlowLeniaConfig(grid=int(args.grid), steps=int(args.steps), seed=int(args.seed))
    sim = FlowLeniaSim(cfg)
    m0 = total_mass(sim.mass_field())
    max_drift = 0.0
    min_mass = float(np.min(sim.mass_field()))
    for _ in range(cfg.steps):
        sim.step()
        mt = total_mass(sim.mass_field())
        max_drift = max(max_drift, abs(mt - m0) / abs(m0))
        min_mass = min(min_mass, float(np.min(sim.mass_field())))
    print(f"grid={cfg.grid} steps={cfg.steps} seed={cfg.seed} (reintegration tracking)")
    print(f"mass: M0={m0:.10f} max_rel_drift={max_drift:.3e} (summation roundoff, NOT bit-exact)")
    print(f"min_mass over rollout={min_mass:.6f} (non-negativity)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
