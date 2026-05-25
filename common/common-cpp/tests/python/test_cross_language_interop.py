#!/usr/bin/env python3
"""C-6 gate — cross-stack format-interoperability (Stage 1c).

Charter docs/phases/sub-phase-common-cpp-bootstrap.md § 3 C-6:
  "the Python testkit reader parses a common-cpp-emitted .h5; compare_captures
   produces a verdict (format-interoperability = pass; numeric equivalence is
   per-sim-port scope, per common-warp W-5 / D8)."

Runs the C++ Vulkan-compute smoke (which writes a capture-v1 .h5 + .json via the
Stage-1b Hdf5Writer), then proves the Python testkit can parse it and that
`compare_captures` produces a verdict. This verifies the Stage-1b C++ writer
matches the testkit capture-v1 layout cross-language. NUMERIC cross-stack
equivalence is per-sim-port scope (D8), NOT this check.

Usage (also driven by CTest + the cpp-strict CI job):
    uv run python test_cross_language_interop.py <smoke_binary>
Run from the tools/testkit directory so `capture` + `equivalence` import.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

from capture.reader import load_capture
from equivalence import compare_captures

LAVAPIPE_ENV = {
    "VK_DRIVER_FILES": "/usr/share/vulkan/icd.d/lvp_icd.json",
    "LP_NUM_THREADS": "0",
}


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: test_cross_language_interop.py <smoke_binary>", file=sys.stderr)
        return 2
    smoke_bin = Path(sys.argv[1]).resolve()
    if not smoke_bin.exists():
        print(f"smoke binary not found: {smoke_bin}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="cpp_interop_") as tmp:
        out_dir = Path(tmp)
        env = {**os.environ, **LAVAPIPE_ENV}
        subprocess.run([str(smoke_bin), str(out_dir)], check=True, env=env)

        manifests = sorted(out_dir.glob("*.json"))
        assert len(manifests) == 1, f"expected 1 manifest, got {manifests}"
        manifest = manifests[0]

        # (1) The testkit reader parses the C++-emitted .h5.
        cap = load_capture(manifest)
        assert cap.manifest.sim["name"] == "advection-diffusion-2d", cap.manifest.sim
        assert cap.manifest.sim["category"] == "smoke"
        assert cap.metadata["schema_version"] == "1.0.0"
        assert cap.metadata["sim_name"] == "advection-diffusion-2d"

        steps = sorted(s.step for s in cap.steps())
        assert steps[0] == 0, steps
        u0 = cap.field(0, "u")
        assert isinstance(u0, np.ndarray)
        assert u0.shape == (64, 64), u0.shape
        assert u0.dtype == np.float32, u0.dtype
        assert np.isfinite(u0).all()
        assert 0.95 < float(u0.max()) <= 1.0, float(u0.max())

        # (2) compare_captures produces a verdict (format-interoperability = pass).
        # Comparing the C++ capture against itself: max_abs_err == 0 -> within
        # tolerance. Proves the testkit equivalence harness ingests the C++ .h5.
        verdict = compare_captures(manifest, manifest)
        assert verdict.within_tolerance, verdict.per_field_diff
        assert "sim:category-mismatch" not in verdict.per_field_diff

    print(
        "C-6 cross-language interop PASS: testkit parsed C++ .h5; "
        "compare_captures verdict within_tolerance=True"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
