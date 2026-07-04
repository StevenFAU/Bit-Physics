"""One-shot extractor for the live-gate-re-run asset (verification-demo-spec § 4.3).

Runs the FROZEN NumPy f64 reference (public API only — no backend edits) on
the demo's canonical Taylor-Green scene at the frozen canonical params and
writes the final-checkpoint fields as a raw binary asset the web demo fetches
to score its own run client-side:

    public/smoke-gate-tg-step1000.bin   — little-endian f64, row-major (Nx, Ny),
                                          u[128*128] ++ v[128*128] ++ density[128*128]
    public/smoke-gate-tg-step1000.json  — provenance sidecar: sha256 of the .bin,
                                          byte length, layout, params, and the
                                          FP-edge sentinel measurement

The IC is the same closed form main.ts evaluates (and verify.py rebuilds):

    u(x, y) = sin(2*pi*x) * cos(2*pi*y)
    v(x, y) = -cos(2*pi*x) * sin(2*pi*y)
    density = exp(-((x-0.5)^2 + (y-0.5)^2) / (2 * 0.05^2)),  cell centers (i+0.5)/n

FP-EDGE SENTINEL: the reference's semi-Lagrangian wrap has an unguarded
interpolation fraction (mod(-tiny, N) == N -> fx = N, a xN extrapolation) that
CONTAMINATES the committed lid-shear canonical (backend fix task filed; see the
web spec's v0.3 change log). On this Taylor-Green scene the edge is dormant —
velocities never get within the f64 edge window — and this extractor PROVES
that per run: any field magnitude exceeding SANITY_MAX_U aborts the extraction,
so the shipped asset provably comes from an edge-dormant trajectory.

gen-verification.mjs re-hashes the committed .bin against the sidecar at every
build and HARD-FAILs on drift.

Run from this directory with the repo venv:

    uv run --no-sync python extract-gate-fields.py

The reference package is a read-only input here (Lane-B / spec § 7 boundary).
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(REPO / "packages" / "eulerian-smoke"))

from eulerian_smoke.reference.stable_fluids import (  # noqa: E402
    canonical_params_2d,
    semi_lagrangian_advect_2d,
    stable_fluids_step,
)

N = 128
STEPS = 1000
CAPTURE_INTERVAL = 100
SANITY_MAX_U = 2.0  # FP-edge sentinel: the TG scene decays from |u| <= 1


def taylor_green_ic(n: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    x, y = np.meshgrid(idx, idx, indexing="ij")
    k = 2.0 * np.pi
    u = np.sin(k * x) * np.cos(k * y)
    v = -np.cos(k * x) * np.sin(k * y)
    density = np.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / (2.0 * 0.05 * 0.05))
    return u, v, density


def main() -> None:
    params = canonical_params_2d()
    if int(params["n"]) != N:
        sys.exit(f"FAIL: canonical n {params['n']} != {N}")
    dt = float(params["dt"])
    dx = float(params["dx"])
    u, v, density = taylor_green_ic(N)
    p = np.zeros_like(u)
    checkpoints: dict[int, dict[str, float]] = {
        0: {
            "energy": 0.5 * float(np.sum(u * u + v * v)),
            "mass_density": float(np.sum(density)),
        }
    }
    for i in range(1, STEPS + 1):
        u, v, p = stable_fluids_step(u, v, p, params)
        density = semi_lagrangian_advect_2d(density, u, v, dt, dx)
        peak = max(float(np.abs(u).max()), float(np.abs(v).max()))
        if peak > SANITY_MAX_U:
            sys.exit(
                f"FAIL: FP-edge sentinel tripped at step {i} (max|vel| {peak:.3f} > "
                f"{SANITY_MAX_U}) — the reference trajectory is NOT edge-dormant on "
                "this scene; do not ship this asset"
            )
        if i % CAPTURE_INTERVAL == 0:
            checkpoints[i] = {
                "energy": 0.5 * float(np.sum(u * u + v * v)),
                "mass_density": float(np.sum(density)),
            }

    blob = (
        u.astype("<f8").tobytes(order="C")
        + v.astype("<f8").tobytes(order="C")
        + density.astype("<f8").tobytes(order="C")
    )
    out_bin = HERE / "public" / "smoke-gate-tg-step1000.bin"
    out_bin.write_bytes(blob)

    sidecar = {
        "_generated_by": "packages/eulerian-smoke/web/extract-gate-fields.py",
        "asset": out_bin.name,
        "sha256": hashlib.sha256(blob).hexdigest(),
        "bytes": len(blob),
        "dtype": "<f8",
        "layout": f"u[{N}*{N}] ++ v[{N}*{N}] ++ density[{N}*{N}], row-major (Nx, Ny)",
        "step": STEPS,
        "grid": [N, N],
        "ic": "taylor-green-2d + centered gaussian density blob, cell centers (i+0.5)/n",
        "params": {
            "nu": params["nu"],
            "rho": params["rho"],
            "dx": params["dx"],
            "dt": params["dt"],
            "n": int(params["n"]),
            "n_jacobi": int(params["n_jacobi"]),
        },
        "fp_edge_sentinel": {
            "max_abs_vel_bound": SANITY_MAX_U,
            "held_for_all_steps": True,
        },
        "checkpoint_diagnostics": checkpoints,
        "computed_by": "frozen NumPy f64 reference (eulerian_smoke.reference.stable_fluids), public API only",
    }
    out_json = HERE / "public" / "smoke-gate-tg-step1000.json"
    out_json.write_text(json.dumps(sidecar, indent=2) + "\n", encoding="utf-8")
    print(
        f"OK: {out_bin.name} ({len(blob)} bytes, sha256 {sidecar['sha256'][:12]}…) + sidecar; "
        f"final energy {checkpoints[STEPS]['energy']:.4f}, mass {checkpoints[STEPS]['mass_density']:.4f}"
    )


if __name__ == "__main__":
    main()
