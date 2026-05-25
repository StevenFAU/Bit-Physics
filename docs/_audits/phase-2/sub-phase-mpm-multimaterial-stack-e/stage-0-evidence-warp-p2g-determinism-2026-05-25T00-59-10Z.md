---
date: 2026-05-25T00-59-10Z
author: mpm-multimaterial-stack-e-stage-0-agent
phase: 2
artifact: task
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-0-evidence-warp-p2g-determinism
subject: "Stage-0 Task 0.6 empirical-verification evidence — Warp 1.13.0 CPU-mode bit-determinism of an MLS-MPM P2G atomic-scatter kernel (the MPM-specific IC-15 aspect #3 surface). EPHEMERAL verification kernel (NOT committed to packages/mpm-multimaterial-stack-e/; reproduced here for audit reference per dispatch SECTION 6) + 6-run sha256 evidence (3 pairs, identical seed+inputs, device=cpu): all six bit-identical -> a8f6e654...07ff1fe1. Confirms D5 N/A (no cpu_max_num_threads=1 equivalent needed; Warp CPU wp.launch is structurally serial) + banked #8 Warp analog. Mass-conservation correctness witness: sum(grid_mass)=1.0 (abs_err 2.22e-16). O-W7 extension: wp.float64(var) taints var's inferred type. Cited from Stage-0 checkpoint § 8."
head_sha: <COMMIT_1_SHA_PENDING>
head_sha_at_checkpoint: bc33ef11dfdca06e37cf89985cd2f3e5ea114239
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/plan-drafting-landing-2026-05-25T00-27-55Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-checkpoint-2026-05-25T00-59-10Z.md
---

# Stage-0 Evidence — Warp 1.13.0 CPU-Mode P2G Atomic-Scatter Determinism (Task 0.6)

(FACT — empirical run on this runner, 2026-05-25, in the repo `.venv`
`warp-lang==1.13.0`, `numpy>=2.0`, CPython 3.12.3, x86_64. **No tracked-file
edit** — Convention A: the verification kernel below is NOT committed to
`packages/mpm-multimaterial-stack-e/` per dispatch SECTION 6; it is reproduced
here for audit reference only. The package does not exist yet — Stage 1a's job.)

## § 1. What this verifies

Plan-drafting Task 1.6 + D5 reasoned that Warp's CPU backend `wp.launch`
executes **serially over the launch dimension in a single thread**, so
`wp.atomic_add` accumulation order is fixed and bit-identical run-to-run — the
Warp analog of Taichi `cpu_max_num_threads=1` / numba `parallel=False`, with NO
explicit serialisation knob. `common-warp` Stage-0 (`24d44c7e…0746f314`)
verified this for a scalar-reduction `wp.atomic_add`. This Stage-0 task RE-VERIFIES
it on the **MPM-specific surface**: a 27-cell quadratic-B-spline P2G scatter where
many particle threads accumulate mass + momentum into **shared** grid nodes
(genuine atomic contention; the IC-15 deferred aspect #3 surface). All storage is
**f64** (`wp.array(dtype=wp.float64)`; D15 / R-MPME-F64 — NOT common-warp's f32
Particles/Grids). The socket is consumed exactly as Stage 1a will:
`set_warp_deterministic(42, device="cpu")` + `deterministic_context()`.

## § 2. Verification kernel source (ephemeral; reference-only)

```python
"""Stage-0 Task 0.6 — Warp CPU-mode P2G atomic-scatter determinism verification.
EPHEMERAL verification scaffolding (NOT committed to packages/)."""
import hashlib
import numpy as np
import warp as wp
import common_warp
from common_warp.warp_harness import deterministic_context, set_warp_deterministic

GRID_N = 16
N_PARTICLES = 5000
SEED = 42
DX = wp.float64(1.0 / GRID_N)

@wp.func
def bspline_weights(rx: wp.float64) -> wp.vec3d:
    # Quadratic B-spline weights; base = floor(x/dx + 0.5) - 1 (golden-pinned).
    half = wp.float64(0.5)
    w0 = half * (wp.float64(1.5) - rx) * (wp.float64(1.5) - rx)
    w1 = wp.float64(0.75) - (rx - wp.float64(1.0)) * (rx - wp.float64(1.0))
    w2 = half * (rx - half) * (rx - half)
    return wp.vec3d(w0, w1, w2)

@wp.kernel
def p2g_scatter(pos: wp.array(dtype=wp.float64, ndim=2),
                vel: wp.array(dtype=wp.float64, ndim=2),
                mass: wp.array(dtype=wp.float64),
                grid_mass: wp.array(dtype=wp.float64, ndim=3),
                grid_mom: wp.array(dtype=wp.float64, ndim=4),
                dx: wp.float64):
    p = wp.tid()
    one = wp.float64(1.0); half = wp.float64(0.5)
    fx = pos[p, 0] / dx; fy = pos[p, 1] / dx; fz = pos[p, 2] / dx
    # Float base node, then derive int base via wp.int32 (float base not reused
    # as an int -> avoids the O-W7 wp.float64()-taint of a reused variable).
    fbx = wp.floor(fx + half) - one
    fby = wp.floor(fy + half) - one
    fbz = wp.floor(fz + half) - one
    rx = fx - fbx; ry = fy - fby; rz = fz - fbz
    bx = wp.int32(fbx); by = wp.int32(fby); bz = wp.int32(fbz)
    wx = bspline_weights(rx); wy = bspline_weights(ry); wz = bspline_weights(rz)
    mp = mass[p]; vx = vel[p, 0]; vy = vel[p, 1]; vz = vel[p, 2]
    for di in range(3):
        for dj in range(3):
            for dk in range(3):
                w = wx[di] * wy[dj] * wz[dk]
                gi = bx + di; gj = by + dj; gk = bz + dk
                m_contrib = w * mp
                wp.atomic_add(grid_mass, gi, gj, gk, m_contrib)
                wp.atomic_add(grid_mom, gi, gj, gk, 0, m_contrib * vx)
                wp.atomic_add(grid_mom, gi, gj, gk, 1, m_contrib * vy)
                wp.atomic_add(grid_mom, gi, gj, gk, 2, m_contrib * vz)

# IC: 5000 particles clustered near grid centre (r=0.15 about (0.5,0.5,0.5));
# host-side numpy default_rng(42) (stack-agnostic; Warp wp.rand_init NOT used);
# vz=-2.0; uniform mass 1/N. one_run() launches dim=N, hashes grid_mass+grid_mom.
# main(): set_warp_deterministic(42,"cpu"); 3 pairs x 2 runs in deterministic_context().
```

## § 3. Protocol

6 in-process runs (3 pairs), identical `SEED=42` + identical inputs,
`device="cpu"`, each run inside `deterministic_context()`. sha256 over
`(grid_mass.tobytes() || grid_mom.tobytes())` per run. Acceptance: all six
sha256 identical (bit-exact-same-hw, D4).

## § 4. Raw 6-run result

```
common_warp.__version__ = 0.1.0
warp.__version__ = 1.13.0
pair 1: run A = a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
pair 1: run B = a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
pair 2: run A = a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
pair 2: run B = a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
pair 3: run A = a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
pair 3: run B = a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
unique_hashes = 1
VERDICT: DETERMINISTIC (6/6 bit-identical) digest=a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1
```

**MPM-specific P2G determinism witness (digest, all 6 runs):**
`a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1`

**6/6 bit-identical. CPU bit-exact-same-hw VERIFIED on the atomic-scatter
surface.** Hard Rule 2 (Task 0.6(e): Warp CPU determinism on the MPM-specific
kernel fails) **NOT triggered** — D5 N/A premise CONFIRMED empirically; banked #8
Warp analog verified. This digest is the **Stage 1a R-A1 re-verification
anchor** (the Stage-1a P2G kernel must reproduce a deterministic 6/6; the exact
digest depends on the final IC + grid params and is re-witnessed at 1a).

## § 5. Mass-conservation correctness witness

Beyond determinism, the scatter is a faithful MLS-MPM P2G (partition-of-unity):
total scattered grid mass equals the particle mass sum.

```
sum(grid_mass)      = 1
sum(particle_mass)  = 1.0000000000000002
abs_err             = 2.220e-16   (1 ULP; quadratic-B-spline partition-of-unity exact to round-off)
```

## § 6. Warning observation (S0-1 filterwarnings; feeds Stage 1a pyproject)

Running the verification, the only non-stdout line was Warp's own stdout logger
("Warp CUDA warning: Could not find or load the NVIDIA CUDA driver. GPU
execution will not be available." — a logger message, NOT a Python
`warnings.warn()`), expected on a CPU-only runner. **No Python `Warning`**
(SyntaxWarning / DeprecationWarning) at kernel decoration / compile / launch.
This confirms the `common-warp` Stage-0 Task-0.3 posture: a Warp-consumer port's
`pyproject.toml` needs **no bare-form `filterwarnings`** (unlike the Taichi
Stack-D ports); the Stack-E `pyproject` mirrors `common-warp`'s posture (S0-1
N/A for Warp).

## § 7. O-W7 extension surfaced (Warp 1.13.0 quirk; Stage 1b kernel-authoring note)

In Warp 1.13.0, applying `wp.float64(v)` to a kernel-local variable `v` **taints
`v`'s inferred type to float64** for subsequent uses (reproduced minimally:
`rx = fx - wp.float64(bx)` makes the later `bx + di` a forbidden `int32 +
float64`). **Discipline (extends O-W7):** derive the integer base node via
`wp.int32(<float_base>)` where the float base is NOT reused as an int, and pack
the quadratic-B-spline weights into a `wp.vec3d` indexed by the pure-int loop
variable — never `wp.float64(di)` on a variable also used as an int index.
Stage 1b's `@wp.kernel` MLS-MPM bodies follow this pattern. (Surfaced at Stage 0
Task 0.6; documented for Stage-1b carry-forward, NOT a methodology-doc amendment
at this stage.)

---

*End of Stage-0 P2G-determinism evidence. Cited from Stage-0 checkpoint § 8.*
