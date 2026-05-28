"""The ``3dgs-smoke`` simulator (charter § 1.1; ``just run-3dgs-smoke``).

Loads a small Gaussian-splat scene from ``references/3DGS-reference/`` (or a tiny
generated test scene when the vendored upstream ships no bundled small scene),
renders one frame with :func:`common_3dgs.render`, writes the rendered RGB image
as a PNG (the D-D writer :func:`common_3dgs.save_png`), and writes a Layer-0 HDF5
capture (category ``neural-rendered``) whose payload is the rendered image — the
capture seeds the schema-corpus fixture
``tests/fixtures/legacy-captures/phase-3-common-3dgs.h5`` for Phase-4 WU-A.

Scaffolded at Stage 1a (signature + docstring; body raises
``NotImplementedError``). Implementation lands at Stage 1b.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

_NOT_IMPL = "common-3dgs Stage 1a scaffold: implementation lands at Stage 1b"

#: Smoke-scene descriptor (capture naming).
DESCRIPTOR_DEFAULT = "3dgs-smoke-seed42-frame0"
SEED_DEFAULT = 42
IMAGE_SIZE_DEFAULT = 64


@dataclass
class SmokeResult:
    """Outcome of :func:`run_3dgs_smoke`."""

    image: np.ndarray | None = None  # (H, W, 3) f32 rendered frame
    png_path: Path | None = None
    capture_path: Path | None = None  # manifest .json path
    num_gaussians: int = 0
    diagnostics: dict[str, float] = field(default_factory=dict)


def run_3dgs_smoke(
    out_dir: str | Path | None = None,
    *,
    seed: int = SEED_DEFAULT,
    image_size: int = IMAGE_SIZE_DEFAULT,
    device: str = "cpu",
    descriptor: str = DESCRIPTOR_DEFAULT,
) -> SmokeResult:
    """Render one frame of the smoke scene; optionally write PNG + capture."""
    raise NotImplementedError(_NOT_IMPL)


def main() -> None:  # pragma: no cover — manual / demo entry point
    """Run the canonical smoke sim, writing artifacts under examples/smoke_3dgs/out/."""
    out = Path(__file__).resolve().parent / "out"
    res = run_3dgs_smoke(out)
    print(f"3dgs-smoke: rendered {res.num_gaussians} gaussians -> {res.png_path}")


if __name__ == "__main__":  # pragma: no cover
    main()
