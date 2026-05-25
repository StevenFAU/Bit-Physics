---
date: 2026-05-25T15-45-00Z
author: lattice-boltzmann-d3q19-stack-e-stage-0-agent
phase: 2
artifact: task
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-0-evidence-warp-bgk-collision-determinism
subject: "Stage-0 Task 0.2 empirical-verification evidence — Warp 1.13.0 CPU-mode bit-determinism of a D3Q19 BGK-collision @wp.kernel (the LBM-specific cross-stack-sensitive surface: the 19-term moment reductions density_field/momentum_field + the Qian-1992 feq polynomial + the BGK relaxation f - (f - feq)/tau; IC-15 deferred aspect #4 — collision-step FP-accumulation). This is the R-A1 anchor / section-L.7 O-2 four-checkpoint Warp CPU determinism chain CHECKPOINT 1. EPHEMERAL verification kernel (NOT committed to packages/lattice-boltzmann-d3q19-stack-e/; the package does not exist yet — Stage 1a's job; reproduced here for audit reference per Convention A) + 6-run sha256 evidence (3 pairs, identical seed+inputs, device=cpu): all six bit-identical -> 74e6bc16...282838bc. Confirms R-LBME4 (collision FP-accumulation determinism-safe) + R-LBME5 (atomic-scatter N/A — pure per-cell gather, no wp.atomic_add). BONUS faithfulness witness (NOT the R-A1 anchor claim): the Warp f64 collision reproduces the NumPy reference collision byte-for-byte (max_abs_err = 0.0) — MEASURED per section L.8, corroborating the probe Task 1.6 Part B step-1 seed-difference 0.0 and grounding the shape-(a) gate-14 prediction. Mass-conservation witness: max|rho_post - rho_pre| = 4.441e-16 (collision invariant to f64 round-off). Cited from Stage-0 checkpoint section 8."
head_sha: 10af482ca05e1cccbf95fcda92c49f2004570be8
head_sha_at_checkpoint: c2e9621a7488619b479430f8180d985ac3a41317
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/plan-drafting-landing-2026-05-25T15-30-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-checkpoint-2026-05-25T15-45-00Z.md
---

# Stage-0 Evidence — Warp 1.13.0 CPU-Mode D3Q19 BGK-Collision Determinism (Task 0.2; R-A1 anchor / O-2 checkpoint 1)

(FACT — empirical run on this runner, 2026-05-25, in the repo `.venv`
`warp-lang==1.13.0`, `numpy==2.4.6`, `common_warp==0.1.0`, CPython 3.12.3,
x86_64. **No tracked-file edit** — Convention A: the verification kernel below
is NOT committed to `packages/lattice-boltzmann-d3q19-stack-e/`; that package
does not exist yet (Stage 1a's job). It is reproduced here for audit reference
only.)

## § 1. What this verifies

The charter § 2 Stage-0 Task 0.2 anchors the **R-A1** marker — section L.7
**O-2 four-checkpoint Warp CPU determinism chain, checkpoint 1** — on a
**collision-or-streaming `@wp.kernel`** (charter § 2 task 0.2; the **collision**
arm is the deliberate choice). This evidence ports the Phase-1
`lattice-boltzmann-d3q19` reference **BGK collision** surface
(`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/equilibrium.py`
`density_field` / `momentum_field` / `feq_field` + `reference/bgk.py` the BGK
relaxation `f - (f - f_eq)/tau`) to an own-f64 `wp.array(dtype=wp.float64,
ndim=4)` `@wp.kernel` and verifies it is **bit-identical run-to-run on the CPU
backend**.

The **collision** surface is the deliberate choice (over the streaming
alternative) because it is the **cross-stack-sensitive FP-accumulation surface**
named in charter § 1 / R-LBME4 (deferred IC-15 aspect #4): the 19-term moment
reductions (`density_field` = `f.sum(axis=0)`; `momentum_field` =
`einsum("id,iabc->dabc", C, f)`) + the Qian-d'Humières-Lallemand (1992)
second-order equilibrium polynomial. Streaming is a pure integer-offset gather
(`np.roll`) with no FP accumulation — strictly less sensitive. All storage is
**f64** (`wp.array(dtype=wp.float64, ndim=4)`; D8/D15 — NOT common-warp's f32
`ScalarField3D`/`VectorField3D`, which is single-component and cannot hold the
19-component distribution). The socket is consumed exactly as Stage 1a/1b will:
`set_warp_deterministic(42, device="cpu")` + `deterministic_context()`.

This is the LBM analog of the smoke-Stack-E Stage-0 Jacobi-projection evidence
(`79d15705…b342b2eea2`) and the MPM-Stack-E P2G-atomic-scatter evidence
(`a8f6e654…07ff1fe1`). Two structural deltas: LBM's R-A1 surface is a **pure
per-cell gather** (no `wp.atomic_add`, no shared-node contention) → R-LBME5
atomic-scatter is **N/A**, so determinism is structurally trivial; and it is a
**single-pass explicit** update (IC-15 aspect #5 iterative-solver is N/A — no
fixed-cap sweep, unlike smoke's 20-sweep Jacobi).

## § 2. Verification kernel source (ephemeral; reference-only)

```python
"""Stage-0 Task 0.2 — Warp 1.13.0 CPU-mode D3Q19 BGK-collision determinism
verification (R-A1 anchor; section L.7 O-2 chain checkpoint 1).
EPHEMERAL verification scaffolding (NOT committed to packages/; Convention A)."""
# O-W6: deliberately NO `from __future__ import annotations`.
import hashlib
import numpy as np
import warp as wp
import common_warp                                   # socket import surface
from common_warp.warp_harness import deterministic_context, set_warp_deterministic
# Phase-1 reference (read-only; for the IC + the faithfulness comparison).
from lattice_boltzmann_d3q19.reference.constants import C as C_NP, CS2, W as W_NP
from lattice_boltzmann_d3q19.reference.equilibrium import (
    density_field, feq_field, momentum_field)

NX, NY, NZ = 16, 8, 3          # depth-3 z-periodic slab convention (small probe).
TAU = 0.7
SEED = 42
INV_CS2 = 1.0 / CS2                       # f64 c_s²-derived constants, host-side
INV_TWO_CS4 = 1.0 / (2.0 * CS2 * CS2)     # (R-LBME2; matches the NumPy reference)
INV_TWO_CS2 = 1.0 / (2.0 * CS2)

@wp.kernel
def bgk_collide(
    f: wp.array(dtype=wp.float64, ndim=4),
    f_post: wp.array(dtype=wp.float64, ndim=4),
    cvec: wp.array(dtype=wp.int32, ndim=2),
    w: wp.array(dtype=wp.float64, ndim=1),
    tau: wp.float64,
    inv_cs2: wp.float64,
    inv_two_cs4: wp.float64,
    inv_two_cs2: wp.float64,
):
    i, j, k = wp.tid()
    # --- 19-term moment reductions (lex order d=0..18; wp.float64(0.0) seeds) ---
    rho = wp.float64(0.0)
    mx = wp.float64(0.0); my = wp.float64(0.0); mz = wp.float64(0.0)
    for d in range(19):           # pure-int loop index (R-LBME7); fresh-var casts.
        fd = f[d, i, j, k]
        rho = rho + fd
        mx = mx + wp.float64(cvec[d, 0]) * fd
        my = my + wp.float64(cvec[d, 1]) * fd
        mz = mz + wp.float64(cvec[d, 2]) * fd
    rho_safe = wp.max(rho, wp.float64(1e-30))
    ux = mx / rho_safe; uy = my / rho_safe; uz = mz / rho_safe
    u_sq = ux * ux + uy * uy + uz * uz
    # --- feq polynomial + BGK relaxation, lex order ---
    for d in range(19):
        cu = (wp.float64(cvec[d, 0]) * ux + wp.float64(cvec[d, 1]) * uy
              + wp.float64(cvec[d, 2]) * uz)
        feq = (w[d] * rho * (wp.float64(1.0) + cu * inv_cs2
               + cu * cu * inv_two_cs4 - u_sq * inv_two_cs2))
        fd = f[d, i, j, k]
        f_post[d, i, j, k] = fd - (fd - feq) / tau

# IC (_build_ic): rng = np.random.default_rng(42);
#   rho0 = 1.0 + 0.01*rng.standard_normal((NX,NY,NZ));
#   u0 = 0.01*rng.standard_normal((3,NX,NY,NZ)); f0 = feq_field(rho0, u0).
# one_run(): wp.from_numpy(f0, dtype=wp.float64) + C(int32)+W(float64) via
#   explicit dtype= (O-W7); wp.launch(bgk_collide, dim=(NX,NY,NZ), device="cpu");
#   wp.synchronize(); hash f_post.numpy().tobytes().
# main(): wp.init(); set_warp_deterministic(42,"cpu"); 3 pairs x 2 runs inside
#   deterministic_context(). Bonus: numpy_collision(f0) = the Phase-1 reference
#   collision (force-free, NO streaming) for the faithfulness measurement.
```

## § 3. Protocol

6 in-process runs (3 pairs), identical `SEED=42` + identical inputs,
`device="cpu"`, each pair inside `deterministic_context()`. sha256 over
`f_post.numpy().tobytes()` per run (the `(19,16,8,3)` f64 post-collision
distribution). Acceptance: all six sha256 identical (bit-exact-same-hw, D4/D9).

## § 4. Raw 6-run result

```
common_warp.__version__ = 0.1.0
warp.__version__ = 1.13.0
pair 1: run A = 74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc
pair 1: run B = 74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc
pair 2: run A = 74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc
pair 2: run B = 74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc
pair 3: run A = 74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc
pair 3: run B = 74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc
unique_hashes = 1
VERDICT: DETERMINISTIC (6/6 bit-identical) digest=74e6bc16...282838bc
FAITHFULNESS (vs NumPy collision-only): max_abs_err = 0.000e+00
MASS-CONSERVATION (collision invariant): max|rho_post - rho_pre| = 4.441e-16
```

**LBM BGK-collision determinism witness (digest, all 6 runs):**
`74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc`

**6/6 bit-identical. CPU bit-exact-same-hw VERIFIED on the LBM
BGK-collision surface.** Hard Rule 2 (charter § 5 R-LBME8 / dispatch condition
6: Warp CPU determinism cannot be achieved on the LBM kernel surface) **NOT
triggered** — R-LBME4 (collision FP-accumulation determinism-safe) CONFIRMED
empirically; R-LBME5 (atomic-scatter) **N/A** (pure per-cell gather, no
`wp.atomic_add`, no contention) → determinism is even more structurally trivial
than MPM-Stack-E's P2G atomic-scatter. The Warp CPU `wp.launch` serial-launch
posture (Subsystem-3 `determinism.py` D4 contract; `BIT_DETERMINISTIC_DEVICE =
"cpu"`) holds for the 19-component f64 lattice update.

**Digest scope (memory caveat applied — smoke-Stack-E R-A1 reproduction
caveat).** This digest `74e6bc16…` is **specific to this 16×8×3 probe grid +
IC**. The O-2 chain re-witnesses the **determinism PROPERTY** at Stage-1b
(checkpoint 2 = gate-10 production reproduction at canonical scale; checkpoint 3
= canonical-scale 2-run) with a **different digest value** — summation-order
non-associativity over a different grid/IC produces a different (but
run-to-run-stable) hash. Stage 1b must NOT assert that the production
`bgk_step` reproduces `74e6bc16…` byte-for-byte; what is re-witnessed is
`assert_deterministic_run(... tolerance=0.0)` returning a single stable digest,
not this specific value.

## § 5. Bonus witness — faithfulness vs the NumPy reference collision

(NOT the R-A1 anchor claim; a MEASURED corroboration per § L.8 "measure step-1,
don't predict from regime.")

Beyond run-to-run determinism, the Warp f64 collision was compared against the
Phase-1 reference collision (force-free, NO streaming:
`density_field`→`momentum_field`→`u = mom/max(rho,1e-30)`→`feq_field`→
`f - (f - feq)/tau`):

```
max_abs_err (Warp f64 collision vs NumPy reference collision) = 0.000e+00
```

The faithful Warp f64 port reproduces the NumPy reference collision
**byte-for-byte** on the **collision-step FP-accumulation surface** (the 19-term
lex-order reductions + the feq polynomial). This is the **FIRST Warp
measurement on IC-15 deferred aspect #4** and **corroborates the probe Task 1.6
Part B** (the full-step step-1 cross-stack seed-difference MEASURED `0.0`). It
**grounds the charter shape-(a) gate-14 prediction** (`within_tolerance=True`,
`max_abs_err=0.0`) empirically — the smoke-Stack-E predict-from-regime
anti-pattern is avoided; the bit-exact verdict is MEASURED, not extrapolated.
NumPy's 19-element `.sum(axis=0)` / `einsum` are lex-sequential (n=19 < the 128
pairwise-summation threshold), and the lex-order kernel reductions match them
exactly → no FMA divergence (Stack-E Warp f64 is bit-faithful to NumPy when
op-order is preserved; the LBM-E confirmation of the smoke-E + LBM-E n=2
portfolio observation). This is a Stage-0 MEASUREMENT; the formal gate-14
witness over the full canonical horizon lands at Stage 1c (O-2 checkpoint 4).

## § 6. Mass-conservation correctness witness

```
max|rho_post - rho_pre| (collision mass-invariant) = 4.441e-16
```

The BGK collision relaxes `f` toward `f_eq(ρ, u)`, which carries the **same**
zeroth moment (`Σ_d f_eq = ρ`), so density is a collision invariant. The
residual `4.441e-16` (≈ 2 × machine-ε) is pure f64 round-off in the relaxation
arithmetic, not a physical drift. This is the LBM analog of MPM-Stack-E's
`sum(grid_mass)=1.0` partition-of-unity witness and smoke-Stack-E's
divergence-reduction witness — it confirms the ported operator is physically
faithful (sign-correct moments), not merely deterministic.

## § 7. Warning observation (S0-1 filterwarnings; feeds Stage 1a pyproject)

The only non-stdout line was Warp's own stdout logger ("Warp CUDA warning:
Could not find or load the NVIDIA CUDA driver. GPU execution will not be
available." — a logger message, NOT a Python `warnings.warn()`), expected on a
CPU-only runner. **No Python `Warning`** (SyntaxWarning / DeprecationWarning) at
kernel decoration / compile / launch. This reconfirms the common-warp Stage-0
posture (and the MPM-Stack-E / smoke-Stack-E findings): a Warp-consumer port's
`pyproject.toml` needs **no bare-form `filterwarnings`** (unlike the Taichi
Stack-D ports); the Stack-E `pyproject` mirrors common-warp's posture (S0-1 N/A
for Warp).

## § 8. § L.6 O-W7 / § L.8 narrowing application scope at the R-A1 surface

- **`wp.float64(…)` reduction seeds (O-W7 / § 6.6).** `rho`/`mx`/`my`/`mz`
  seeded `wp.float64(0.0)`; `wp.float64(1.0)` feq literal — **EXERCISED +
  compiles + runs bit-identically**. The precomputed f64 `c_s²`-constants
  (`inv_cs2`/`inv_two_cs4`/`inv_two_cs2`) are passed as `wp.float64` scalar args.
- **§ L.8 S1b-SME1 fresh-var narrowing — EXERCISED.** The 19-direction loop
  index `d` is **pure `wp.int32`** (`for d in range(19)`); the velocity-component
  casts `wp.float64(cvec[d, 0])` create **fresh** f64 vars and do **NOT** taint
  `d` or the integer indexing (`cvec[d, 0]`, `f[d, i, j, k]`). The O-W7 part-2
  `wp.float64(v)` index-taint workaround is therefore **NOT load-bearing** on the
  collision surface (no float→int index derivation — confirming R-LBME7's
  prediction). Streaming (Stage 1b) likewise uses integer-mod periodic wrap, so
  part-2 stays unexercised this sub-phase.
- **O-W6.** `from __future__ import annotations` omitted defensively.
- **Explicit `dtype=` to `wp.from_numpy`** for the `(19,16,8,3)` f64
  distribution + the `(19,3)` int32 velocity matrix + the `(19,)` f64 weights.

---

*End of Stage-0 BGK-collision-determinism evidence. Cited from Stage-0
checkpoint § 8. `head_sha` back-filled in COMMIT 2 (Convention #12; separate
commit; never `--amend`; N1 enumeration).*
