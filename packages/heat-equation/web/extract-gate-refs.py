"""Extract the committed f64 gate references for the in-browser comparison.

Runs the f64 NumPy reference on the WEB-GATE canonical (fourier-multi at the
128^2 tier, alpha 0.02, dt 10/128^2, 512 steps, checkpoints every 128) and
writes:

  public/heat-gate-fourier128-step512.bin  — checkpoints x fields[t_ftcs,
                                             t_spec] x 128^2 f64, row-major
  public/heat-gate-fourier128-step512.json — sidecar: sha256, params, layout,
                                             per-checkpoint diagnostics
  public/heat-gate-decay-f64.bin           — the 128^2 per-mode decay table
                                             exp(alpha*lambda_c*dt), f64 —
                                             the spec § 5.2/§ 8 committed
                                             spectral-multiplier buffer (the
                                             browser casts to f32 for the GPU
                                             and keeps f64 for diagnostics;
                                             NEVER recomputed with WGSL exp)

The browser PROVE layer fetches the refs and shows f32-GPU vs f64
per-checkpoint max-abs deltas against the [defaults.heat-equation] budget;
the deploy gate itself re-runs the reference LIVE in verify.py (this asset
is the user-facing view of the same comparison, sha-pinned by
gen-verification.mjs).

Usage: uv run --no-sync python packages/heat-equation/web/extract-gate-refs.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "packages/heat-equation"))

from heat_equation.reference import total_heat  # noqa: E402
from heat_equation.sim import GATE_DESCRIPTOR, gate_config, run_canonical  # noqa: E402
from heat_equation.spectral import continuous_laplacian_eigenvalues, decay_factors  # noqa: E402

OUT = Path(__file__).resolve().parent / "public"


def main() -> None:
    cfg = gate_config()
    res = run_canonical(cfg)
    assert res.capture_steps == [0, 128, 256, 384, 512], res.capture_steps

    blobs: list[bytes] = []
    diag = []
    for step, tf, ts in zip(
        res.capture_steps, res.captures_ftcs, res.captures_spec, strict=True
    ):
        blobs.append(np.ascontiguousarray(tf, dtype=np.float64).tobytes())
        blobs.append(np.ascontiguousarray(ts, dtype=np.float64).tobytes())
        diag.append(
            {
                "step": step,
                "total_heat_ftcs": total_heat(tf, cfg.dx, cfg.dx),
                "max_abs_ftcs": float(np.max(np.abs(tf))),
                "ftcs_spec_max_abs": float(np.max(np.abs(tf - ts))),
            }
        )
    payload = b"".join(blobs)
    bin_path = OUT / "heat-gate-fourier128-step512.bin"
    OUT.mkdir(parents=True, exist_ok=True)
    bin_path.write_bytes(payload)

    lam = continuous_laplacian_eigenvalues(cfg.n, cfg.n)
    decay = np.ascontiguousarray(
        decay_factors(lam, cfg.alpha, cfg.dt), dtype=np.float64
    )
    decay_bytes = decay.tobytes()
    (OUT / "heat-gate-decay-f64.bin").write_bytes(decay_bytes)

    sidecar = {
        "file": "heat-gate-fourier128-step512.bin",
        "sha256": hashlib.sha256(payload).hexdigest(),
        "dtype": "f64",
        "layout": "checkpoints[0,128,256,384,512] x fields[t_ftcs,t_spec] x 128^2 row-major (x*n+y)",
        "decay_file": "heat-gate-decay-f64.bin",
        "decay_sha256": hashlib.sha256(decay_bytes).hexdigest(),
        "params": {
            "n": cfg.n,
            "alpha": cfg.alpha,
            "dt": cfg.dt,
            "steps": cfg.steps,
            "capture_interval": cfg.capture_every,
            "safety": cfg.safety,
            "descriptor": GATE_DESCRIPTOR,
        },
        "diagnostics": diag,
        "determinism_witness_sha256": res.determinism_witness_sha256,
        "source": (
            "packages/heat-equation/heat_equation/sim.py run_canonical(gate_config()) "
            "(2-run bit-identity witnessed); decay table from "
            "heat_equation.spectral.decay_factors (f64 numpy exp)"
        ),
    }
    (OUT / "heat-gate-fourier128-step512.json").write_text(
        json.dumps(sidecar, indent=2) + "\n"
    )
    print(f"wrote {bin_path} ({len(payload)} bytes) sha {sidecar['sha256'][:16]}…")
    print(
        f"wrote decay table ({len(decay_bytes)} bytes) sha {sidecar['decay_sha256'][:16]}…"
    )


if __name__ == "__main__":
    main()
