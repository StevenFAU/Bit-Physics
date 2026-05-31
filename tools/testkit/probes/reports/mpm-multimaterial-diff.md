---
artifact_id: phase-4-batch-1-mpm-diff-probe
sub_phase: phase-4-batch-1 (CPU-side differentiable frontier; sim 3 of 4)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: a377351
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: da1bb4fbeb40b345d3ca9c9412943c10d7e4fe2d36b10c13bc9278ef1a50b99e
evidence_paths:
  - docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md
  - packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/reference/mls_mpm_taichi.py
  - common/common-py/src/common_py/autodiff/inverse_problem.py
  - common/common-py/src/common_py/autodiff/finite_diff.py
  - tools/testkit/schemas/capture-v1.json
---

# Pre-implementation probe — mpm-multimaterial-diff (phase-4 batch-1, sim 3)

> Live-repo Stage-0 probe per the batch-1 charter
> (`docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` §5 + §3.3 + §4.3).
> Every cite checked at assertion (Convention #8). The tape-differentiability of the MPM
> forward is a **BLOCK gate** (charter §5 Stage 0) — probed FIRST (§1). FACT = ran/read at
> HEAD `a377351`; INFERENCE = reasoned.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `a377351` (clean; sim-2 lenia-diff LANDED + pushed at `54d77d3`) | `git rev-parse HEAD` (FACT) |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → **ALL PASSED (exit 0)** | this session (FACT) |
| Integrity | `uv run --directory tools/integrity python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0, digest `da1bb4fb…1a50b99e` | this session (FACT) |
| Cross-phase replay | re-run earlier this session → **ok=True** (6/6 PASS, `prior_phase=v0.3.0-phase-3`); the gates re-run at the FIXED `v0.3.0-phase-3` tag (HEAD-invariant), unchanged since | this session (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0 (hot; sim-2 R2 push succeeded this session) | this session (FACT) |
| Taichi | `1.7.4` (llvm 15.0.4) | `import taichi` (FACT) |
| Forward reference sibling | `packages/mpm-multimaterial-stack-d/` (neo-Hookean elastic MLS-MPM, APIC, Stack D / Taichi) | read (FACT) |

## 1. ⚠ TAPE-DIFFERENTIABILITY (BLOCK gate) — OK, NO BLOCK

Scratch probe (`/tmp/mpm_tape_probe.py`, not committed): a minimal 2D MLS-MPM forward with
**time-indexed `needs_grad` fields** (`x[t,p]`, `v[t,p]`, `C[t,p]`, `grid_v[t]`, `grid_m[t]`)
— P2G (`ti.atomic_add` scatter) → grid gravity → G2P (gather) → advect — differentiated
through `ti.ad.Tape` w.r.t. the initial velocity `v0`, single particle, 6 steps, free-fall
(no-stress ballistic regime):

| Check | Result (FACT — measured) |
|---|---|
| `ti.ad.Tape` backprop through P2G **`atomic_add` scatter** + G2P gather + advect | OK (compiles + runs; the determinism-sensitive scatter IS tape-differentiable) |
| measured `dx(T)/dv0` (central FD) | diagonal `[6.0e-3, 6.0e-3]` = `dt·STEPS` EXACTLY, off-diagonal `0` — the **A1 ballistic analytic `dx(T)/dv0 = dt·STEPS·I` CONFIRMED** |
| autodiff `dLoss/dv0` vs central FD | `rel = 6.6e-5` (the FD truncation floor at `ε=1e-6` on the loss-gradient; the autodiff matches the analytic ballistic Jacobian to <1e-6 on the dominant component — autodiff is the ground truth, the APIC round-trip adds a ~1e-4 coupling the bare `dt·STEPS·I` omits) |

**Verdict: tape-differentiability WORKS through the P2G atomic-scatter + G2P gather chain.
NO BLOCK.** Constraints to carry into Stage 1a (mirror DiffTaichi `diff_mpm` + the lenia-diff
findings): (1) re-implement the reference's `ti.types.ndarray` kernels with **`needs_grad`
time-indexed `ti.field`/`ti.Vector.field`** (the reference's ndarrays are NOT tape-markable);
(2) the grid is **time-indexed per step** (`grid_v[t]`, `grid_m[t]`) and cleared (`.fill(0)`)
**OUTSIDE the tape**, scattered inside — clearing inside the tape re-triggers the
kernel-structure error (lenia-diff §1.3); (3) `ti.static`-unroll the 3×3(×3) B-spline stencil
(a runtime nested stencil loop in a differentiated kernel raises "Mixed usage of for-loops…").
(4) **Determinism-sensitive surface = the P2G `ti.atomic_add` scatter reduction order** —
deterministic under `cpu_max_num_threads=1` single-thread serialization (the reference posture,
`packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/reference/mls_mpm_taichi.py:70-81`); MEASURE forward + gradient run-to-run at Stage 1b.

## 2. API surfaces consumed (WU-A autodiff substrate — grep-verified)

Identical to sims 1–2: `InverseProblem` ABC + `InitialStateRecoveryProblem` (the "throw to
target" recovery) / `ParameterIDProblem`, `ParamSpec`, `finite_difference_gradient` (central,
O(ε²)), `make_optimizer`, `new_tape`, the `gradient_fields` capture key (schema 1.1.0).
`common/common-py/src/common_py/autodiff/inverse_problem.py:71` etc.

**Sim's own deliverable:** the tape-differentiable MLS-MPM forward (P2G/G2P/F-update/neo-Hookean
stress as `needs_grad` time-indexed kernels), the `InitialStateRecoveryProblem` subclass (recover
`v0` / initial config from an observed final particle state), the gradient golden table +
derivation, `invariants.py`, the inverse-recovery integration test.

## 3. GRADIENT GOLDEN ANCHOR PLAN (gate-4; ≥3 INDEPENDENT anchors)

**Golden table G1 — `d(final position)/d(initial velocity)` (and a constitutive anchor),
small-strain elastic, short horizon.**

- **A1 (analytic, KINEMATIC term — ballistic limit):** a single particle under gravity with
  PIC transfer (no APIC affine coupling) and no stress: `x(T) = x0 + dt·Σ v_t`,
  `v_{t+1} = v_t + dt·g`, so `dx(T)/dv0 = dt·T·I`, `dx(T)/dx0 = I`, closed-form. **MEASURED
  EXACT (`dt·STEPS` diagonal) in §1.** SOURCE: analytic kinematics (hand-derived).
- **A2 (numerical baseline — exempt per close-R2):** central FD via
  `finite_difference_gradient` on the FULL APIC grid-coupled gradient. SOURCE: independent
  numerical method.
- **A3 (analytic, CONSTITUTIVE term — neo-Hookean small-strain, SOURCE-DISTINCT from A1):**
  a particle at a small uniaxial deformation `F0 = diag(1+ε, 1, 1)`; the neo-Hookean Cauchy
  stress `σ = 2μ(B−I) + λ(log J)I` (`packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/reference/mls_mpm_taichi.py:391-414`) linearizes to
  `σ ≈ (2μ+λ)·ε` along the strained axis (small ε), so `d(stress)/dE` (and the resulting
  one-step velocity change) is closed-form. Independent of A1 in **physical term** (constitutive
  not kinematic), **parameter** (a material/strain quantity not `v0`), and **method** (elastic
  linearization not ballistic integration). SOURCE: neo-Hookean linearization, hand-derived
  (Stomakhin 2013 / Jiang 2016 MPM course, as the reference's constitutive cites). *Stage-1b:
  verify the linearization regime where the autodiff matches it.*
- **A3-CITE (published differentiable-method reference):** **DiffTaichi — Hu, Anderson, Li,
  Sun, Carr, Ragan-Kelley, Durand (2020), "DiffTaichi: Differentiable Programming for Physical
  Simulation," ICLR 2020** (arXiv:1910.00935; title/authors/venue web-re-verified this session;
  "a differentiable elastic object simulator"). CITE-DON'T-IMPORT (§H.2) — the differentiable-MPM
  `diff_mpm` example (optimize initial conditions to hit a target) whose gradients are
  FD-validated in the paper; reimplement the constitutive from the landed
  `mpm-multimaterial-stack-d` reference, NOT from DiffTaichi code.

### D-ANCHOR — Stage-0 note (potential shift, like sims 1–2)

The charter §4.3 listed A3 = DiffTaichi. DiffTaichi is a published **method** anchor (cite-by-name,
FD-validated in the paper) but publishes **no storable numeric gradient value** for a golden
TABLE point. So the THIRD NUMERIC anchor is the **neo-Hookean small-strain constitutive analytic**
(above), with DiffTaichi retained as the method citation (A3-CITE). This mirrors sim-1's MMS→ODE
shift and sim-2's ∂K→conv-Jacobian shift: keep ≥3 genuinely independent NUMERIC anchors, document
the shift, never force an unsound anchor. Confirm at Stage 1b (the elastic anchor is verified
numerically there).

## 4. D-class resolutions (charter §3.3 / §7)

| D-class | Resolution |
|---|---|
| **D-ANCHOR-DIFFTAICHI** | DiffTaichi ICLR 2020 web-re-verified (title/authors/venue). CITE-DON'T-IMPORT; reimplement constitutive from the reference. The numeric A3 is the neo-Hookean elastic analytic (§3). |
| **D-REGIME** | Small-strain elastic, **no plastic yield** (the reference is neo-Hookean hyperelastic, no plasticity — `packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/reference/mls_mpm_taichi.py:374-414`), short horizon, TINY config (few particles, small grid) for a well-conditioned gradient (DiffTaichi warns sim gradients aren't always well-conditioned). A1 ballistic = the no-grid-coupling limit. |
| **D-DET** | §2.2 measure-then-declare. **The P2G `ti.atomic_add` scatter reduction order is the determinism-sensitive surface** — deterministic under `cpu_max_num_threads=1`; expected `bit-exact` / `same-stack-same-hw`; MEASURE forward + gradient at Stage 1b. Registry rows `[hybrid-pg.mpm-multimaterial-diff.{forward,gradient}]` (gradient atomic_ops = "sum-only" via the scatter + tape adjoint). |
| **D-MUTATION** | Register `mpm_multimaterial_diff` invariants target (advisory; no MMS). |
| **D-TOL** (⚠ Stage-1b §S.2) | LEAN: golden inline tolerance + WU-F axis + `GradientCheckReport.tolerance`; NO new `tolerance.toml` row (single-stack). PROBE the schema at Stage 1b. |
| **D-GATE14** | N/A (single-stack diff). WU-F differentiable-axis variant-equivalence applies — diff.forward == `mpm-multimaterial-stack-d` reference (small-config, short horizon). |
| **D-CI** | `python-strict.yml` per-sim job `test-mpm-multimaterial-diff` (in-process; no LFS pull). |
| **D-LAYOUT** | `packages/mpm-multimaterial-diff/` (flat, §0.3; import `mpm_multimaterial_diff`); spec `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-diff.md` (stub EXISTS — de-stub at Stage 1a). |
| **D-TAG** | NO (phase-close-only; I7). |

## 5. LFS / capture

Ships `tests/fixtures/legacy-captures/phase-4-mpm-multimaterial-diff.h5` + an inverse-solution
capture with the **`gradient_fields`** key (schema 1.1.0; the THIRD 1.1.0 corpus entry →
`_EXPECTED_TOTAL` 28→29). Stage-1c push = §Q same-shell + §Q.6 R2-verify. **BANK (sim-2):**
generate the failing-tests-evidence in the LEAN member venv; PBT `derandomize=True` +
`phases=` (skip shrink) so the RED suite stays <60s and byte-stable.

## 6. FACT / INFERENCE summary

FACT (ran/read at `a377351`): §0 environment, §1 MPM tape-probe numbers (BLOCK OK, A1 ballistic
`dt·STEPS·I` confirmed, autodiff-vs-FD 6.6e-5), §2 grep-verified API, the reference's neo-Hookean
stress form + ndarray-kernel typing, the DiffTaichi venue web-re-verification. INFERENCE: the A3
elastic-anchor numeric verification (Stage-1b pending), the determinism posture (MEASURE pending),
the D-TOL landing slot (LEAN, schema-probe pending).
