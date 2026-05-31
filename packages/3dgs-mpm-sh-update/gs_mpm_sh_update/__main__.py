"""CLI: run the canonical SH-update coupled sim and write a capture (+ optional renders)."""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gs_mpm_sh_update")
    parser.add_argument("--out", type=Path, default=Path("captures/3dgs-mpm-sh-update-ref"))
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--render-dir", type=Path, default=None)
    args = parser.parse_args(argv)

    from common_3dgs import save_png

    from .sim import run_canonical_sh_update_sim, write_capture_file

    frames = run_canonical_sh_update_sim(seed=args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_capture_file(frames, args.out)
    if args.render_dir is not None:
        args.render_dir.mkdir(parents=True, exist_ok=True)
        for fr in frames:
            save_png(fr.image, args.render_dir / f"3dgs-mpm-sh-update-frame-{fr.step}.png")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
