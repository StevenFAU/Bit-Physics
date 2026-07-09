"""Extract the committed f64 gate references for the in-browser comparison.

Runs the f64 NumPy reference on the canonical/web-gate scene
(sent-void-96sq-m1) and writes:

  public/pff-gate-sent96-f64.bin  — checkpoints x fields[ux, uy, d, h_field]
                                    f64 row-major (nodes 97^2 for ux/uy,
                                    cells 96^2 for d/h)
  public/pff-gate-sent96-f64.json — sidecar: sha256, params, layout,
                                    per-checkpoint diagnostics, the f64
                                    F-delta curve, peak, and the run-twice
                                    determinism witness

The browser PROVE layer fetches the refs and shows f32-GPU vs f64
per-checkpoint max-abs deltas against the [defaults.phase-field-fracture]
budget; the deploy gate itself re-runs the reference LIVE in verify.py
(this asset is the user-facing view of the same comparison, sha-pinned by
gen-verification.mjs).

Usage: uv run --no-sync python packages/phase-field-fracture/web/extract-gate-refs.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "packages/phase-field-fracture"))

from phase_field_fracture.invariants import (  # noqa: E402
    energy_residual_pre_peak,
    ke_over_ie_pre_peak,
)
from phase_field_fracture.sim import (  # noqa: E402
    GATE_DESCRIPTOR,
    gate_config,
    peak_reaction,
    run_canonical,
)

OUT = Path(__file__).resolve().parent / "public"


def main() -> None:
    cfg = gate_config()
    res, witness = run_canonical(cfg)
    expected = [s for s in range(0, cfg.step_count + 1) if s % cfg.capture_every == 0]
    if expected[-1] != cfg.step_count:
        expected.append(cfg.step_count)
    assert res.capture_steps == expected, (res.capture_steps, expected)

    blobs: list[bytes] = []
    diag = []
    diag_by_step = {d.step: d for d in res.diagnostics}
    for step, st in zip(res.capture_steps, res.captures, strict=True):
        for arr in (st.ux, st.uy, st.d, st.h_field):
            blobs.append(np.ascontiguousarray(arr, dtype=np.float64).tobytes())
        d = diag_by_step[step]
        diag.append(
            {
                "step": step,
                "u_applied": d.u_applied,
                "reaction": d.reaction,
                "ke": d.ke,
                "ie": d.ie,
                "e_frac": d.e_frac,
                "d_max": d.d_max,
            }
        )
    payload = b"".join(blobs)
    OUT.mkdir(parents=True, exist_ok=True)
    bin_path = OUT / "pff-gate-sent96-f64.bin"
    bin_path.write_bytes(payload)

    peak, u_peak = peak_reaction(res)
    force_curve = [
        [d.step, d.u_applied, d.reaction] for d in res.diagnostics if d.step % 200 == 0
    ]
    sidecar = {
        "file": "pff-gate-sent96-f64.bin",
        "sha256": hashlib.sha256(payload).hexdigest(),
        "dtype": "f64",
        "layout": (
            f"checkpoints{res.capture_steps} x fields[ux({cfg.n + 1}^2), "
            f"uy({cfg.n + 1}^2), d({cfg.n}^2), h_field({cfg.n}^2)] f64 "
            "row-major (x*(n+1)+y nodes, x*n+y cells)"
        ),
        "params": {
            "n": cfg.n,
            "l_domain": cfg.l_domain,
            "e_tilde": cfg.e_tilde,
            "nu": cfg.nu,
            "u_end": cfg.u_end,
            "vload_frac": cfg.vload_frac,
            "t_ramp": cfg.t_ramp,
            "cfl": cfg.cfl,
            "c_damp": cfg.c_damp,
            "mobility_m": cfg.mobility_m,
            "dt": cfg.dt,
            "h": cfg.h,
            "steps": cfg.step_count,
            "capture_interval": cfg.capture_every,
            "descriptor": GATE_DESCRIPTOR,
        },
        "reference": {
            "peak_reaction": peak,
            "peak_u_applied": u_peak,
            "e_frac_final": res.diagnostics[-1].e_frac,
            "ke_over_ie_pre_peak": ke_over_ie_pre_peak(res),
            "energy_residual_pre_peak": energy_residual_pre_peak(res),
        },
        "force_curve": force_curve,
        "diagnostics": diag,
        "determinism_witness_sha256": witness,
        "source": (
            "packages/phase-field-fracture/phase_field_fracture/sim.py "
            "run_canonical(gate_config()) (2-run bit-identity witnessed)"
        ),
    }
    (OUT / "pff-gate-sent96-f64.json").write_text(json.dumps(sidecar, indent=2) + "\n")
    print(
        f"wrote {bin_path} ({len(payload)} bytes) sha {sidecar['sha256'][:16]}… "
        f"peak {peak:.3f} ({peak * 2.7:.1f} N) witness {witness[:16]}…"
    )


if __name__ == "__main__":
    main()
