"""CLI entry point — ``python -m articulated_pedagogical --tier <tier>``.

Tiers (charter §3.2.6 / plan §6.4): ``single-joint`` (simple pendulum),
``double-pendulum``, ``6-dof`` (6-link chain), ``N-link`` (``--n``). Integrator
selectable via ``--integrator {semi-implicit-euler, rk4}`` (default
semi-implicit-euler).

Stage 1a: ``main`` raises ``NotImplementedError``; argument wiring + the
trajectory-run dispatch land at Stage 1b.
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence

_TIERS = ("single-joint", "double-pendulum", "6-dof", "N-link")
_INTEGRATORS = ("semi-implicit-euler", "rk4")

_STAGE_1B = (
    "articulated-pedagogical CLI Stage 1a scaffold: the --tier run dispatch "
    "lands at Stage 1b. See docs/sim-specs/rigid-body/articulated-pedagogical/"
    "spec-ref.md §7."
)


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


def main(argv: Sequence[str] | None = None) -> int:
    """Run the selected tier. (Stage 1b implements the dispatch.)"""
    build_parser().parse_args(argv)
    raise NotImplementedError(_STAGE_1B)


if __name__ == "__main__":
    raise SystemExit(main())
