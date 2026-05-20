"""SimRunner adapter — mandelbulb DE-probe-points capture.

Spec descriptor (Appendix D § D.2.3): ``de-probe-points-seed42``.

The canonical "capture" for this sim is a deterministic grid of DE
evaluations across a representative slab; ``seed`` lightly perturbs the
grid origin (so distinct seeds yield distinct captures) while
``seed = 42`` is the basis for ``run_twice_and_diff`` bit-equality.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.quilez import distance_estimator, pow_z

CANONICAL_DESCRIPTOR: Final[str] = "de-probe-points-seed42"
CANONICAL_GRID: Final[int] = 16
CANONICAL_P: Final[int] = 8
CANONICAL_ESCAPE_RADIUS: Final[float] = 2.0
CANONICAL_N_MAX: Final[int] = 16
CANONICAL_BOX: Final[float] = 1.5  # sample box half-extent (centered at origin)
_GRID_JITTER_SCALE: Final[float] = 1e-6


def _probe_grid(seed: int) -> np.ndarray:
    """Build the canonical DE-probe grid: a 16x16 slab in the z=0 plane plus jitter.

    Per-seed jitter is applied to the GRID ORIGIN (a single (dx, dy, dz)
    offset), not per-sample, so determinism stays trivially verifiable
    by run-twice equality at any fixed seed.
    """
    rng = np.random.default_rng(int(seed))
    offset = _GRID_JITTER_SCALE * rng.standard_normal(3)
    axis = np.linspace(-CANONICAL_BOX, CANONICAL_BOX, CANONICAL_GRID)
    xs, ys = np.meshgrid(axis, axis, indexing="xy")
    zs = np.zeros_like(xs)
    grid = np.stack([xs + offset[0], ys + offset[1], zs + offset[2]], axis=-1)
    return np.asarray(grid, dtype=np.float64)


def _evaluate_de_grid(points: np.ndarray) -> np.ndarray:
    flat = points.reshape(-1, 3)
    out = np.empty(flat.shape[0], dtype=np.float64)
    for i, c in enumerate(flat):
        out[i] = distance_estimator(
            c=c.tolist(),
            p=CANONICAL_P,
            escape_radius=CANONICAL_ESCAPE_RADIUS,
            n_max=CANONICAL_N_MAX,
        )
    return out.reshape(points.shape[:-1])


def _build_manifest(
    seed: int,
    grid: int,
    wall_clock_seconds: float,
    payload_name: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "mandelbulb-explorer",
            "category": "closed-form",
            "variant": "quilez-p8",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-closed-form",
        },
        config={
            "tier": "test",
            "dims": [grid, grid],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "p": CANONICAL_P,
                "escape_radius": CANONICAL_ESCAPE_RADIUS,
                "n_max": CANONICAL_N_MAX,
                "box_half_extent": CANONICAL_BOX,
                "grid_jitter_scale": _GRID_JITTER_SCALE,
            },
        },
        run={
            "step_count": 1,
            "capture_interval": 1,
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-20T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical DE-probe capture.

    Evaluates the Quilez DE on a 16×16 z=0 grid at canonical (p=8,
    R=2, n_max=16). ``seed`` shifts the grid origin by O(1e-6) so
    different seeds yield distinct captures while seed=42 is
    bit-reproducible.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    grid_points = _probe_grid(seed)
    de_values = _evaluate_de_grid(grid_points)
    wall = time.perf_counter() - t0
    payload_name = f"{CANONICAL_DESCRIPTOR}.h5"
    manifest = _build_manifest(
        seed=seed,
        grid=CANONICAL_GRID,
        wall_clock_seconds=wall,
        payload_name=payload_name,
    )
    rows: list[StepState] = [
        StepState(
            step=0,
            state={
                "points": np.asarray(grid_points, dtype=np.float64).copy(),
                "de": np.asarray(de_values, dtype=np.float64).copy(),
            },
            diagnostics={
                "n_outside_set": float(np.sum(de_values > 0.0)),
                "max_de": float(np.max(de_values)),
            },
        ),
    ]
    manifest_path: Path = write_capture(rows, manifest, out_dir)
    return manifest_path


def compute_canonical_de_grid(seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """Return (points, de_values) for the canonical DE-probe grid (no I/O)."""
    pts = _probe_grid(seed)
    de = _evaluate_de_grid(pts)
    return pts, de


def camera_sweep_de_at_origin(radii: np.ndarray, *, seed: int = 42) -> np.ndarray:
    """DE evaluated along a radial ray on the +x axis at ``radii``.

    Used by ``test_diagnostics``'s output-stability check — for a
    sphere-tracing camera moving outward along +x, the DE is a smooth
    monotone-ish function of radius (modulo the bounding-sphere band).
    """
    rng = np.random.default_rng(int(seed))
    offset = _GRID_JITTER_SCALE * rng.standard_normal(3)
    rs = np.asarray(radii, dtype=np.float64)
    out = np.empty_like(rs)
    for i, r in enumerate(rs):
        c = [float(r) + offset[0], offset[1], offset[2]]
        out[i] = distance_estimator(
            c=c,
            p=CANONICAL_P,
            escape_radius=CANONICAL_ESCAPE_RADIUS,
            n_max=CANONICAL_N_MAX,
        )
    return out


def precision_pair_at_grid(*, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """Return (de_f32, de_f64) for the canonical DE-probe grid.

    The f32 path casts ``c`` to ``float32`` before each DE call, then
    promotes back to f64 for comparison. Quilez DE is well-conditioned
    at the canonical grid; the relative agreement is ~ 1e-5.
    """
    pts, de64 = compute_canonical_de_grid(seed)
    flat = pts.astype(np.float32).reshape(-1, 3)
    de32 = np.empty(flat.shape[0], dtype=np.float64)
    for i, c in enumerate(flat):
        de32[i] = distance_estimator(
            c=np.asarray(c, dtype=np.float64).tolist(),
            p=CANONICAL_P,
            escape_radius=CANONICAL_ESCAPE_RADIUS,
            n_max=CANONICAL_N_MAX,
        )
    return de32.reshape(de64.shape), de64


__all__ = [
    "CANONICAL_BOX",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_ESCAPE_RADIUS",
    "CANONICAL_GRID",
    "CANONICAL_N_MAX",
    "CANONICAL_P",
    "camera_sweep_de_at_origin",
    "compute_canonical_de_grid",
    "precision_pair_at_grid",
    "sim_runner_seeded",
]


_ = pow_z  # re-export hook; used by callers iterating the map directly.
