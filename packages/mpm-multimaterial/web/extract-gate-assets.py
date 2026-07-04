"""Extract browser-gate assets from the committed diagnostic canonical capture.

Reads captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.h5
(committed; NEVER modified) and emits:

- packages/mpm-multimaterial/web/public/mpm-gate-ic.bin
    step-0 particle positions, f32 little-endian, [5000][3]
    (velocities are the constant blob_initial_vz; masses uniform 1/N)
- packages/mpm-multimaterial/web/public/mpm-gate-refs.bin
    f64 little-endian [6 checkpoints][5000][px,py,pz,vx,vy,vz]
- packages/mpm-multimaterial/web/public/mpm-gate-refs.json
    sidecar: params-as-run, checkpoints, layout, SHA-256 of both bins +
    the committed capture payload checksum (drift witness)
- packages/mpm-multimaterial/web/fixtures/reference-fixtures.json
    reference-computed f64 fixtures for the in-page mirror:
    - the golden-table B-spline sample values via
      packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py
    - a 16-matrix neo-Hookean stress fixture via
      packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py
      compute_particle_stresses (includes one J<=0 matrix to pin the
      log_j = -30 guard)

Run from the repo root:
    uv run --no-sync python packages/mpm-multimaterial/web/extract-gate-assets.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import h5py
import numpy as np

REPO = Path(__file__).resolve().parents[3]
WEB = REPO / "packages/mpm-multimaterial/web"
CAPTURE_DIR = REPO / "captures/mpm-multimaterial-stack-e"
H5 = CAPTURE_DIR / "drop-impact-16cube-seed42-step50.h5"
MANIFEST = CAPTURE_DIR / "drop-impact-16cube-seed42-step50.json"

sys.path.insert(0, str(REPO / "packages/mpm-multimaterial"))

from mpm_multimaterial.reference import (  # noqa: E402
    CANONICAL_BLOB_CENTER,
    CANONICAL_BLOB_RADIUS,
    CANONICAL_BLOB_VELOCITY_Z,
    CANONICAL_DT,
    CANONICAL_FLOOR_Z_INDEX,
    CANONICAL_GRAVITY_Z,
    CANONICAL_LAMBDA,
    CANONICAL_MU,
    CANONICAL_POISSON_RATIO,
    CANONICAL_YOUNGS_MODULUS,
)
from mpm_multimaterial.reference.mls_mpm import compute_particle_stresses  # noqa: E402
from mpm_multimaterial.reference.shape_functions import (  # noqa: E402
    N,
    partition_of_unity_sum,
)

CHECKPOINTS = [0, 10, 20, 30, 40, 50]
N_PARTICLES = 5_000
GRID_N = 16


def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    with h5py.File(H5, "r") as f:
        pos0 = f["steps/0/state/particle_pos"][:]
        assert pos0.shape == (N_PARTICLES, 3)
        vel0 = f["steps/0/state/particle_vel"][:]
        assert np.all(vel0[:, :2] == 0.0)
        assert np.all(vel0[:, 2] == CANONICAL_BLOB_VELOCITY_Z)
        mat0 = f["steps/0/state/particle_material_id"][:]
        assert np.all(mat0 == 0)

        ic = pos0.astype("<f4").tobytes()

        rows = []
        for s in CHECKPOINTS:
            g = f[f"steps/{s}/state"]
            p = g["particle_pos"][:]
            v = g["particle_vel"][:]
            rows.append(np.hstack([p, v]).astype("<f8"))
        refs = np.stack(rows, axis=0).tobytes()

    (WEB / "public/mpm-gate-ic.bin").write_bytes(ic)
    (WEB / "public/mpm-gate-refs.bin").write_bytes(refs)

    blob_volume = (4.0 / 3.0) * np.pi * CANONICAL_BLOB_RADIUS**3
    sidecar = {
        "descriptor": "drop-impact-16cube-seed42-step50",
        "capture_payload_sha256": manifest["payload"]["checksum"].removeprefix(
            "sha256:"
        ),
        "params_as_run": {
            "grid_n": GRID_N,
            "n_particles": N_PARTICLES,
            "dt": CANONICAL_DT,
            "gravity_z": CANONICAL_GRAVITY_Z,
            "youngs_modulus": CANONICAL_YOUNGS_MODULUS,
            "poisson_ratio": CANONICAL_POISSON_RATIO,
            "mu": CANONICAL_MU,
            "lam": CANONICAL_LAMBDA,
            "blob_center": list(CANONICAL_BLOB_CENTER),
            "blob_radius": CANONICAL_BLOB_RADIUS,
            "blob_initial_vz": CANONICAL_BLOB_VELOCITY_Z,
            "floor_z_index": CANONICAL_FLOOR_Z_INDEX,
            "seed": 42,
            "mass_per_particle": 1.0 / N_PARTICLES,
            "volume_per_particle": blob_volume / N_PARTICLES,
        },
        "checkpoints": CHECKPOINTS,
        "ref_layout": "f64le[checkpoint][particle][px,py,pz,vx,vy,vz]",
        "ic_layout": (
            "f32le[particle][px,py,pz]; velocities uniform (0,0,blob_initial_vz); "
            "masses uniform 1/N; F=I, C=0, material_id=0 at step 0"
        ),
        "ic_sha256": sha256_hex(ic),
        "refs_sha256": sha256_hex(refs),
        "ic_bytes": len(ic),
        "refs_bytes": len(refs),
    }
    (WEB / "public/mpm-gate-refs.json").write_text(json.dumps(sidecar, indent=2) + "\n")

    # --- reference-computed f64 fixtures for the in-page mirror --------------
    golden_xs = [0.0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 0.25, -0.25, 0.3]
    golden_ps = [0.0, 0.3, -0.7]
    bspline_fixture = {
        "xs": golden_xs,
        "n_values": [N(x) for x in golden_xs],
        "pou_ps": golden_ps,
        "pou_sums": [partition_of_unity_sum(p) for p in golden_ps],
    }

    rng = np.random.default_rng(4242)
    n_fix = 16
    F = np.zeros((n_fix, 3, 3), dtype=np.float64)
    for i in range(n_fix):
        F[i] = np.eye(3) + rng.uniform(-0.25, 0.25, size=(3, 3))
    # Pin the verified log_j = -30 guard: one deliberately inverted matrix.
    F[n_fix - 1] = -np.eye(3) * 0.5
    material_id = np.zeros(n_fix, dtype=np.int32)
    stress = np.zeros((n_fix, 3, 3), dtype=np.float64)
    compute_particle_stresses(F, material_id, CANONICAL_MU, CANONICAL_LAMBDA, stress)
    neo_fixture = {
        "mu": CANONICAL_MU,
        "lam": CANONICAL_LAMBDA,
        "rng_note": "np.random.default_rng(4242) uniform(-0.25,0.25) around I; "
        "last matrix -0.5*I (J<0 -> log_j=-30 guard path)",
        "F": F.tolist(),
        "stress": stress.tolist(),
    }

    fixtures = {
        "_generated_by": (
            "packages/mpm-multimaterial/web/extract-gate-assets.py "
            "(repo venv; reference-computed f64)"
        ),
        "bspline": bspline_fixture,
        "neo_hookean_16": neo_fixture,
    }
    (WEB / "fixtures/reference-fixtures.json").write_text(
        json.dumps(fixtures, indent=2) + "\n"
    )

    print(f"ic:   {len(ic)} bytes sha256 {sidecar['ic_sha256'][:16]}…")
    print(f"refs: {len(refs)} bytes sha256 {sidecar['refs_sha256'][:16]}…")
    print("fixtures: reference-fixtures.json written")


if __name__ == "__main__":
    main()
