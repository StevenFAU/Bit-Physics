"""Extract the committed f64 gate reference for the in-browser comparison.

Runs the f64 NumPy reference on the WEB-GATE canonical (translating ring at
the 32^3 tier, hbar 0.05, dt 1/24, 24 steps, checkpoints every 8 — the
pic-flip reduced-tier precedent) and writes:

  public/isf-gate-ring32-step24.bin   — checkpoints x (u,v,w) f64, row-major
  public/isf-gate-ring32-step24.json  — sidecar: sha256, params, layout,
                                        per-checkpoint diagnostics

The browser PROVE layer fetches the .bin and shows the f32-GPU vs f64
per-checkpoint max-abs deltas against the [defaults.isf] budget; the deploy
gate itself re-runs the reference LIVE in verify.py (this asset is the
user-facing view of the same comparison, sha-pinned by gen-verification.mjs).

Usage: uv run --no-sync python packages/schrodinger-smoke/web/extract-gate-fields.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "packages/schrodinger-smoke"))

from schrodinger_smoke.reference.isf import IsfConfig, run_isf  # noqa: E402

OUT = Path(__file__).resolve().parent / "public"

CFG = IsfConfig(
    n=32,
    hbar=0.05,
    dt=1.0 / 24.0,
    steps=24,
    scene="translating-ring",
    capture_every=8,
)


def main() -> None:
    res = run_isf(CFG)
    assert res.capture_steps == [0, 8, 16, 24], res.capture_steps
    blobs = []
    diag = []
    for step, cap in zip(res.capture_steps, res.captures, strict=True):
        blobs.append(np.ascontiguousarray(cap, dtype=np.float64))
        diag.append(
            {
                "step": step,
                "max_abs_u": float(np.max(np.abs(cap))),
            }
        )
    payload = b"".join(b.tobytes() for b in blobs)
    bin_path = OUT / "isf-gate-ring32-step24.bin"
    bin_path.write_bytes(payload)
    sidecar = {
        "file": "isf-gate-ring32-step24.bin",
        "sha256": hashlib.sha256(payload).hexdigest(),
        "dtype": "f64",
        "layout": "checkpoints[0,8,16,24] x fields[u,v,w] x 32^3 row-major (x*n+y)*n+z",
        "params": {
            "n": CFG.n,
            "hbar": CFG.hbar,
            "dt": CFG.dt,
            "steps": CFG.steps,
            "capture_interval": 8,
            "ring_radius": CFG.ring_radius,
            "ring_thickness": CFG.ring_thickness,
            "settle_iterations": CFG.settle_iterations,
            "scheme": "lie",
        },
        "diagnostics": diag,
        "determinism_witness_sha256": res.determinism_witness_sha256,
        "source": "packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py run_isf (2-run bit-identity witnessed)",
    }
    (OUT / "isf-gate-ring32-step24.json").write_text(
        json.dumps(sidecar, indent=2) + "\n"
    )
    print(f"wrote {bin_path} ({len(payload)} bytes) sha {sidecar['sha256'][:16]}…")


if __name__ == "__main__":
    main()
