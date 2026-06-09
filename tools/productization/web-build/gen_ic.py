"""Generate per-sim browser initial-condition binary assets (Phase-5 web-build).

Some Stack-B sims seed their canonical initial condition from numpy's PCG64
(e.g. reaction-diffusion-2d's ``uniform(-1e-3, 1e-3)`` perturbation), which the
browser cannot reproduce bit-for-bit. Rather than approximate it in JS, we
freeze the exact seed-42 IC to a little-endian f32 binary the Vite bundle
fetches. This keeps the in-browser capture-export path able to re-emit the
canonical descriptor for the 5.1 bootstrap round-trip.

The wgpu-native correctness gate (gpu_gate.py) does NOT use these assets — it
seeds the GPU directly from the numpy reference — so the asset and the gate are
independent reproductions of the same canonical IC.

Usage:  python gen_ic.py reaction-diffusion-2d
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]


def _rd2d_ic() -> np.ndarray:
    sys.path.insert(0, str(REPO / "packages/reaction-diffusion-2d"))
    from reaction_diffusion_2d.reference.gray_scott_numpy import (  # type: ignore
        canonical_params,
        initial_condition,
    )

    p = canonical_params()
    u, v = initial_condition(p, 42)
    # Interleave to the [U,V,U,V,...] layout the WGSL `state` buffer expects.
    out = np.empty((p.n, p.n, 2), dtype=np.float32)
    out[:, :, 0] = u.astype(np.float32)
    out[:, :, 1] = v.astype(np.float32)
    return out.reshape(-1)


def _ising_ic() -> np.ndarray:
    sys.path.insert(0, str(REPO / "packages/ising-classical"))
    import dataclasses

    from ising_classical.reference.ising_numpy import (  # type: ignore
        IsingParams,
        initial_condition,
    )

    flds = {f.name for f in dataclasses.fields(IsingParams)}
    kw: dict = {"n": 128, "J": 1.0, "h": 0.0}
    kw.update({"T": 2.27} if "T" in flds else {})
    kw.update({"temperature": 2.27} if "temperature" in flds else {})
    p = IsingParams(**kw)
    # int32 ±1 spins (the WGSL `spins` buffer is i32).
    return initial_condition(p, 42).astype(np.int32).reshape(-1)


def _boids_ic() -> np.ndarray:
    sys.path.insert(0, str(REPO / "packages/boids-3d"))
    from boids_3d.sim import _seeded_flock_initial_state  # type: ignore

    pos, vel = _seeded_flock_initial_state(42, 1000)
    # positions (1000*3) then velocities (1000*3), little-endian f32.
    return np.concatenate(
        [pos.astype(np.float32).reshape(-1), vel.astype(np.float32).reshape(-1)]
    )


GENERATORS = {
    "reaction-diffusion-2d": (
        _rd2d_ic,
        "packages/reaction-diffusion-2d/web/public/rd2d-ic-seed42.bin",
    ),
    "boids-3d": (
        _boids_ic,
        "packages/boids-3d/web/public/boids-ic-seed42.bin",
    ),
    "ising-classical": (
        _ising_ic,
        "packages/ising-classical/web/public/ising-ic-seed42.bin",
    ),
}


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in GENERATORS:
        print(f"usage: gen_ic.py [{' | '.join(GENERATORS)}]", file=sys.stderr)
        return 2
    gen, rel = GENERATORS[argv[1]]
    data = gen()
    dest = REPO / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data.tobytes())
    print(f"wrote {dest} ({data.nbytes} bytes, {data.size} f32)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
