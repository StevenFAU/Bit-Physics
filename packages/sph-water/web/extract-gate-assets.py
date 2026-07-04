"""Extract the sph-water web gate assets from the committed canonical capture.

Run from the repo root with the workspace venv (the only environment that
has h5py + the sph_water reference importable):

    uv run --no-sync python packages/sph-water/web/extract-gate-assets.py

Emits (all committed; gen-verification.mjs re-verifies the SHAs at every
build and HARD-FAILs on drift):

- ``packages/sph-water/web/public/sph-gate-ic.bin`` — the canonical
  step-0 particle positions (100,000 x 3) as little-endian f32. The
  browser replays the capture from this IC (velocities start at zero,
  masses are uniform 1e-3 — pinned in the sidecar).
- ``packages/sph-water/web/public/sph-gate-refs.bin`` — per-checkpoint
  f64 reference values on the committed deterministic index subsample
  (stride 16 => 6,250 particles/checkpoint): position(3) + velocity(3)
  + density(1) per particle, 11 checkpoints (steps 0,100,...,1000),
  little-endian f64, C-order [checkpoint][particle][7].
- ``packages/sph-water/web/public/sph-gate-refs.json`` — sidecar manifest:
  params AS RUN (h = CANONICAL_H = 0.026 — sph_water.sim line 172; the
  capture manifest's params.h = 0.05 records canonical_params()'s
  diagnostic default, NOT the override the canonical runner used —
  verified numerically: recomputed density at h=0.026 matches the
  committed field to < 6e-14, at h=0.05 it is ~46% off), stride,
  checkpoint schedule, SHA-256 of both binaries.
- ``packages/sph-water/web/fixtures/reference-fixtures.json`` — f64
  expected outputs computed by the reference implementation for the
  in-page TypeScript f64 mirror to reproduce bit-exactly: the golden
  two-particle continuity fixture, a seeded 64-particle density +
  continuity fixture, and a seeded 8-particle divergence_free_solve
  corrector fixture (inputs + corrected velocities + iteration count).

The committed capture is NEVER modified (spec § 7 hard boundary); this
script only reads it.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import h5py
import numpy as np

REPO = Path(__file__).resolve().parents[3]
WEB = REPO / "packages/sph-water/web"
CAPTURE = REPO / "captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5"
MANIFEST = REPO / "captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json"

sys.path.insert(0, str(REPO / "packages/sph-water"))
from sph_water.reference.dfsph import (  # noqa: E402
    canonical_params,
    density,
    density_evolution,
    divergence_free_solve,
)
from sph_water.sim import CANONICAL_H  # noqa: E402

STRIDE = 16
CHECKPOINTS = [0] + list(range(100, 1001, 100))


def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main() -> None:
    params = canonical_params()
    manifest = json.loads(MANIFEST.read_text())

    with h5py.File(CAPTURE, "r") as f:
        steps = sorted(int(s) for s in f["steps"])
        assert steps == CHECKPOINTS, f"unexpected checkpoint schedule {steps}"
        pos0 = f["steps/0/state/position"][:]
        n = pos0.shape[0]
        assert n == 100_000
        idx = np.arange(0, n, STRIDE)

        ic = pos0.astype("<f4").tobytes()
        rows = []
        for s in CHECKPOINTS:
            g = f[f"steps/{s}/state"]
            p = g["position"][:][idx]
            v = g["velocity"][:][idx]
            r = g["density"][:][idx]
            rows.append(np.hstack([p, v, r[:, None]]).astype("<f8"))
        refs = np.stack(rows, axis=0).tobytes()

    (WEB / "public/sph-gate-ic.bin").write_bytes(ic)
    (WEB / "public/sph-gate-refs.bin").write_bytes(refs)

    sidecar = {
        "descriptor": "dam-break-100K-particles-seed42-step1000",
        "capture_payload_sha256": manifest["payload"]["checksum"].removeprefix(
            "sha256:"
        ),
        "params_as_run": {
            "h": CANONICAL_H,
            "dt": params["dt"],
            "g_z": params["g_z"],
            "rho_0": params["rho_0"],
            "mass": 1.0e-3,
            "seed": 42,
            "n_particles": 100_000,
        },
        "manifest_h_note": (
            "capture manifest params.h=0.05 records canonical_params()'s "
            "diagnostic default; the canonical runner overrode h_override="
            "CANONICAL_H=0.026 (sph_water/sim.py) — verified numerically "
            "against the committed density fields (<6e-14 at 0.026)"
        ),
        "checkpoints": CHECKPOINTS,
        "subsample_stride": STRIDE,
        "subsample_count": int(len(np.arange(0, 100_000, STRIDE))),
        "ref_layout": "f64le[checkpoint][particle][px,py,pz,vx,vy,vz,rho]",
        "ic_layout": "f32le[particle][px,py,pz]; velocities all zero; masses uniform 1e-3",
        "ic_sha256": sha256_hex(ic),
        "refs_sha256": sha256_hex(refs),
        "ic_bytes": len(ic),
        "refs_bytes": len(refs),
    }
    (WEB / "public/sph-gate-refs.json").write_text(json.dumps(sidecar, indent=2) + "\n")

    # ---- f64-mirror fixtures (reference-computed expected outputs) --------
    h_fix = float(params["h"])  # diagnostic default 0.05 for small-N fixtures

    # golden two-particle fixture (matches
    # tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json)
    two = [
        {"p": [0.0, 0.0, 0.0], "v": [0.0, 0.0, 0.0], "m": 1.0},
        {"p": [0.5, 0.0, 0.0], "v": [1.0, 0.0, 0.0], "m": 1.0},
    ]
    two_rho = density(particles=two, h=1.0)
    two_drho = density_evolution(particles=two, h=1.0)

    rng = np.random.default_rng(7)
    n64 = 64
    p64 = rng.uniform(0.0, 0.2, size=(n64, 3))
    v64 = rng.normal(0.0, 0.5, size=(n64, 3))
    m64 = np.full(n64, 1.0e-3)
    parts64 = [
        {"p": p64[i].tolist(), "v": v64[i].tolist(), "m": float(m64[i])}
        for i in range(n64)
    ]
    rho64 = density(particles=parts64, h=h_fix)
    drho64 = density_evolution(particles=parts64, h=h_fix)

    # Corrector fixture regime chosen CONVERGENT (measured): a jittered
    # 2x2x2 lattice at spacing 0.09 with m=1e-3 contracts max|drho/dt|
    # monotonically (~0.55%/iter) under the reference corrector, so the
    # f32 GPU port tracks the f64 trajectory closely. Denser/heavier
    # regimes DIVERGE under the Phase-1 simplified corrector (measured:
    # scale 0.08 / m 0.01 grows ~6x per iteration) — a divergent
    # trajectory amplifies f32 rounding to O(1) and is useless as a
    # cross-precision fixture.
    n8 = 8
    rng8 = np.random.default_rng(11)
    _ = rng8.uniform(0, 0.09, size=(8, 3))  # match the sweep's draw order
    lat = (
        np.array(
            [[i, j, k] for i in range(2) for j in range(2) for k in range(2)],
            dtype=np.float64,
        )
        * 0.09
    )
    p8 = lat + rng8.uniform(-0.004, 0.004, size=(n8, 3))
    v8 = rng8.normal(0.0, 0.5, size=(n8, 3))
    parts8 = [
        {"p": p8[i].tolist(), "v": v8[i].tolist(), "m": 1.0e-3} for i in range(n8)
    ]
    corrected = divergence_free_solve(
        particles=parts8, h=h_fix, max_iter=10, tolerance=1e-6
    )

    # Kernel coefficients computed by the reference stack (CPython/glibc pow):
    # the TS f64 mirror consumes these committed constants instead of calling
    # Math.pow — V8's fdlibm pow is not guaranteed to round h**4 identically
    # to glibc's, and the mirror's claim is bit-exactness with NumPy.
    sigma = 1.0 / np.pi
    coeffs = {
        str(h): {"sigma_h3": float(sigma / (h**3)), "sigma_h4": float(sigma / (h**4))}
        for h in (1.0, h_fix)
    }

    fixtures = {
        "_generated_by": "packages/sph-water/web/extract-gate-assets.py (repo venv; reference-computed f64)",
        "kernel_coeffs": coeffs,
        "two_particle": {
            "h": 1.0,
            "particles": two,
            "rho": [float(x) for x in two_rho],
            "drho_dt": [float(x) for x in two_drho],
        },
        "density_64": {
            "h": h_fix,
            "seed_note": "np.random.default_rng(7): uniform(0,0.2) pos, normal(0,0.5) vel, m=1e-3",
            "positions": p64.tolist(),
            "velocities": v64.tolist(),
            "mass": 1.0e-3,
            "rho": [float(x) for x in rho64],
            "drho_dt": [float(x) for x in drho64],
        },
        "corrector_8": {
            "h": h_fix,
            "max_iter": 10,
            "tolerance": 1e-6,
            "rho_0": float(params["rho_0"]),
            "positions": p8.tolist(),
            "velocities": v8.tolist(),
            "mass": 1.0e-3,
            "corrected_velocities": [c["v"] for c in corrected],
        },
    }
    fixdir = WEB / "fixtures"
    fixdir.mkdir(exist_ok=True)
    body = json.dumps(fixtures, indent=2) + "\n"
    (fixdir / "reference-fixtures.json").write_text(body)

    print(f"ic:   {len(ic)} bytes sha256 {sidecar['ic_sha256'][:16]}…")
    print(f"refs: {len(refs)} bytes sha256 {sidecar['refs_sha256'][:16]}…")
    print(f"fixtures: {len(body)} bytes")


if __name__ == "__main__":
    main()
