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

## Batch order (charter §1.2): sim1 RD-2D-diff ✓ · sim2 lenia-diff ✓ · sim3 mpm-diff · sim4 smoke-diff

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

## NEXT ACTION — SIM 3: mpm-multimaterial-diff, Stage 0

Reference mapped (`mpm_multimaterial_stack_d.reference`): neo-Hookean elastic (mu=E/2(1+nu),
lambda=E nu/((1+nu)(1-2nu)), E=4e3, nu=0.3), quadratic-B-spline P2G/G2P (APIC), F-update
`F'=(I+dt C)F`, NO plasticity. Reference kernels use `ti.types.ndarray` (NOT tape-safe) →
the diff variant re-implements with `needs_grad` time-indexed `ti.field` (DiffTaichi pattern).
**P2G `ti.atomic_add` scatter is the determinism-sensitive surface — MEASURE.** DiffTaichi
(arXiv:1910.00935) NOT vendored → CITE-DON'T-IMPORT (reimplement constitutive from the
reference). Use a TINY config (few particles, small grid, short horizon) for the gradient
golden, regime-scoped small-strain elastic (no plastic yield). A1 ballistic ∂x(T)/∂v0 = T·I
(single particle, no grid coupling) — verified analytically correct; A2 central FD on the full
grid-coupled gradient; A3 = Stage-0 re-verify the exact DiffTaichi elastic example + its
FD-check claim (cite-by-name), or a second analytic on a distinct term if ill-posed (shift on
evidence, keep ≥3, document — the sim-1/sim-2 precedent). Stage-0 BLOCK gate: probe that the
MPM forward (P2G scatter + G2P gather + F-update + neo-Hookean stress) is `ti.ad.Tape`-
differentiable on Taichi CPU BEFORE building. Then 1a RED → 1b GREEN → 1c → 2, push + §S.5.
