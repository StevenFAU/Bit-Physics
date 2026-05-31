"""CLI: run the canonical 3dgs-smoke sim and write a capture (+ optional renders)."""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="eulerian_smoke_neural")
    parser.add_argument("--out", type=Path, default=Path("captures/eulerian-smoke-neural-ref"))
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--render-dir", type=Path, default=None)
    args = parser.parse_args(argv)

    from common_3dgs import save_png

    from .sim import run_canonical_smoke_neural_sim, write_capture_file

    frames = run_canonical_smoke_neural_sim(seed=args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_capture_file(frames, args.out)
    if args.render_dir is not None:
        args.render_dir.mkdir(parents=True, exist_ok=True)
        for fr in frames:
            save_png(fr.image, args.render_dir / f"eulerian-smoke-neural-frame-{fr.step}.png")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
