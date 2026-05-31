---
artifact_id: phase-4-batch-1-progress
sub_phase: phase-4-batch-1 (CPU-side differentiable frontier)
stage: PHASE-1 in-progress (sim-to-sim execution log; NOT the batch-close)
date: 2026-05-31
head_sha: 54d77d3
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: da1bb4fbeb40b345d3ca9c9412943c10d7e4fe2d36b10c13bc9278ef1a50b99e
evidence_paths:
  - docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md
  - packages/lenia-diff/lenia_diff/sim.py
  - tools/testkit/golden/tables/lenia-diff-gradient.json
  - tools/testkit/probes/reports/lenia-diff.md
---

# Phase-4 batch-1 — PHASE-1 progress log (interim; the batch-close is written after sim 4)

> Self-driven sim-to-sim execution log. This is NOT the §11 close report (that comes at
> batch close with verify_evidence + full §S.5 + CONTRADICTIONS). A fresh resume re-orients
> from COMMITTED state via the dispatch ORIENT list, then continues at "NEXT ACTION" below.

## Batch order (charter §1.2): sim1 RD-2D-diff ✓ · sim2 lenia-diff ✓ · sim3 mpm-diff ✓ · sim4 smoke-diff

## SIM 2 — lenia-diff: **LANDED + PUSHED + CI-GREEN** (origin/main `54d77d3`)

5-commit chain: `60d7369` (S0 probe) → `490ea5d` (S1a scaffold+RED) → `a1b239f` (S1b
forward+golden+GREEN) → `c1970cf` (S1c diagnostics/perf/LFS/mutation/CI) → `54d77d3` (S2
landing fold). NO tag (I7).

- **13-gate complete.** gate-14 N/A (single-stack). Mutation `lenia_diff` registered, MEASURE
  deferred (advisory, mutmut unprovisioned — sim-1 precedent).
- **Anchors (≥3 independent, NAMED):** A1 closed-form Quad4 growth-parameter analytic
  `dG/dmu=16 base³(u-mu)/(9σ²)`, `dG/dsigma=16 base³(u-mu)²/(9σ³)` (Chan 2019 *Complex Systems*
  28(3):251-286 + Chakazul `references/Chakazul-Lenia/Python/LeniaF.py:500` gn=1; autodiff==
  analytic ~1e-14); A2 central FD baseline (~9.5e-10); A3 convolution-Jacobian + growth-deriv
  adjoint `dLoss/dA0` (Chakazul kernel `references/Chakazul-Lenia/Python/LeniaF.py:493`;
  autodiff==analytic ~1e-14).
- **A3 ANCHOR-SHIFT (on-evidence, like sim-1):** charter A3=`dK/dkernel-params` ILL-POSED (Quad4
  kernel `(4r(1-r))⁴` parameter-free; Flow-Lenia is a mass-cons extension, not a diff method)
  → re-declared to the convolution-Jacobian initial-field gradient (exercises the kernel via the
  conv adjoint; well-posed). Documented in the probe §3 + spec-diff §8 + derivation doc.
- **D-GROWTH-FORM:** RESOLVED-KEEP-QUAD4 (clean smooth-interior gradient; no Gaussian fallback).
- **Forward-equivalence (WU-F differentiable axis):** diff.forward == lenia reference step,
  MEASURED BIT-EXACT (< 1e-12; same di-outer/dj-inner tap order, f64).
- **Determinism:** MEASURED bit-exact same-stack-same-hw (forward + gradient np.array_equal both
  True); rows `[continuous-ca.lenia-diff.{forward,gradient}]` HOLD; no EFECT.
- **PBT (2, regime-scoped):** `gradient_matches_finite_difference` (smooth interior, params away
  from clip saturation) + `field_bounded` (clip-Euler ∈[0,1]; the Phase-3 lenia `monotone_bounds`
  re-scoped).
- **Inverse-recovery:** mu recovered to 0.30000000 (loss 2.7e-15). **IDENTIFIABILITY FINDING:**
  the JOINT (mu,sigma) inverse is NON-identifiable in the smooth short-horizon regime (sigma
  compensates for mu — loss collapses to ~2.4e-6 at a non-planted mu); the clean demonstrative
  inverse recovers mu with sigma held at its known value.
- **WU-F forward-equivalence result:** bit-exact (see above).
- **Mutation score:** not measured (advisory; deferred to consolidated batch — sim-1 precedent).
- **§S.5 sweep:** 10/10 workflows SUCCESS at `54d77d3` (python-strict incl. test-lenia-diff,
  integrity, determinism, cpp-strict, equivalence, tolerance-budget, mutation-testing,
  audit-append-only, structure, ts-strict). render_similarity (63) + variant (30) PASS.
- **§R at `54d77d3`-pre-ledger:** 0 HF / 14 SW; digest `da1bb4fb…`.
- gate-13 worktree replay VERIFIED match=True at `490ea5d`.

### Banked frictions (carry to sims 3/4)
1. **PBT failing-tests-evidence MUST be generated in the LEAN member venv** (`uv run --directory
   <pkg> --extra dev pytest -v --tb=short` in a fresh worktree), NOT the fat workspace `.venv` —
   the pytest `plugins:` header line is NOT normalized by the gate-13 replay tool, so the fat
   venv (hydra/timeout/jaxtyping) mismatches the lean replay (cov/hypothesis/anyio).
2. **PBT settings need `derandomize=True` + `phases=(explicit,reuse,generate,target)`** (skip
   shrink) so the RED suite stays <60s (else pytest prints a `(H:MM:SS)` summary suffix the
   gate-13 normalizer does NOT strip) AND the Taichi-banner count is deterministic.
3. **ti.ad.Tape Taichi quirks:** load IC + params OUTSIDE the tape (a `from_numpy`/`fill` inside
   re-triggers the kernel-structure error); convolution/stencil taps must `ti.static`-unroll
   (a nested runtime for-loop in a differentiated kernel raises "Mixed usage of for-loops…").
4. **LFS:** repopulate `.git/lfs/objects/<2>/<2>/<oid>` from working-tree content before any
   worktree op (OID==sha256); push R2 first (`source setup-lfs-s3-local.sh && git lfs push
   --object-id origin --stdin`) then GitHub (`git -c lfs.standalonetransferagent= push`).
5. eof-fixer adds a trailing newline to capture `.json` sidecars (harmless; re-add + re-verify).

## SIM 3 — mpm-multimaterial-diff: **LANDED + CI-GREEN** (local chain; push pending)

5-commit chain: `c600ac2` (S0 probe) -> `f4bafa9` (S1a scaffold+RED) -> `531d108` (S1b
forward+golden+GREEN) -> `66c8ec1` (S1c perf/CI/LFS/mutation) -> `<S2>` (landing fold). NO tag (I7).

- **13-gate complete.** gate-14 N/A (single-stack). Mutation `mpm_multimaterial_diff` registered,
  MEASURE deferred (advisory, mutmut unprovisioned — sim-1/2 precedent).
- **Anchors (>=3 independent, NAMED):** A1 ballistic kinematic analytic `dLoss/dv0 =
  2(dt*STEPS)^2(v0-v0t)` (single particle F=I C=0 -> stress==0 + APIC first-moment==0 -> PIC
  free-flight; autodiff==analytic ~1e-18 EXACT); A2 central-FD baseline (autodiff-vs-FD ~1.9e-8);
  A3 neo-Hookean small-strain constitutive `d(sigma00)/deps = 2mu+lam` (autodiff==analytic 0.0
  EXACT; distinct physical term/parameter/method). Golden table 9 points.
- **A3 ANCHOR-SHIFT (on-evidence, like sims 1/2):** charter A3=DiffTaichi is method-only (no
  storable numeric for a golden TABLE point) -> A3-numeric re-declared to the neo-Hookean
  constitutive analytic; DiffTaichi retained as the method cite (A3-CITE). Documented probe §3 +
  spec-diff §8 + derivation doc.
- **D-DT (Stage-1b MEASURED):** `dt=1e-3` is the largest step keeping the stiff (E=4e3) elastic
  dynamics smooth (autodiff-vs-FD ~2e-8); `dt>=5e-3` -> ~3% (the DiffTaichi "sim gradients aren't
  always well-conditioned" warning). The reference itself runs dt=1e-4.
- **Forward-equivalence (WU-F differentiable axis):** diff.forward == mpm-multimaterial-stack-d
  reference rollout, MEASURED BIT-EXACT. **FRICTION (banked):** the reference's `_ensure_taichi`
  re-inits Taichi via `set_taichi_deterministic` WITHOUT `default_fp=ti.f64` (it is f32-default-
  robust via explicit `ti.f64(...)` seeds; the diff's literal constants are NOT) -> if the
  reference runs first the diff computes in f32 and diverges ~0.5% over the horizon. FIX: evaluate
  the diff FIRST (under the conftest f64 runtime) then the reference (diff-first ordering is the
  contract; the module-level `_TAICHI_INITIALIZED=True` flag is best-effort but pytest ordering
  does not reliably honor it). Lenia avoided this by sharing the runtime via the reference's
  per-instance init flag.
- **Determinism:** MEASURED bit-exact same-stack-same-hw (forward + gradient np.array_equal both
  True; single-thread CPU serialises the P2G `ti.atomic_add` scatter); rows
  `[hybrid-pg.mpm-multimaterial-diff.{forward,gradient}]` HOLD (atomic_ops sum-only — the forward
  ALREADY scatters via atomic_add, unlike lenia whose forward row was "none"); no EFECT.
- **PBT (2, regime-scoped):** `gradient_matches_finite_difference` (interior small-strain, short
  horizon) + `momentum_change_bounded_by_impulse` (total particle momentum change == gravity
  impulse; internal elastic+APIC add no net momentum; interior no-boundary regime).
- **Inverse-recovery:** shared `v0` recovered to ~3e-10 (loss 5e-6 -> 7e-23, 29 iters).
  **IDENTIFIABILITY:** unlike lenia's joint (mu,sigma), v0 IS identifiable (near-linear injective
  map). The small-dt **flat-in-v0 loss** needs a curvature-scaled Newton SGD step
  (lr=0.5/H, H=2*n_particles*(dt*STEPS)^2) — a fixed-lr Adam oscillates at the lr scale and never
  reaches the planted point.
- **§R at landing:** 0 HF / 14 SW (integrity --all --mode strict, rc 0).
- gate-13 worktree replay at `f4bafa9` VERIFIED match=True (norm sha256 e7140424…).
- Corpus roundtrip 31 passed (`_EXPECTED_TOTAL` 28->29; the 3rd 1.1.0 gradient_fields entry).
- **§S.5 sweep + LFS R2 push (RECORDED):** pushed `cb5c817..4a05ca3` to origin/main. GitHub
  push uploaded the LFS object to GitHub-LFS (1/1) but GitHub-LFS budget is exhausted, so CI's
  "Selective LFS fetch" returned "No downloadable version" → python-strict initially RED. ROOT
  CAUSE: the R2 single-object push had the WRONG arg order (`git lfs push --object-id --stdin
  origin`, remote AFTER --stdin) → silent EOF, so the object never reached R2. FIX (F-MPM-3): the
  documented order `git lfs push --object-id origin --stdin <<<"$OID"` (remote BEFORE --stdin)
  pushed it to R2 cleanly (1/1). Re-ran the failed python-strict job → **completed success**.
  Final §S.5: 10/10 workflows GREEN at `4a05ca3` (python-strict incl. test-mpm-multimaterial-diff
  + test-lenia-diff + test-reaction-diffusion-2d-diff + the corpus-roundtrip LFS-fetch, integrity,
  determinism, equivalence, structure, mutation-testing, audit-append-only, tolerance-budget,
  ts-strict, cpp-strict). render_similarity + variant jobs GREEN. **Sim 3 CONFIRMED CI-GREEN.**

### Banked frictions (carry to sim 4)
- **F-MPM-1 (cross-reference f32 re-init):** any test mixing the diff with a landed
  `set_taichi_deterministic`-using reference must run the diff FIRST (conftest f64) — the
  reference's `_ensure_taichi` re-init drops `default_fp` to f32 and contaminates the diff's
  literal constants (~0.5% divergence). (sim 4 smoke-diff is Warp, not Taichi — does NOT inherit
  this, but the general "share/order the runtime" lesson applies.)
- **F-MPM-2 (base-node discontinuity):** `base=floor(fx+0.5)-1` is discontinuous; keep particles
  away from cell boundaries throughout the horizon (interior cluster, blob_radius < dx) so a tiny
  op-order difference never flips a stencil cell.
- **F-MPM-3 (R2 single-object push arg order):** `git lfs push --object-id origin --stdin`
  (remote BEFORE `--stdin`) works; `git lfs push --object-id --stdin origin` (remote AFTER)
  silently EOFs and the object never reaches R2 → CI LFS-fetch fails since GitHub-LFS budget is
  exhausted. Use the documented heredoc form. This refines the §Q invocation for sim 4.
- The sim-2 banked frictions (lean-venv evidence, derandomize+phases, LFS same-shell R2 push,
  eof-fixer on .json sidecars) all RE-CONFIRMED here.

### NEXT ACTION — SIM 4 eulerian-smoke-diff Stage 0 (Stack E / Warp; D-WARP-ADJOINT BLOCK gate)

Probe that the semi-Lagrangian smoke step is `wp.Tape`-differentiable on Warp CPU BEFORE
building (BLOCK gate — surface BLOCKED with the specific gap if a genuine adjoint hole exists;
do NOT force or CPU-substitute). A1 linear-advection analytic (Stam 1999 method cite), A3
diffusion heat-kernel analytic (distinct physical term from A1), A2 central FD vs the wp.Tape
adjoint. Apply F-RB-3 (`# mypy: ignore-errors` scoped to Warp-touching files). Forward ref
`packages/eulerian-smoke-stack-e`. Then 1a RED -> 1b GREEN -> 1c -> 2, push + §S.5. Then the
batch-1-close report.
