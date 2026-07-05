"""Generate the committed pic-flip web-gate assets (IC + f64 observable refs).

Web-gate tier = the backend diagnostic tier (12^3 grid, n_jacobi 600 —
measured fully converged at that depth, sim.py diagnostic_params_3d)
extended to 60 steps so the dam column visibly collapses; checkpoints
every 10 steps. The browser replays this scene in WGSL f32 with
fixed-point-atomic P2G and is gated on ROBUST OBSERVABLES (energy,
momentum, centre of mass, bulk shape) against these f64 references —
per-particle pointwise comparison is REJECTED for this sim (chaos +
fixed-point != f32-reference; web spec § 2.1/§ 9).

The IC is f32-QUANTIZED before the reference runs: both stacks start
from the identical binary64-exactly-representable state, so no IC
quantization error enters the budget.

Usage (repo root):
    uv run --no-sync python packages/pic-flip/web/tools/gen-gate-refs.py
Idempotent: fixed seed, no timestamps.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from pic_flip.sim import diagnostic_params_3d, seeded_dam_break_3d
from pic_flip.reference.apic import apic_step_3d, count_particles_3d
from pic_flip.reference.poisson_masked import (
    FLUID,
    classify_cells_3d,
    default_solid_mask_3d,
)
from pic_flip.reference.regularizers import (
    measure_rest_density,
    scatter_unit_density_3d,
)

SEED = 42
N_STEPS = 60
INTERVAL = 10
OUT = Path(__file__).resolve().parents[1] / "public"
DESCRIPTOR = "web-gate-dam-break-3d-apic-12cube-seed42-step60"


def observables(
    pos: np.ndarray, vel: np.ndarray, nx: int, ny: int, nz: int, dx: float, n_wall: int
) -> list[float]:
    ke = float(0.5 * np.sum(vel * vel))
    mom = np.sum(vel, axis=0)
    com = np.mean(pos, axis=0)
    max_speed = float(np.max(np.abs(vel))) if vel.size else 0.0
    count = np.zeros((nx, ny, nz), dtype=np.int64)
    count_particles_3d(pos, nx, ny, nz, dx, count)
    labels = classify_cells_3d(count, default_solid_mask_3d(nx, ny, nz, n_wall))
    fluid = labels == FLUID
    any_z = fluid.any(axis=2)
    heights = np.where(
        any_z, fluid.shape[2] - 1 - np.argmax(fluid[:, :, ::-1], axis=2), 0
    )
    return [
        ke,
        float(mom[0]),
        float(mom[1]),
        float(mom[2]),
        float(com[0]),
        float(com[1]),
        float(com[2]),
        max_speed,
        float(np.sum(fluid)),
        float(np.max(heights)) if heights.size else 0.0,
    ]


def main() -> None:
    params = diagnostic_params_3d()
    nx, ny, nz = int(params["nx"]), int(params["ny"]), int(params["nz"])
    dx = float(params["dx"])
    n_wall = int(params.get("n_wall", 2))

    pos, vel, mass, affine_c = seeded_dam_break_3d(SEED, params)
    # f32-quantize the IC — the committed bin IS the state both stacks run.
    # Snapshot NOW: apic_step_3d mutates pos in place (a step-60 snapshot
    # would silently commit the final state as the "IC").
    pos = pos.astype(np.float32).astype(np.float64)
    vel[:] = 0.0
    n = pos.shape[0]
    ic = pos.astype(np.float32)

    den = np.zeros((nx, ny, nz), dtype=np.float64)
    scatter_unit_density_3d(pos, dx, den)
    count = np.zeros((nx, ny, nz), dtype=np.int64)
    count_particles_3d(pos, nx, ny, nz, dx, count)
    labels0 = classify_cells_3d(count, default_solid_mask_3d(nx, ny, nz, n_wall))
    rho_rest = measure_rest_density(den, labels0)

    checkpoints = [0]
    rows = [observables(pos, vel, nx, ny, nz, dx, n_wall)]
    for step in range(1, N_STEPS + 1):
        apic_step_3d(pos, vel, mass, affine_c, params, rho_rest=rho_rest)
        if step % INTERVAL == 0:
            checkpoints.append(step)
            rows.append(observables(pos, vel, nx, ny, nz, dx, n_wall))

    ic_bytes = ic.tobytes()
    refs = np.asarray(rows, dtype=np.float64)
    refs_bytes = refs.tobytes()

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "picflip-gate-ic.bin").write_bytes(ic_bytes)
    (OUT / "picflip-gate-refs.bin").write_bytes(refs_bytes)
    meta = {
        "descriptor": DESCRIPTOR,
        "params_as_run": {
            "nx": nx,
            "ny": ny,
            "nz": nz,
            "dx": dx,
            "dt": float(params["dt"]),
            "gravity": float(params["gravity"]),
            "rho": float(params["rho"]),
            "mode": str(params["mode"]),
            "n_jacobi": int(params["n_jacobi"]),
            "n_extrapolation_layers": int(params["n_extrapolation_layers"]),
            "n_wall": n_wall,
            "cfl": float(params["cfl"]),
            "regularizers": bool(params["regularizers"]),
            "push_apart_radius_factor": float(params["push_apart_radius_factor"]),
            "push_apart_iters": int(params["push_apart_iters"]),
            "drift_k": float(params["drift_k"]),
            "n_particles": int(n),
            "seed": SEED,
            "rho_rest_measured_frame0": float(rho_rest),
        },
        "step_count": N_STEPS,
        "capture_interval": INTERVAL,
        "checkpoints": checkpoints,
        "ic_layout": "f32le[particle][px,py,pz]; velocities zero, masses uniform 1, C zero",
        "refs_layout": (
            "f64le[checkpoint][ke, px, py, pz, com_x, com_y, com_z, "
            "max_speed, fluid_node_count, max_column_height]"
        ),
        "observables_note": (
            "ROBUST-OBSERVABLE gate: per-particle pointwise comparison is "
            "rejected for this sim (chaotic dam break + fixed-point-atomic "
            "P2G != f64 lex reference; web spec § 2.1). The reference ran "
            "from the f32-quantized IC in this directory."
        ),
        "ic_bytes": len(ic_bytes),
        "refs_bytes": len(refs_bytes),
        "ic_sha256": hashlib.sha256(ic_bytes).hexdigest(),
        "refs_sha256": hashlib.sha256(refs_bytes).hexdigest(),
    }
    (OUT / "picflip-gate-refs.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"n={n} rho_rest={rho_rest!r}")
    for step, row in zip(checkpoints, rows):
        print(step, [round(v, 6) for v in row])
    print("ic_sha256:", meta["ic_sha256"])
    print("refs_sha256:", meta["refs_sha256"])


if __name__ == "__main__":
    main()
