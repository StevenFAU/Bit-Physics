"""Generate the canonical RD-2D step-0 IC and the NumPy f64 step-1 reference.

Uses the REAL Phase-1 reference module (no re-implementation) so the
comparison target is byte-identical to the sealed canonical capture's
arithmetic. Dumps u0,v0 (IC) and u1,v1 (one forward-Euler step) as raw
C-contiguous little-endian float64 for the Vulkan/C++ harness to consume.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

from reaction_diffusion_2d.reference.gray_scott_numpy import (
    canonical_params,
    initial_condition,
    step,
)

OUT = Path("/tmp/rd2d_probe")


def main() -> int:
    p = canonical_params()
    assert p.n == 128, p.n
    u0, v0 = initial_condition(p, seed=42)
    assert u0.dtype == np.float64 and v0.dtype == np.float64
    assert u0.flags["C_CONTIGUOUS"] and v0.flags["C_CONTIGUOUS"]
    u1, v1 = step(u0, v0, p)
    assert u1.dtype == np.float64 and v1.dtype == np.float64

    for name, arr in (("u0", u0), ("v0", v0), ("u1", u1), ("v1", v1)):
        np.ascontiguousarray(arr, dtype="<f8").tofile(OUT / f"{name}.f64")

    # Provenance digest of the IC + reference so the harness/report can cite it.
    import hashlib

    h = hashlib.sha256()
    for arr in (u0, v0, u1, v1):
        h.update(np.ascontiguousarray(arr, dtype="<f8").tobytes())
    print(f"n={p.n} Du={p.Du} Dv={p.Dv} F={p.F} k={p.k} dx={p.dx} dt={p.dt}")
    print(f"u0[0,0]={u0[0, 0]!r} v0[64,64]={v0[64, 64]!r}")
    print(f"u1[0,0]={u1[0, 0]!r} v1[64,64]={v1[64, 64]!r}")
    print(f"ic+ref sha256={h.hexdigest()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
