"""CLI: run the canonical coupled 3dgs-mpm sim -> capture + rendered frames (spec-ref § 3.2.6).

``python -m gs_mpm run --out <dir>`` runs the canonical schedule, writes the capture
(``<dir>/3dgs-mpm.{h5,json}``, BOTH MPM + Gaussian state) and the rendered frames
(``<dir>/3dgs-mpm-canonical-frame-{N}.png``).
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    """Entry point. ``python -m gs_mpm run --out <dir>`` runs the canonical sim."""
    parser = argparse.ArgumentParser(prog="gs_mpm", description="3dgs-mpm coupled sim")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="run the canonical coupled sim")
    run.add_argument("--out", type=Path, required=True, help="output directory")
    run.add_argument("--seed", type=int, default=0)
    args = parser.parse_args(argv)

    if args.command == "run":
        from common_3dgs import save_png

        from .sim import run_canonical_sim, write_capture_file

        out: Path = args.out
        out.mkdir(parents=True, exist_ok=True)
        frames = run_canonical_sim(seed=args.seed)
        for fr in frames:
            save_png(fr.image, out / f"3dgs-mpm-canonical-frame-{fr.step}.png")
        write_capture_file(frames, out / "3dgs-mpm")
        print(f"wrote {len(frames)} frames + capture to {out}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
