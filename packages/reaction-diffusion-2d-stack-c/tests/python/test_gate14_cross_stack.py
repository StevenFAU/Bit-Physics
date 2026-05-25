#!/usr/bin/env python3
"""gate-14 — reaction-diffusion-2d Stack-C cross-stack equivalence (Stage 1c).

Charter docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md §3: gate-14 is the
formal cross-stack-equivalence witness via `compare_captures` (LEFT = Phase-1
NumPy f64 reference, RIGHT = Stack-C Vulkan/C++ f64 capture) at the
`reaction-diffusion` tolerance category (relative=1e-4, absolute=0.0;
[overrides.reaction-diffusion-2d] reused — D17 no-op).

This is the §L.7 O-2 four-checkpoint chain checkpoint 4 (formal gate-14). The
byte-equality was confirmed at Stage 1b canonical scale (max_abs_err=0.0 across
11 frames); this records the FORMAL verdict through the testkit harness
(cross-language: Python reads the C++-emitted .h5). Predicted shape (a) BIT-EXACT.

Hermetic: regenerates the Stack-C capture into a temp dir via the C++ capture
binary (passed as argv) then compares against the committed NumPy reference, so
the gate exercises the full Vulkan/C++ write -> testkit read -> compare path.

Usage (driven by CTest from the tools/testkit working dir so `capture` +
`equivalence` import):
    uv run python test_gate14_cross_stack.py <capture_binary>
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from equivalence.harness import compare_captures

LAVAPIPE_ENV = {
    "VK_DRIVER_FILES": "/usr/share/vulkan/icd.d/lvp_icd.json",
    "LP_NUM_THREADS": "0",
}

# tools/testkit is the CWD (ctest WORKING_DIRECTORY); repo root is two up.
REPO = Path.cwd().resolve().parents[1]
REF = (
    REPO
    / "captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json"
)
TOL = Path("equivalence/tolerance.toml")


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: test_gate14_cross_stack.py <capture_binary>", file=sys.stderr)
        return 2
    capture_bin = sys.argv[1]
    assert REF.exists(), f"NumPy reference missing: {REF}"

    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "gray-scott-lambda-128sq-seed42-step2000.json"
        env = {**os.environ, **LAVAPIPE_ENV}
        subprocess.run([capture_bin, str(REF), str(out)], check=True, env=env)

        verdict = compare_captures(REF, out, TOL)

    peak_abs = max(
        (d["max_abs_err"] for d in verdict.per_field_diff.values()), default=0.0
    )
    peak_rel = max(
        (d["max_rel_err"] for d in verdict.per_field_diff.values()), default=0.0
    )
    print(
        f"gate-14: within_tolerance={verdict.within_tolerance} "
        f"peak_max_abs_err={peak_abs} peak_max_rel_err={peak_rel} "
        f"n_entries={len(verdict.per_field_diff)}"
    )

    # gate-14 acceptance is within_tolerance=True; shape (a) additionally asserts 0.0.
    assert verdict.within_tolerance is True, "gate-14: within_tolerance must be True"
    assert peak_abs == 0.0, (
        f"shape (a) BIT-EXACT expected; got peak max_abs_err={peak_abs}"
    )
    print(
        "gate-14 GREEN — shape (a) BIT-EXACT (Vulkan/C++ f64 == NumPy f64; rd-2d/1e-4)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
