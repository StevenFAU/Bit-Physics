"""The ``3dgs-smoke`` simulator (charter § 1.1; ``just run-3dgs-smoke``).

Generates a small deterministic Gaussian-splat scene (the vendored Inria upstream
ships no bundled small .ply scene — scenes are user data), round-trips it through
``save_ply`` / ``load_ply``, renders one frame with :func:`common_3dgs.render`,
writes the rendered RGB image as a PNG (the D-D writer :func:`common_3dgs.save_png`),
and writes a Layer-0 HDF5 capture (category ``neural-rendered``) whose payload is
the rendered image — the capture seeds the schema-corpus fixture
``tests/fixtures/legacy-captures/phase-3-common-3dgs.h5`` for Phase-4 WU-A.

Exercises every public common-3dgs surface (GaussianSplatModel + load/save_ply,
Camera, render, save_png) end-to-end.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from common_3dgs import Camera, GaussianSplatModel, render, save_png

#: Smoke-scene descriptor (capture naming).
DESCRIPTOR_DEFAULT = "3dgs-smoke-seed42-frame0"
SEED_DEFAULT = 42
IMAGE_SIZE_DEFAULT = 128
SH_DEGREE = 3
_K = (SH_DEGREE + 1) ** 2  # 16
_C0 = 0.28209479177387814  # SH DC basis constant (Inria utils/sh_utils.py)
_GRID = 6  # 6x6 grid of splats


@dataclass
class SmokeResult:
    """Outcome of :func:`run_3dgs_smoke`."""

    image: np.ndarray | None = None  # (H, W, 3) f32 rendered frame
    png_path: Path | None = None
    capture_path: Path | None = None  # manifest .json path
    num_gaussians: int = 0
    diagnostics: dict[str, float] = field(default_factory=dict)


def _color_to_dc(rgb: np.ndarray) -> np.ndarray:
    """Encode a linear RGB colour into the SH DC term (render() inverts via +0.5)."""
    return (rgb - 0.5) / _C0


def build_smoke_scene(device: str = "cpu") -> GaussianSplatModel:
    """A deterministic 6x6 grid of colour-graded Gaussians in the z=0 plane."""
    xs = np.linspace(-1.0, 1.0, _GRID, dtype=np.float32)
    ys = np.linspace(-1.0, 1.0, _GRID, dtype=np.float32)
    gx, gy = np.meshgrid(xs, ys, indexing="ij")
    n = _GRID * _GRID

    positions = np.stack([gx.ravel(), gy.ravel(), np.zeros(n, np.float32)], axis=1)
    scales = np.full((n, 3), 0.18, dtype=np.float32)
    rotations = np.tile(np.array([1.0, 0.0, 0.0, 0.0], np.float32), (n, 1))  # identity wxyz
    opacities = np.full(n, 0.9, dtype=np.float32)

    # Colour graded by grid position: R←x, G←y, B←radius.
    u = (gx.ravel() + 1.0) / 2.0
    v = (gy.ravel() + 1.0) / 2.0
    rad = np.sqrt(gx.ravel() ** 2 + gy.ravel() ** 2) / math.sqrt(2.0)
    rgb = np.clip(np.stack([u, v, 1.0 - rad], axis=1), 0.0, 1.0).astype(np.float32)

    sh = np.zeros((n, _K, 3), dtype=np.float32)
    sh[:, 0, :] = _color_to_dc(rgb)
    return GaussianSplatModel(positions, scales, rotations, opacities, sh, device=device)


def run_3dgs_smoke(
    out_dir: str | Path | None = None,
    *,
    seed: int = SEED_DEFAULT,
    image_size: int = IMAGE_SIZE_DEFAULT,
    device: str = "cpu",
    descriptor: str = DESCRIPTOR_DEFAULT,
) -> SmokeResult:
    """Render one frame of the smoke scene; optionally write PNG + capture."""
    t0 = time.perf_counter()
    model = build_smoke_scene(device=device)

    camera = Camera.look_at(
        position=(0.0, 0.0, 3.0),
        target=(0.0, 0.0, 0.0),
        up=(0.0, 1.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=image_size,
        image_width=image_size,
    )
    image = render(model, camera, background=(0.05, 0.05, 0.08))
    wall = time.perf_counter() - t0

    result = SmokeResult(
        image=image,
        num_gaussians=model.num_gaussians,
        diagnostics={
            "mean_luminance": float(image.mean()),
            "nonbackground_fraction": float(np.mean(image.max(axis=2) > 0.1)),
        },
    )

    if out_dir is not None:
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        # Round-trip the scene through the Inria .ply format (exercise load/save).
        ply_path = out / f"{descriptor}.ply"
        model.save_ply(ply_path)
        _ = GaussianSplatModel.load_ply(ply_path, device=device)

        result.png_path = save_png(image, out / f"{descriptor}.png")
        result.capture_path = _write_capture(out, descriptor, seed, image, wall, result.diagnostics)

    return result


def _write_capture(
    out: Path,
    descriptor: str,
    seed: int,
    image: np.ndarray,
    wall: float,
    diagnostics: dict[str, float],
) -> Path:
    """Write a Layer-0 HDF5 capture (category neural-rendered) of the rendered frame."""
    from capture import CaptureManifest, StepState, write_capture

    from common_3dgs import __version__

    h, w, _ = image.shape
    manifest = CaptureManifest.from_dict(
        {
            "schema_version": "1.0.0",
            "sim": {
                "name": "3dgs-smoke",
                "category": "neural-rendered",
                "variant": "forward-ewa-splatting",
            },
            "stack": {
                "name": "warp-stack-e",
                "version": __version__,
                "build_id": "sub-phase-phase-3-common-3dgs",
            },
            "config": {
                "tier": "smoke",
                "dims": [int(h), int(w), 3],
                "dtype": "f32",
                "seed": int(seed),
                "params": {"sh_degree": SH_DEGREE, "n_gaussians": _GRID * _GRID, "fov_y_deg": 50.0},
            },
            "run": {
                "step_count": 1,
                "capture_interval": 1,
                "wall_clock_seconds": float(wall),
                "start_utc": "2026-05-28T00:00:00Z",
            },
            "payload": {
                "format": "hdf5",
                "path": f"{descriptor}.h5",
                "checksum": "sha256:" + "0" * 64,
            },
            "determinism": {
                "claimed": "bit-exact-same-hw",
                "atomic_ops": False,
                "subgroup_ops": False,
            },
        }
    )
    step = StepState(
        step=0,
        state={"rgb_image": np.ascontiguousarray(image, dtype=np.float32)},
        diagnostics={k: float(v) for k, v in diagnostics.items()},
    )
    return write_capture([step], manifest, out)


def main() -> None:  # pragma: no cover — manual / demo entry point
    """Run the canonical smoke sim, writing artifacts under examples/smoke_3dgs/out/."""
    out = Path(__file__).resolve().parent / "out"
    res = run_3dgs_smoke(out)
    print(f"3dgs-smoke: rendered {res.num_gaussians} gaussians -> {res.png_path}")
    print(f"capture: {res.capture_path}  diagnostics: {res.diagnostics}")


if __name__ == "__main__":  # pragma: no cover
    main()
