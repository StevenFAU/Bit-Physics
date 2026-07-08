"""Rebuild the committed f64 gate-reference binary for the web PROVE layer.

Layout of public/sw-gate-reference-f64.bin (all f64, N = 4096 each):
    [x_fm, X_fm_re, X_fm_im, x_leak, X_leak_re, X_leak_im]

The sidecar public/sw-gate-reference-f64.json records the sha256, the gate
parameters, and the Python run-twice determinism witness. Re-run after any
canonical-scene change:

    uv run --no-sync python packages/signal-workbench/web/extract-gate-refs.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "packages/signal-workbench"))

from signal_workbench.sim import gate_config, run_canonical  # noqa: E402


def main() -> int:
    cfg = gate_config()
    res = run_canonical(cfg)
    arrays = [
        res.x_fm,
        np.real(res.spec_fm),
        np.imag(res.spec_fm),
        res.x_leak,
        np.real(res.spec_leak),
        np.imag(res.spec_leak),
    ]
    blob = b"".join(np.ascontiguousarray(a, dtype=np.float64).tobytes() for a in arrays)
    out_dir = Path(__file__).resolve().parent / "public"
    out_dir.mkdir(exist_ok=True)
    bin_path = out_dir / "sw-gate-reference-f64.bin"
    bin_path.write_bytes(blob)
    sha = hashlib.sha256(blob).hexdigest()
    sidecar = {
        "file": bin_path.name,
        "sha256": sha,
        "witness_sha256": res.determinism_witness_sha256,
        "layout": "f64 x6 arrays of N: x_fm, X_fm_re, X_fm_im, x_leak, X_leak_re, X_leak_im",
        "gate": {
            "n": cfg.n,
            "fm_kc": cfg.fm_kc,
            "fm_km": cfg.fm_km,
            "fm_index": cfg.fm_index,
            "fm_amplitude": cfg.fm_amplitude,
            "leak_f0_bins": cfg.leak_f0_bins,
            "leak_amplitude": cfg.leak_amplitude,
            "leak_phase": cfg.leak_phase,
            "leak_window": cfg.leak_window,
        },
    }
    (out_dir / "sw-gate-reference-f64.json").write_text(
        json.dumps(sidecar, indent=2) + "\n"
    )
    print(f"wrote {bin_path} ({len(blob)} bytes, sha256 {sha[:16]}…)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
