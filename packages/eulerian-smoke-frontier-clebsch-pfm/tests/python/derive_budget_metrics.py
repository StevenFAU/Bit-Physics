"""C-1 U-4 — derive REFRAMED-equivalence budget metrics from a canonical capture.

Charter § 3.4: the frontier-vs-parent equivalence is the REFRAMED metric-based gate
(vorticity/energy budget trajectories), NOT pointwise comparison — the parent's own
cross-stack record (equivalence.md § 2) measured Lyapunov growth λ≈0.12–0.29/step on
this very descriptor, so long-horizon pointwise diffs are physically meaningless.

This script computes per-frame budget metrics from a capture-v1 manifest and writes a
small committed JSON fixture (provenance: the source payload checksum travels with the
metrics). Run ONCE per side at unit landing (parent + variant; both captures are LFS
artifacts too large for per-CI-run pulls — probe § 4.4); CI re-verifies the cheap
metric comparison via test_reframed_equivalence.py.

Usage (from tools/testkit, the U-3 ctest cwd precedent):
    uv run --no-sync python <this file> <capture_manifest.json> <out_metrics.json>

Axis convention: capture fields are [x][y][z] (axis 0 = x; parent layout, variant
writer transposes to match — clebsch_pfm.cpp put_field). Curl uses periodic central
differences with spacing dx = 1/n.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np


def curl(u: np.ndarray, v: np.ndarray, w: np.ndarray, dx: float):
    def d(f: np.ndarray, axis: int) -> np.ndarray:
        return (np.roll(f, -1, axis=axis) - np.roll(f, 1, axis=axis)) / (2.0 * dx)

    wx = d(w, 1) - d(v, 2)  # dw/dy - dv/dz
    wy = d(u, 2) - d(w, 0)  # du/dz - dw/dx
    wz = d(v, 0) - d(u, 1)  # dv/dx - du/dy
    return wx, wy, wz


def main() -> int:
    manifest_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    from capture import load_capture  # testkit reader (run from tools/testkit)

    cap = load_capture(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    n = int(manifest["config"]["dims"][0])
    dx = 1.0 / n
    dv = dx**3

    frames = []
    for step in cap._step_numbers():
        st = cap.step(step)
        u, v, w = (np.asarray(st.state[k], dtype=np.float64) for k in ("u", "v", "w"))
        rho = np.asarray(st.state["density"], dtype=np.float64)
        wx, wy, wz = curl(u, v, w, dx)
        ke = 0.5 * float(np.sum(u * u + v * v + w * w)) * dv
        ens = 0.5 * float(np.sum(wx * wx + wy * wy + wz * wz)) * dv
        umax = float(max(np.abs(u).max(), np.abs(v).max(), np.abs(w).max()))
        mass = float(np.sum(rho)) * dv
        # density spread (second moment about the box centre; periodic-naive — the
        # canonical blob stays far from the wrap over the horizon)
        coords = (np.arange(n) + 0.5) * dx - 0.5
        X, Y, Z = np.meshgrid(coords, coords, coords, indexing="ij")
        m2 = float(np.sum(rho * (X * X + Y * Y + Z * Z))) * dv
        frames.append(
            {
                "step": int(step),
                "kinetic_energy": ke,
                "enstrophy": ens,
                "u_max": umax,
                "density_mass": mass,
                "density_second_moment": m2,
            }
        )

    out = {
        "source_manifest": str(manifest_path),
        "source_payload_checksum": manifest["payload"]["checksum"],
        "sim": manifest["sim"],
        "n": n,
        "frames": frames,
    }
    out_path.write_text(
        json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"wrote {out_path} ({len(frames)} frames)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
