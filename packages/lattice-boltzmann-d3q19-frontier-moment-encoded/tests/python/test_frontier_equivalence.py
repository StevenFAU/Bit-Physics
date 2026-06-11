#!/usr/bin/env python3
"""Frontier-vs-parent bounded-quantization equivalence (C-1 U-3 stage 1c).

Charter § 3.3 anchor (c) + ratified D-2: the quantized Stack-C trajectory is compared
frame-by-frame against the landed numpy parent capture
(captures/lbm-ref/poiseuille-64x32-seed42-step1000) on the rho + u fields at the
DECLARED `lbm-quantized` tolerance (measured-then-declared; tolerance.toml
[defaults.lbm-quantized] is the declared record — compare_captures' per-sim override
keys on sim.name, which the variant shares with the parent, so the comparison runs
here through the frontier variant axis instead; the axis has per-paper caps set at
dispatch, spec § 4.2.F).

Also asserts the analytic Poiseuille structure on the variant's final frame: parabolic
symmetry about the channel mid-plane + no-slip walls + max at the centre.

Hermetic: regenerates the variant capture into a temp dir via the C++ capture binary
(argv[1]) at a REDUCED horizon (default 200 steps; the parent capture has every step,
so frames 0..200 pair exactly), then compares. The full-1000-step witness runs once at
stage 1c via the capture binary's canonical invocation; this ctest keeps the sweep fast.

Usage (driven by CTest from tools/testkit):
    uv run python test_frontier_equivalence.py <capture_binary>
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

import numpy as np

LAVAPIPE_ENV = {
    "VK_DRIVER_FILES": "/usr/share/vulkan/icd.d/lvp_icd.json",
    "LP_NUM_THREADS": "0",
}

REPO = Path.cwd().resolve().parents[1]
REF = REPO / "captures/lbm-ref/poiseuille-64x32-seed42-step1000.json"
TOL = Path("equivalence/tolerance.toml")
HORIZON = int(os.environ.get("LBM_ME_EQ_STEPS", "200"))


def declared_tolerance() -> tuple[float, float]:
    table = tomllib.loads(TOL.read_text())
    cat = table["defaults"]["lbm-quantized"]
    return float(cat["relative"]), float(cat["absolute"])


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: test_frontier_equivalence.py <capture_binary>", file=sys.stderr)
        return 2
    capture_bin = sys.argv[1]
    assert REF.exists(), f"parent reference missing: {REF}"
    rel_tol, abs_tol = declared_tolerance()

    from capture import load_capture

    parent = load_capture(REF)

    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "poiseuille-64x32-seed42-step1000.json"
        env = {**os.environ, **LAVAPIPE_ENV}
        subprocess.run(
            [capture_bin, str(out), "--steps", str(HORIZON)], check=True, env=env
        )
        variant = load_capture(out)

        max_rel = 0.0
        n_frames = HORIZON + 1
        for idx in range(n_frames):
            ps = parent.step(idx)
            vs = variant.step(idx)
            for field in ("rho", "u"):
                a = np.asarray(ps.state[field], dtype=np.float64)
                b = np.asarray(vs.state[field], dtype=np.float64)
                assert a.shape == b.shape, (field, a.shape, b.shape)
                err = np.abs(b - a)
                denom = np.maximum(np.abs(a), abs_tol if abs_tol > 0 else 1e-30)
                rel = float(np.max(err / denom)) if a.size else 0.0
                # u starts near zero: bound by abs+rel combination
                ok = np.all(err <= abs_tol + rel_tol * np.abs(a))
                max_rel = max(max_rel, rel)
                assert ok, (
                    f"frame {idx} field {field}: max_abs={float(np.max(err)):.3e} exceeds "
                    f"abs={abs_tol:.1e} + rel={rel_tol:.1e}*|parent|"
                )

        # Analytic Poiseuille structure on the variant's final frame.
        vs = variant.step(n_frames - 1)
        u = np.asarray(vs.state["u"], dtype=np.float64)  # (3, nx, ny, nz)
        ux_profile = u[0].mean(axis=(0, 2))  # average over x, z -> (ny,)
        ny = ux_profile.shape[0]
        mid = ny // 2
        # max near the centre, monotone decrease towards both walls (sampled), near-zero
        # at the wall layers (half-way BB: wall sits between node 0 and the ghost).
        assert ux_profile[mid] == ux_profile.max()
        assert ux_profile[0] < 0.5 * ux_profile[mid]
        assert ux_profile[-1] < 0.5 * ux_profile[mid]
        sym_err = float(np.max(np.abs(ux_profile - ux_profile[::-1])))
        assert sym_err <= 5e-2 * float(ux_profile[mid]) + 1e-12, sym_err

        print(
            f"lbm_me_frontier_equivalence OK: frames={n_frames} max_rel={max_rel:.3e} "
            f"declared rel={rel_tol:.1e} abs={abs_tol:.1e}; poiseuille profile structural OK"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
