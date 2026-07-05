"""Extract robust observables from the COMMITTED canonical capture .h5.

Reads tests/fixtures/legacy-captures/dam-break-3d-apic-24cube-seed42-step120
(.h5 + .json manifest), computes the same ten robust observables the web
gate uses [ke, momentum xyz, com xyz, max_speed, fluid_node_count,
max_column_height] from the STORED f64 frames, and writes
packages/pic-flip/web/public/picflip-canonical-obs.json pinned to the
manifest's payload sha. This feeds the demo's user-triggered "run the full
canonical on your GPU" PROVE extra — the committed capture is the
provenance, never a re-run.

Usage (repo root): uv run --no-sync python packages/pic-flip/web/tools/extract-canonical-obs.py
Idempotent (no timestamps).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import h5py
import numpy as np

REPO = Path(__file__).resolve().parents[4]
FIX = REPO / "tests/fixtures/legacy-captures"
DESC = "dam-break-3d-apic-24cube-seed42-step120"
OUT = Path(__file__).resolve().parents[1] / "public" / "picflip-canonical-obs.json"


def main() -> None:
    manifest = json.loads((FIX / f"{DESC}.json").read_text())
    params = manifest["config"]["params"]
    nx, ny, nz = int(params["nx"]), int(params["ny"]), int(params["nz"])
    dx = float(params["dx"])
    n_wall = 2  # canonical default (default_params_3d)

    from pic_flip.reference.apic import count_particles_3d
    from pic_flip.reference.poisson_masked import (
        FLUID,
        classify_cells_3d,
        default_solid_mask_3d,
    )

    rows = []
    steps = []
    ic_f32: np.ndarray | None = None
    with h5py.File(FIX / f"{DESC}.h5", "r") as f:
        step_keys = sorted(f["steps"].keys(), key=lambda s: int(s.split("_")[-1]))
        for key in step_keys:
            grp = f["steps"][key]
            pos = np.asarray(grp["state/position"], dtype=np.float64)
            vel = np.asarray(grp["state/velocity"], dtype=np.float64)
            if ic_f32 is None:
                # Frame 0 IS the canonical IC (velocities zero, C zero);
                # committed f32 so the browser can replay the full canonical.
                ic_f32 = pos.astype(np.float32)
            steps.append(
                int(grp.attrs["step"])
                if "step" in grp.attrs
                else int(key.split("_")[-1])
            )
            ke = float(0.5 * np.sum(vel * vel))
            mom = np.sum(vel, axis=0)
            com = np.mean(pos, axis=0)
            max_speed = float(np.max(np.abs(vel)))
            count = np.zeros((nx, ny, nz), dtype=np.int64)
            count_particles_3d(pos, nx, ny, nz, dx, count)
            labels = classify_cells_3d(count, default_solid_mask_3d(nx, ny, nz, n_wall))
            fluid = labels == FLUID
            any_z = fluid.any(axis=2)
            heights = np.where(
                any_z, fluid.shape[2] - 1 - np.argmax(fluid[:, :, ::-1], axis=2), 0
            )
            rows.append(
                [
                    ke,
                    float(mom[0]),
                    float(mom[1]),
                    float(mom[2]),
                    float(com[0]),
                    float(com[1]),
                    float(com[2]),
                    max_speed,
                    float(np.sum(fluid)),
                    float(np.max(heights)),
                ]
            )

    assert ic_f32 is not None
    ic_bytes = ic_f32.tobytes()
    (OUT.parent / "picflip-canonical-ic.bin").write_bytes(ic_bytes)
    out = {
        "descriptor": DESC,
        "payload_sha256": manifest["payload"]["checksum"].replace("sha256:", ""),
        "params_as_run": params,
        "n_wall": n_wall,
        "checkpoints": steps,
        "layout": "[ke, px, py, pz, com_x, com_y, com_z, max_speed, fluid_node_count, max_column_height]",
        "observables": rows,
        "ic_bin": "picflip-canonical-ic.bin",
        "ic_layout": "f32le[particle][px,py,pz] — h5 frame 0 (velocities zero, C zero)",
        "ic_bytes": len(ic_bytes),
        "ic_sha256": hashlib.sha256(ic_bytes).hexdigest(),
        "replay_note": (
            "browser full-canonical replay starts from this f32-QUANTIZED IC "
            "while the committed observables came from the f64 h5 frames — the "
            "deviation is MEASURED AND DISPLAYED (PROVE extra), gated only at "
            "the web-gate tier"
        ),
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(REPO)} — {len(steps)} checkpoints: {steps}")


if __name__ == "__main__":
    main()
