---
artifact_id: task-8-3dgs-mpm-plan-drafting
sub_phase: sub-phase-phase-3-3dgs-mpm
task: task-8
stage: plan-drafting
date: 2026-05-29
verdict: CONFIRMED-SHIFTED
head_sha: 3bc3fe3b667ba2931d81c5c632d7c722de56ac6b
anchor_sha: 3a2a7aeda23b1952cb9232a95b28f1a78d35571f
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/phases/sub-phase-phase-3-3dgs-mpm.md
  - tools/testkit/probes/reports/3dgs-mpm.md
  - docs/_audits/phase-3/sub-phase-phase-3-3dgs-mpm-plan-drafting-2026-05-29T21-30-00Z.md
  - docs/_audits/phase-3/progress.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
  - common/common-3dgs/src/common_3dgs/__init__.py
  - tools/testkit/render_similarity/__init__.py
  - packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py
  - docs/spec-amendments-proposed.md
---

# Plan-drafting landing audit — task-8 3DGS-MPM (sub-phase 3.5, Phase-3 FINALE)

Links the charter (`docs/phases/sub-phase-phase-3-3dgs-mpm.md`) + probe
(`tools/testkit/probes/reports/3dgs-mpm.md`) to execution. PLAN-DRAFTING ONLY — no Stage
0/1/2 work performed. Spec FROZEN §9.6; plan no-edit §0.3.

## Anchor probe
- HEAD `3a2a7ae` (clean); preflight phase 3 **exit 0** (8/8 PASS incl. integrity-all-green);
  integrity **0 HARD_FAIL / 14 SOFT_WARN** (digest `5c7172a2…`, measured live per §R — not copied).
- Prior sub-phase task-7 pinn-poisson `closed-with-shifted-8` (`c4c3f43`), then the
  two-tier CI split (`3a2a7ae`, L-PINN-2). progress.md tasks 1–7 read.

## ⚠ Load-bearing findings
1. **PRECONDITIONS DISCHARGED — NO BLOCK.** Both hard deps present (`common/common-3dgs/` +
   `docs/common/3dgs.md`; `tools/testkit/render_similarity/metrics.py`) + Phase-2 MPM
   (`packages/mpm-multimaterial-stack-e/`). **common-3dgs renders CPU-only** — `render()` →
   `wp.launch(..., device="cpu")` unconditionally (`common/common-3dgs/src/common_3dgs/render.py:203`); `test-common-3dgs` green
   on `ubuntu-latest`; no CUDA imports/conditionals. CPU-render feasible.
2. **D-RENDER-DET — bit-exact rasterizer → deterministic-golden-render boundary.** common-3dgs
   declared `bit-exact / same-stack-same-hw`, atomic-free, serial CPU `wp.launch`
   (`tools/testkit/determinism/registry.toml:49-60`; `docs/common/3dgs.md:69-82`). ⇒ golden-render gate = **tight
   regression** (PSNR→∞ vs own goldens). **Below-floor = STOP-to-investigate, NOT a
   quality-flag close** (single-stack, no stochastic mask; cannot invoke task-6's
   stochastic-divergence argument — gate-14 diagnosis `5cddb6c`). SHIFT of plan §6.8-E.
3. **PhysGaussian (web-verified live):** `gh api` → `license=null`, **no LICENSE file**, SHA
   **`8339ed6a…`** (matches §2.18 `:274`; security-advisories empty). ⇒ **cite-only, NO
   source vendoring**; `references/PhysGaussian/manifest.yaml` = cite-only pointer. Consistent
   with §2.18 `:276-280`. **A-7 staged:** spec line 2551 lists PhysGaussian License "MIT" —
   WRONG (file at execution Stage 0).
4. **Coupling-anchor eq numbers (web-verified, CVPR'24 p.4392-4393) — SHIFT plan's "(8)-(10)":**
   MVP covariance/center = **Eq. (7)** (`Σ'=F A Fᵀ`) **+ Eq. (8)** (`x_p=φ(X_p,t)`,
   `a_p=F A Fᵀ`); stretch SH-rotation = **Eq. (9)** (polar decomp `F=R S`, `f¹(d)=f⁰(Rᵀd)`);
   Eq. (10) = alternative incremental rate-form (not the F-direct MVP).
5. **API/path SHIFTs (live-probed):** `GaussianSet`→**`GaussianSplatModel`**,
   `forward_splat`→**`render`** (`common/common-3dgs/src/common_3dgs/__init__.py:13-26`); render_similarity is a
   package `from render_similarity import psnr, ssim, lpips` (NOT
   `tools/testkit/equivalence/render_similarity.py`); MPM at
   `packages/mpm-multimaterial-stack-e/` (NOT `hybrid-pg/.../python-warp/`); layout
   `packages/3dgs-mpm/` (NOT `neural-rendered/3dgs-mpm/python/`); CI `python-strict.yml`
   (build-py.yml absent).
6. **D-TOL — both prongs fit schema (no STOP-SCHEMA-FIT).** `tools/testkit/equivalence/tolerance-schema.json:38`
   anticipates "Tasks 6 and 8 add rows" w/ `neural-rendered` category. Numerical →
   `[golden_tolerance.neural-rendered.3dgs-mpm]` (bespoke keys); perceptual →
   `[render_similarity.neural-rendered.3dgs-mpm]` (psnr_min/ssim_min/lpips_max LOCKED to the
   §2.12 floors — at-or-ABOVE, unlike NCA's below-floor statistical row).
7. **MPM has no monolithic `step()`** — sequence `compute_particle_stresses → p2g_with_stress
   → grid_update → g2p → deformation_update → advect_particles`; per-particle `F (N,3,3) f64`
   read after `deformation_update`. End-to-end determinism composes MPM (bit-exact) →
   coupling (deterministic) → render (bit-exact); MEASURE at Stage 1b-2.

## D-class routing (leans)
| D-class | Status | Lean |
|---|---|---|
| D-PRECONDITIONS/CPU-RENDER ⚠ | operator | DISCHARGED — proceed, no BLOCK; re-verify live Stage 0 |
| D-RENDER-DET ⚠ | operator | bit-exact → tight regression; below-floor = STOP-to-investigate (NOT quality flag) |
| D-ANCHOR-COUPLING ⚠ | operator | Eq.(7)-(8) MVP + Eq.(9) stretch (SHIFT); Anchor-2 §2.4 same-theory caveat; Anchor-3 F=I |
| D-VENDOR-ROLE/SHA ⚠ | operator | cite-only, NO source; SHA `8339ed6a…`; A-7 staged |
| D-SCOPE-MVP/STRETCH ⚠ | operator | MVP (centers+scale/rot, SH frozen); stretch SH-rotation; defer >~3d → Phase 4 |
| D-CI ⚠ | operator | `python-strict.yml`; measure-then-split two-tier (L-PINN-2) IF expensive |
| D-SCENE ⚠ | operator | small synthetic ~200–500 Gaussians; NOT a full Inria scene |
| D-MPM-DET | report | end-to-end bit-exact-same-hw; MEASURE; capture carries MPM+Gaussian state |
| D-TOL | resolved | two rows, schema pre-baked; single-stack (no cross-stack cap) |
| D-LAYOUT | resolved | `packages/3dgs-mpm/` (§0.3 SHIFT) |
| D-API | resolved | GaussianSplatModel/render/Camera/load_ply; render_similarity direct import |
| D-MANIFEST-FMT | resolved | per latest `references/*/` precedent; cite-only pointer |
| D-USD | resolved | DEFER (task-4 Phase-3-Stack-E-WIDE policy) |
| D-MUTATION | resolved | none (sim; coupling.py sim-local; common-3dgs baseline = task-1 / Phase-4 WU-C) |
| D-NAMING / D-CAPTURE-DESC | resolved | `3dgs-mpm`; propose D.2.3 descriptor at landing |
| D-TAG | resolved | NO |

## Scope / stage / gate summary
- **First neural-rendered CATEGORY**; single-stack (Stack E Warp); **NO gate-14** (no
  cross-stack pair). Render-similarity = **gate-4 Cat-3 golden** (deterministic own-pipeline;
  MUST clear §2.12 floors).
- **Two-pronged verification:** numerical coupling-correctness golden (≥3 anchors) + perceptual
  render-similarity vs OWN committed golden renders. MPM's own verification still runs.
- Stage cadence 0 → 1a → 1b (split: coupling / render+capture / golden prongs) → 1c → 2;
  13 gates, no gate-14, no sim mutation target. HEAVIEST LFS footprint of Phase 3 (§Q).
- Deliverables A–N mapped (charter §3); plan §6.8 stale anchors SHIFTed (§1.3).

## SHIFTs (plan §6.8; no plan edit per §0.3)
API names (GaussianSet→GaussianSplatModel, forward_splat→render); render_similarity path
(package, direct import); MPM path (`packages/mpm-multimaterial-stack-e/`); layout
(`packages/3dgs-mpm/`); CI (`python-strict.yml`); eq numbers ((8)-(10) → (7)-(8)+(9));
vendoring (cite-only, no source); below-floor semantics (STOP-to-investigate, not quality flag).

## Commit cadence (this plan-drafting session)
probe report → charter → this landing audit + progress.md entry → Convention #12 SHA back-fill.
Pushed to `main` per the established Phase-3 plan-drafting norm (no tag).

## Verdict
**CONFIRMED-SHIFTED.** Preconditions DISCHARGED; CPU-render FEASIBLE; no BLOCK / no HARD-RULE-2
surface. Stage 0 dispatch READY once the operator ratifies D-PRECONDITIONS/CPU-RENDER,
D-RENDER-DET, D-ANCHOR-COUPLING, D-VENDOR-ROLE/SHA, D-SCOPE-MVP/STRETCH, D-CI, D-SCENE, and
A-7 staging. task-8 is **TERMINAL on produce**; both hard deps satisfied. Phase-3 sim arc
complete on dispatch of task-8 execution.
