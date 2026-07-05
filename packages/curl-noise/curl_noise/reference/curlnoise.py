"""Canonical curl-noise reference runner (spec-ref § 5, § 9).

Canonical scene: fixed 3D cross-product field with one spherical
obstacle (SDF-substitution boundary, exact surface tangency), fixed
seed / octaves / tracer seeds, RK4 + 1-iteration Newton reprojection.
Gated observables are chaos-immune: iso-value residual, matched-grid
discrete divergence, run-twice byte-identity (§ 9).

CLI::

    uv run --no-sync python -m curl_noise.reference.curlnoise \
        --out captures/ [--seed 42] [--diagnostics]
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .advect import CurlResult, advect
from .boundary import crossprod_obstacle_potentials, sphere_sdf_grad_hess
from .discrete import (
    fd_divergence_probe,
    matched_curl_3d,
    matched_divergence_3d,
)
from .fields import (
    CANONICAL_CONFIG,
    CurlNoiseConfig,
    clebsch_helicity_integrand,
    fbm_grad_hess,
    gradient_orthogonality,
    helicity_density,
    velocity,
)

CANONICAL_DESCRIPTOR: Final[str] = "curl-noise-sphere-seed42-step64"
CANONICAL_TRACERS: Final[int] = 4096
CANONICAL_STEPS: Final[int] = 64
CANONICAL_DT: Final[float] = 2e-4
CANONICAL_CAPTURE_INTERVAL: Final[int] = 8
DOMAIN_PAD: Final[float] = 0.08
OBSTACLE_CLEAR: Final[float] = 0.03


def seeded_tracers(seed: int, count: int = CANONICAL_TRACERS) -> np.ndarray:
    """Deterministic tracer seeds: uniform in the padded unit box,
    rejection-sampled clear of the canonical obstacle."""
    cfg = CANONICAL_CONFIG
    rng = np.random.default_rng(int(seed))
    center = np.asarray(cfg.obstacle_center)
    keep_r = cfg.obstacle_radius + OBSTACLE_CLEAR
    out = np.empty((0, 3))
    while out.shape[0] < count:
        cand = rng.uniform(DOMAIN_PAD, 1.0 - DOMAIN_PAD, size=(count * 2, 3))
        cand = cand[np.linalg.norm(cand - center, axis=1) > keep_r]
        out = np.concatenate([out, cand], axis=0)
    return np.ascontiguousarray(out[:count])


def run_canonical(seed: int = 42) -> CurlResult:
    """The canonical advection (includes the 2-run witness)."""
    return advect(
        seeded_tracers(seed),
        CANONICAL_CONFIG,
        n_steps=CANONICAL_STEPS,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=1,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
    )


# --------------------------------------------------------------------------- #
# Measured diagnostics (spec-ref § 5 CurlResult diagnostics block)
# --------------------------------------------------------------------------- #
def measured_diagnostics(
    cfg: CurlNoiseConfig = CANONICAL_CONFIG, n_grid: int = 32, seed: int = 42
) -> dict[str, float]:
    """Measured-then-declared instrument readings on the canonical field."""
    rng = np.random.default_rng(seed)

    # Route A (3D): random edge potential -> matched div machine-zero
    psi_x = rng.standard_normal((n_grid, n_grid + 1, n_grid + 1))
    psi_y = rng.standard_normal((n_grid + 1, n_grid, n_grid + 1))
    psi_z = rng.standard_normal((n_grid + 1, n_grid + 1, n_grid))
    dx = 1.0 / n_grid
    u, v, w = matched_curl_3d(psi_x, psi_y, psi_z, dx)
    div = matched_divergence_3d(u, v, w, dx)
    discrete_div_max = float(np.abs(div).max())
    flux_scale = float(max(np.abs(u).max(), np.abs(v).max(), np.abs(w).max()) / dx)

    # Analytic-field probe: independent stencil, two g's -> value + order
    pts = rng.uniform(0.15, 0.85, size=(256, 3))
    pts = pts[
        np.linalg.norm(pts - np.asarray(cfg.obstacle_center), axis=1)
        > cfg.obstacle_radius + 0.1
    ]
    g_coarse, g_fine = 1e-2, 1e-3

    def vel(p):
        return velocity(p, cfg)

    d_coarse = float(np.abs(fd_divergence_probe(vel, pts, g_coarse)).max())
    d_fine = float(np.abs(fd_divergence_probe(vel, pts, g_fine)).max())
    order = float(np.log(d_coarse / d_fine) / np.log(g_coarse / g_fine))

    # Gradient MMS order (analytic vs FD, single channel)
    h_coarse, h_fine = 1e-3, 1e-4
    errs = []
    for h in (h_coarse, h_fine):
        fd = np.zeros((pts.shape[0], 3))
        for k in range(3):
            e = np.zeros(3)
            e[k] = h
            vp, _, _ = fbm_grad_hess(pts + e, cfg, 0)
            vm, _, _ = fbm_grad_hess(pts - e, cfg, 0)
            fd[:, k] = (vp - vm) / (2 * h)
        _, g_an, _ = fbm_grad_hess(pts, cfg, 0)
        errs.append(float(np.abs(fd - g_an).max()))
    gradient_mms_order = float(np.log(errs[0] / errs[1]) / np.log(h_coarse / h_fine))

    # Boundary v.n on the obstacle surface (machine-exact triple product)
    theta = rng.uniform(0, np.pi, 128)
    phi = rng.uniform(0, 2 * np.pi, 128)
    n_hat = np.stack(
        [
            np.sin(theta) * np.cos(phi),
            np.sin(theta) * np.sin(phi),
            np.cos(theta),
        ],
        axis=1,
    )
    surf = np.asarray(cfg.obstacle_center) + cfg.obstacle_radius * n_hat
    v_surf = velocity(surf, cfg)
    (g1s, _), _ = crossprod_obstacle_potentials(surf, cfg)
    d_surf, n_sdf, _ = sphere_sdf_grad_hess(
        surf, np.asarray(cfg.obstacle_center), cfg.obstacle_radius
    )
    boundary_vn_max = float(np.abs(np.sum(v_surf * n_sdf, axis=1)).max())
    vel_scale = float(np.abs(velocity(pts, cfg)).max())

    # Machine-exact flagship identities (execution-corrected golden F):
    # gradient orthogonality + Clebsch helicity integrand; the kinetic
    # helicity density itself is displayed HONESTLY NONZERO.
    og1, og2 = gradient_orthogonality(pts, cfg)
    clebsch = clebsch_helicity_integrand(pts, cfg)
    hel = helicity_density(pts, cfg)
    grad_scale = float(np.abs(g1s).max())

    return {
        "discrete_div_max": discrete_div_max,
        "discrete_div_flux_scale": flux_scale,
        "analytic_div_probe_max_g1e-2": d_coarse,
        "analytic_div_probe_max_g1e-3": d_fine,
        "analytic_div_probe_order": order,
        "gradient_mms_order": gradient_mms_order,
        "boundary_vn_max": boundary_vn_max,
        "boundary_surface_sdf_max": float(np.abs(d_surf).max()),
        "velocity_scale": vel_scale,
        "grad_scale": grad_scale,
        "grad_orthogonality_max": float(max(np.abs(og1).max(), np.abs(og2).max())),
        "clebsch_integrand_max": float(np.abs(clebsch).max()),
        "kinetic_helicity_max": float(np.abs(hel).max()),
    }


# --------------------------------------------------------------------------- #
# Capture (SimRunner protocol — strange-attractors precedent)
# --------------------------------------------------------------------------- #
def _build_manifest(
    seed: int, wall_clock_seconds: float, payload_name: str
) -> CaptureManifest:
    cfg = CANONICAL_CONFIG
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "curl-noise",
            "category": "closed-form",
            "variant": "crossprod-sphere",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "phase-6-curl-noise",
        },
        config={
            "tier": "test",
            "dims": [3],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "construction": cfg.construction,
                "octaves": cfg.octaves,
                "lacunarity": cfg.lacunarity,
                "gain": cfg.gain,
                "ell0": cfg.ell0,
                "amplitude": cfg.amplitude,
                "obstacle_center": list(cfg.obstacle_center),
                "obstacle_radius": cfg.obstacle_radius,
                "obstacle_ramp_width": cfg.obstacle_ramp_width,
                "obstacle_noise_amp": cfg.obstacle_noise_amp,
                "dt": CANONICAL_DT,
                "integrator": "rk4",
                "reproject_iters": 1,
                "tracers": CANONICAL_TRACERS,
            },
        },
        run={
            "step_count": CANONICAL_STEPS,
            "capture_interval": CANONICAL_CAPTURE_INTERVAL,
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-07-05T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:computed-at-write-time",
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produce the canonical curl-noise capture."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    result = run_canonical(seed)
    wall = time.perf_counter() - t0
    rows = [
        StepState(
            step=int(step),
            state={
                "positions": np.ascontiguousarray(result.positions[idx]),
            },
            diagnostics={
                "iso_residual_max": float(result.iso_residual_max[idx]),
            },
        )
        for idx, step in enumerate(result.checkpoint_steps)
    ]
    payload_name = f"{CANONICAL_DESCRIPTOR}.h5"
    manifest = _build_manifest(seed, wall, payload_name)
    return write_capture(rows, manifest, out_dir)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("captures"))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--diagnostics",
        action="store_true",
        help="print the measured diagnostics block as JSON and exit",
    )
    args = parser.parse_args()
    if args.diagnostics:
        print(json.dumps(measured_diagnostics(), indent=2))
        return 0
    path = sim_runner_seeded(args.seed, args.out)
    print(f"capture manifest: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
