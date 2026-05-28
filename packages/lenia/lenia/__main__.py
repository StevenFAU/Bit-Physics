"""``python -m lenia`` CLI (per `docs/phases/phase-3-plan.md` § 3.2.6).

Stage 1b: argparse + dispatch to :class:`lenia.sim.LeniaSim.capture`.

Standard flags (per § 3.2.6):

- ``--seed N``                          — RNG seed (default 42).
- ``--steps N``                         — number of Euler steps (default 1000).
- ``--grid N``                          — grid side length (default 256).
- ``--preset NAME``                     — preset name (default orbium-unicaudatus).
- ``--out DIR``                         — capture output directory (default captures/lenia/).
- ``--tolerance-key KEY``               — tolerance lookup key (default continuous-ca.lenia).
- ``--determinism-arch ARCH``           — Taichi arch (default cpu).
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .sim import LeniaConfig, LeniaSim


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="lenia", description="Reference Lenia on Stack D (Taichi)."
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=1000)
    parser.add_argument("--grid", type=int, default=256)
    parser.add_argument("--preset", type=str, default="orbium-unicaudatus")
    parser.add_argument("--out", type=Path, default=Path("captures/lenia"))
    parser.add_argument("--tolerance-key", type=str, default="continuous-ca.lenia")
    parser.add_argument("--determinism-arch", type=str, default="cpu")
    args = parser.parse_args(argv)

    if args.preset != "orbium-unicaudatus":
        raise SystemExit(
            f"unsupported preset {args.preset!r}; only 'orbium-unicaudatus' is shipped at Stage 1b"
        )
    if args.determinism_arch != "cpu":
        raise SystemExit(
            f"only --determinism-arch cpu is supported at Stage 1b; got {args.determinism_arch!r}"
        )

    config = LeniaConfig(
        preset=args.preset,
        grid=args.grid,
        seed=args.seed,
        steps=args.steps,
    )
    sim = LeniaSim(config)
    manifest_path = sim.capture(args.out)
    print(f"wrote {manifest_path}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
