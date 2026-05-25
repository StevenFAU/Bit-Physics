---
date: 2026-05-25T11-33-42Z
author: eulerian-smoke-stack-e-stage-0-agent
phase: 2
artifact: task
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-0-evidence-warp-jacobi-determinism
subject: "Stage-0 Task 0.2 empirical-verification evidence — Warp 1.13.0 CPU-mode bit-determinism of a 3D collocated Jacobi pressure-projection kernel (the smoke-specific cross-stack-sensitive surface; the inv6 = 1.0/6.0 normaliser + fixed n_jacobi=20 determinism-safe iterative solver, IC-15 aspect #5). This is the R-A1 anchor / section-L.7 O-2 four-checkpoint Warp CPU determinism chain CHECKPOINT 1. EPHEMERAL verification kernel (NOT committed to packages/eulerian-smoke-stack-e/; the package does not exist yet — Stage 1a's job; reproduced here for audit reference per Convention A) + 6-run sha256 evidence (3 pairs, identical seed+inputs, device=cpu): all six bit-identical -> 79d15705...b342b2eea2. Confirms R-SME4 (Jacobi fixed-cap determinism) + R-SME5 (atomic-scatter N/A — this is a pure gather, strictly simpler than MPM's P2G atomic-scatter). Divergence-reduction correctness witness: max|div| 7.651e+01 -> 5.147e+01. O-W7 part-1 (pure-literal wp.float64(1.0)/wp.float64(6.0)) EXERCISED + compiles; O-W7 part-2 (wp.float64(v) index-taint workaround) NOT exercised by the Jacobi gather (integer-mod periodic wrap) — deferred to the Stage-1b semi_lagrangian_advect SL-backtrace (S0-SME1). Cited from Stage-0 checkpoint section 8."
head_sha: <COMMIT_1_SHA_PENDING>
head_sha_at_checkpoint: acd6c0465d427836b53954054a3ff1efb2092f18
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/plan-drafting-landing-2026-05-25T03-30-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-0-checkpoint-2026-05-25T11-33-42Z.md
---

# Stage-0 Evidence — Warp 1.13.0 CPU-Mode 3D Jacobi Pressure-Projection Determinism (Task 0.2; R-A1 anchor / O-2 checkpoint 1)

(FACT — empirical run on this runner, 2026-05-25, in the repo `.venv`
`warp-lang==1.13.0`, `numpy>=2.0` (`2.4.6`), CPython 3.12.3, x86_64. **No
tracked-file edit** — Convention A: the verification kernel below is NOT
committed to `packages/eulerian-smoke-stack-e/`; that package does not exist
yet (Stage 1a's job). It is reproduced here for audit reference only.)

## § 1. What this verifies

The charter § 2 Stage-0 Task 0.2 anchors the **R-A1** marker — section L.7
**O-2 four-checkpoint Warp CPU determinism chain, checkpoint 1** — on a
**Jacobi-projection or SL-backtrace `@wp.kernel`** (operator-routed:
**Warp determinism kernel**, charter § 2 task 0.2 — NOT a Phase-1 reference-
trajectory sha). This evidence ports the Phase-1 `eulerian-smoke` reference
`project_pressure_3d` surface
(`packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py`, the
function `project_pressure_3d` + `_divergence_3d_periodic`) to an own-f64
`wp.array` `@wp.kernel` and verifies it is **bit-identical run-to-run on the
CPU backend**.

The Jacobi-projection surface is the deliberate choice (over the SL-backtrace
alternative) because it is the **cross-stack-sensitive FP-accumulation surface**
named in charter § 1: the fixed-cap (`n_jacobi=20`) collocated centered-
difference Jacobi sweep with the **`inv6 = 1.0/6.0`** non-power-of-2 normaliser
(the exact constant that leaked `~1e-9` in the Taichi Stack-D port; charter
§ 6.6 / S-SME4). All storage is **f64** (`wp.array(dtype=wp.float64)`; D8/D15 —
NOT common-warp's f32 `ScalarField3D`/`VectorField3D`). The socket is consumed
exactly as Stage 1a/1b will: `set_warp_deterministic(42, device="cpu")` +
`deterministic_context()`.

This is the smoke analog of the MPM-Stack-E Stage-0 P2G-atomic-scatter evidence
(`a8f6e654…07ff1fe1`). Two structural deltas (S0-SME1): smoke's R-A1 surface is
a **pure gather** (no `wp.atomic_add`, no shared-node contention) → R-SME5
atomic-scatter is **N/A**, so determinism here is even more structurally
trivial than MPM's; and it exercises a **fixed-iteration iterative solver**
(IC-15 deferred aspect #5) rather than atomic scatter (#3).

## § 2. Verification kernel source (ephemeral; reference-only)

```python
"""Stage-0 Task 0.2 — Warp 1.13.0 CPU-mode 3D Jacobi pressure-projection
determinism verification (R-A1 anchor; section L.7 O-2 chain checkpoint 1).
EPHEMERAL verification scaffolding (NOT committed to packages/)."""
# O-W6: deliberately NO `from __future__ import annotations`.
import hashlib
import numpy as np
import warp as wp
import common_warp
from common_warp.warp_harness import deterministic_context, set_warp_deterministic

GRID_N = 16
N_JACOBI = 20  # fixed-cap iterative solver (IC-15 aspect #5; determinism-safe).
SEED = 42
DX = 1.0 / GRID_N
DT = 0.005
RHO = 1.0

@wp.kernel
def divergence_3d(u, v, w, div, inv_2dx: wp.float64, n: wp.int32):
    i, j, k = wp.tid()
    ip = (i + 1) % n; im = (i - 1 + n) % n
    jp = (j + 1) % n; jm = (j - 1 + n) % n
    kp = (k + 1) % n; km = (k - 1 + n) % n
    dudx = u[ip, j, k] - u[im, j, k]
    dvdy = v[i, jp, k] - v[i, jm, k]
    dwdz = w[i, j, kp] - w[i, j, km]
    div[i, j, k] = (dudx + dvdy + dwdz) * inv_2dx

@wp.kernel
def jacobi_sweep(p_in, p_out, div, rho_over_dt: wp.float64, dx2: wp.float64, n: wp.int32):
    i, j, k = wp.tid()
    inv6 = wp.float64(1.0) / wp.float64(6.0)   # O-W7: pure-literal f64 normaliser.
    ip = (i + 1) % n; im = (i - 1 + n) % n
    jp = (j + 1) % n; jm = (j - 1 + n) % n
    kp = (k + 1) % n; km = (k - 1 + n) % n
    rhs = rho_over_dt * div[i, j, k]
    neigh = (p_in[ip, j, k] + p_in[im, j, k] + p_in[i, jp, k]
             + p_in[i, jm, k] + p_in[i, j, kp] + p_in[i, j, km])
    p_out[i, j, k] = inv6 * (neigh - dx2 * rhs)

# (apply_pressure_gradient kernel for the divergence-reduction witness — § 5.)
# IC: u,v,w = host-side numpy default_rng(42).standard_normal(16^3) (stack-
# agnostic seeding; Warp wp.rand_init NOT used). Arrays built via wp.from_numpy
# with explicit dtype=wp.float64 (O-W7). one_run(): divergence_3d once, then 20
# jacobi_sweep launches alternating p_a/p_b buffers; hash p_final.numpy().
# main(): set_warp_deterministic(42,"cpu"); 3 pairs x 2 runs in
# deterministic_context().
```

## § 3. Protocol

6 in-process runs (3 pairs), identical `SEED=42` + identical inputs,
`device="cpu"`, each run inside `deterministic_context()`. sha256 over
`p_final.tobytes()` per run (the 16³ f64 pressure field after the
fixed-20-sweep Jacobi). Acceptance: all six sha256 identical
(bit-exact-same-hw, D4/D9).

## § 4. Raw 6-run result

```
common_warp.__version__ = 0.1.0
warp.__version__ = 1.13.0
pair 1: run A = 79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
pair 1: run B = 79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
pair 2: run A = 79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
pair 2: run B = 79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
pair 3: run A = 79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
pair 3: run B = 79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
unique_hashes = 1
VERDICT: DETERMINISTIC (6/6 bit-identical) digest=79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2
```

**Smoke-specific Jacobi-projection determinism witness (digest, all 6 runs):**
`79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2`

**6/6 bit-identical. CPU bit-exact-same-hw VERIFIED on the smoke
Jacobi-projection surface.** Hard Rule 2 (charter § 5: Warp CPU determinism
cannot be achieved on the smoke-specific kernel) **NOT triggered** — R-SME4
(Jacobi fixed-cap determinism) CONFIRMED empirically; the Warp CPU `wp.launch`
serial-launch posture (Subsystem-3 `determinism.py` D4 contract) holds for the
collocated-grid gather. This digest is the **Stage 1a R-A1 re-verification
anchor** (O-2 checkpoint 2 = the Stage-1a gate-10 production reproduction
re-witnesses determinism; the exact digest depends on the final IC + grid
params and is re-witnessed at 1a, exactly as MPM-Stack-E's P2G digest was).

## § 5. Divergence-reduction correctness witness

Beyond determinism, the projection is a faithful collocated Jacobi
pressure-projection: applying the pressure-gradient correction
`u ← u − (dt/ρ)∇p` reduces the velocity-field divergence.

```
max|div| pre-projection  = 7.651183e+01
max|div| post-projection = 5.146585e+01
divergence reduced       = True
```

(The residual is non-zero because 20 Jacobi sweeps on a 16³ grid do not fully
converge — Jacobi is a slow smoother; the fixed-cap is the *determinism-safe*
posture, NOT a convergence claim. The monotone reduction confirms the ported
operator is sign-correct and faithful to the reference `project_pressure_3d`.
This is the smoke analog of MPM-Stack-E's `sum(grid_mass)=1.0` partition-of-
unity witness.)

## § 6. Warning observation (S0-1 filterwarnings; feeds Stage 1a pyproject)

The only non-stdout line was Warp's own stdout logger ("Warp CUDA warning:
Could not find or load the NVIDIA CUDA driver. GPU execution will not be
available." — a logger message, NOT a Python `warnings.warn()`), expected on a
CPU-only runner. **No Python `Warning`** (SyntaxWarning / DeprecationWarning) at
kernel decoration / compile / launch. This reconfirms the common-warp Stage-0
posture (and the MPM-Stack-E Stage-0 finding): a Warp-consumer port's
`pyproject.toml` needs **no bare-form `filterwarnings`** (unlike the Taichi
Stack-D ports); the Stack-E `pyproject` mirrors common-warp's posture (S0-1 N/A
for Warp).

## § 7. O-W7 application scope at the R-A1 surface (Stage-1b carry-forward; S0-SME1)

The §L.6 O-W7 Warp `@wp.kernel` quirk catalog has two distinct sub-disciplines;
this R-A1 Jacobi surface exercises only the first:

- **O-W7 part-1 — pure-literal non-power-of-2 f64 constants.** `inv6 =
  wp.float64(1.0) / wp.float64(6.0)` is the 3D Jacobi normaliser. **EXERCISED +
  compiles + runs bit-identically** here. (Bare `1.0/6.0` would infer f32 and
  perturb the chaotic trajectory — S-SME4.) Confirmed for Stage-1b's
  `project_pressure_3d` port.
- **O-W7 part-2 — `wp.float64(v)` index-taint workaround.** Applying
  `wp.float64(v)` to a kernel-local var taints `v`'s inferred type (MPM-Stack-E
  S0-ME1). The Jacobi gather uses **pure integer-mod periodic wrap**
  (`(i ± 1 + n) % n`, all `wp.int32`) — it never derives an int index from a
  float — so part-2 is **NOT exercised at Stage 0**. It applies at **Stage 1b**
  to the `semi_lagrangian_advect` SL-backtrace (float backtrace position →
  `wp.int32(floor(...))` base node; the MacCormack 2D predictor-corrector
  likewise), where the discipline is: derive the int base via
  `wp.int32(<float_base>)` with the float base not reused as an int. Carried
  forward to Stage 1b (NOT a §L.6 doc amendment at this stage — Stage 2 boundary).

---

*End of Stage-0 Jacobi-projection-determinism evidence. Cited from Stage-0
checkpoint § 8. `head_sha` back-filled in COMMIT 2 (Convention #12; separate
commit; never `--amend`; N1 enumeration).*
