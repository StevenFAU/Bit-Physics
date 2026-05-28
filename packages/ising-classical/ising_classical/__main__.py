"""CLI for the Ising-classical reference sim (§ 3.2.6 conventions).

``python -m ising_classical --seed 42 --steps 10000 --grid 128 --temp 2.27 \\
    --out captures/ising-classical-ref``

Writes the canonical capture
``metropolis-128sq-T2.27-seed42-step10000.{h5,json}`` via the NumPy
reference (the CI-visible oracle). The Stack-B WGSL parallel-Metropolis
kernel runs locally only (spec §7.8) and is exercised by
``packages/ising-classical/src/index.ts``.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .sim import sim_runner_seeded


def main() -> None:
    parser = argparse.ArgumentParser(prog="ising_classical")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=10000)
    parser.add_argument("--grid", type=int, default=128)
    parser.add_argument("--temp", type=float, default=2.27)
    parser.add_argument("--out", type=Path, default=Path("captures/ising-classical-ref"))
    parser.add_argument("--tolerance-key", type=str, default="lattice-spin.ising-classical")
    args = parser.parse_args()

    manifest_path = sim_runner_seeded(seed=args.seed, out_dir=args.out)
    print(f"wrote canonical Ising capture manifest: {manifest_path}")


if __name__ == "__main__":
    main()
