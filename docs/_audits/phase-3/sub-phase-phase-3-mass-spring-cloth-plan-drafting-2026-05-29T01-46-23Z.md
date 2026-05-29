---
date: 2026-05-29
author: phase-3 mass-spring-cloth plan-drafting (Claude Code)
subject: plan-drafting landing audit — task-5 mass-spring-cloth (sub-phase 3.4); first Stack-C (Vulkan/C++) sim of Phase 3
verdict: SHIFTED (charter ready for Stage 0 WITH operator routing of 5 D-classes)
head_sha: be3e468
prior_sub_phase_landed_at: be3e468
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/phases/sub-phase-phase-3-mass-spring-cloth.md
  - docs/_audits/phase-3/sub-phase-phase-3-mass-spring-cloth-probe-2026-05-29T01-46-23Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-mass-spring-cloth-plan-drafting-2026-05-29T01-46-23Z.md
  - docs/_audits/phase-3/progress.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
---

# Plan-drafting landing audit — task-5 mass-spring-cloth

Sub-phase 3.4, plan §6.5. **First Stack C (Vulkan / C++20) sim of Phase 3.**
Trunk-based to `main`; no PR; **no tag** (D-TAG NO).

## 1. Verdict

**SHIFTED** — charter `docs/phases/sub-phase-phase-3-mass-spring-cloth.md` is
ready for Stage 0 *with five operator-pending D-classes*: **D-VENDOR-ROLE**,
**D-VENDOR-SHA**, **D-DET**, **D-ANCHOR**, **D-PBT** (the load-bearing pair is
D-VENDOR-ROLE + D-DET). Seven D-classes are RESOLVED-IN-CHARTER (D-LAYOUT, D-CI,
D-MANIFEST-FMT, D-TOL, D-CAPTURE-API, D-NAMING, D-TAG).

## 2. Anchor (§R two-field)

- `preflight-phase.py 3` → **genuine exit 0** (8/8 PASS; F1/F2 hardened `1793b83`;
  no STOP-PREFLIGHT-NEW).
- `integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN** at `be3e468`;
  digest `f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3`
  (§R measured live, not copied; matches the task-4 closing digest — the
  plan-drafting chain is docs-only and not yet committed at measurement time).
- Invariant is the **count**; the digest is informational and will drift once the
  plan-drafting docs land (new audit-log lines per §R.1).

## 3. What was produced

| Artifact | Path |
|---|---|
| Charter | `docs/phases/sub-phase-phase-3-mass-spring-cloth.md` |
| Probe report | `docs/_audits/phase-3/sub-phase-phase-3-mass-spring-cloth-probe-2026-05-29T01-46-23Z.md` |
| This audit | `docs/_audits/phase-3/sub-phase-phase-3-mass-spring-cloth-plan-drafting-2026-05-29T01-46-23Z.md` |
| progress entry | `docs/_audits/phase-3/progress.md` (appended) |

Commit cadence (mirrors task-4): probe → charter+audit+progress → Convention #12
SHA back-fill. Agent pushes the plan-drafting chain to `main` per the established
Phase-3 plan-drafting norm (common-3dgs/render-similarity/ising/rigid-body all
agent-pushed their plan-drafting chains; no tag).

## 4. Five open D-classes (operator routes before Stage 0)

1. **D-VENDOR-ROLE** ⚠ (load-bearing) — lean **vendored READ-ONLY reference-oracle
   + reimplement XPBD from Macklin 2016** (Bender cross-checks goldens; catenary +
   hand-derivation are the §2.4 independent anchors). Evidence: all 3 vendored
   upstreams are read-only oracles; `references/` excluded from hooks + Cat-2;
   SPlisHSPlasH→SPH precedent. Drives the whole build.
2. **D-VENDOR-SHA** ⚠ — lean **`2.2.0` (`aa62c44f…`)** per spec D.3 "Latest stable"
   (web-verified MIT); §2.18 recorded master-HEAD `d0894bdb`. Operator reconciles
   (re-pin §2.18 to `2.2.0`, recommended; OR ratify master-HEAD as intentional).
3. **D-DET** ⚠ (load-bearing) — Vulkan **iterative Gauss-Seidel**; do NOT
   pre-declare bit-exact. DEFAULT `[soft-body.mass-spring-cloth]` bit-exact /
   same-stack-same-hw row at 1a (FIRST Stack-C registry row), MEASURE 1b
   (`assert_deterministic_run`, tolerance=0.0, `LP_NUM_THREADS=0`),
   re-characterize honestly if GS needs atomic scatter.
4. **D-ANCHOR** ⚠ — catenary `y=a·cosh(x/a)` correct; **Symon §10.2 WRONG (Ch 10
   = tensors), M&T §6.4 suspect (hanging chain is §6.6), Beer "Table 7.2" dubious
   (catenary is Ch 7)**. Corrected anchor set (Beer Ch 7 / hand-derivation / M&T
   §6.6) + **catenary-LIMIT regime caveat** (elastic cloth ≠ ideal inextensible
   catenary; converge XPBD iterations, don't widen `catenary_shape_rel`).
   Grep-cite-re-verify at 1b; corrected anchors in spec-ref §6 + derivation F; NO
   plan edit (§0.3); same wrong-cite failure mode as task-4 Goldstein §4.3.
5. **D-PBT** ⚠ — `length_bounded_above` (any IC) + **re-declared
   `momentum_conservation_free_no_gravity`** (FREE/unpinned cloth only — pins
   supply external force; rigid-body momentum→angular-momentum precedent).
   Wiring (first C++-sim Python-PBT, no precedent): Hypothesis →
   subprocess the C++ capture binary → read `.h5` → assert.

## 5. Resolved-in-charter (no operator action)

- **D-LAYOUT** — `packages/mass-spring-cloth/` (flat; `src/`+`include/`+`shaders/`+
  `tests/`; NO `cpp/` subdir, NO top-level `soft-body/` code dir) per §0.3 +
  RD-2D-Stack-C. Sim-spec keeps `docs/sim-specs/soft-body/mass-spring-cloth/`.
- **D-CI** — `cpp-strict.yml` `test-mass-spring-cloth` (build-cpp.yml absent);
  mirror the RD-2D-Stack-C ctest/lavapipe job.
- **D-MANIFEST-FMT** — `references/PositionBasedDynamics/MANIFEST.toml`
  (reference-manifest-v1.json), NOT `manifest.yaml`.
- **D-TOL** — `[golden_tolerance.soft-body.mass-spring-cloth]` (`position_abs`,
  `catenary_shape_rel`) per §S.3 (cloth EXPLICITLY enumerated); NO cross_stack
  budget cap, NO schema extension, NO §2.6 amendment.
- **D-CAPTURE-API** — C++ `common_cpp::capture::Hdf5Writer` + `Manifest`
  (schema_version "1.0.0", dtype "f64", determinism.claimed per D-DET).
- **D-NAMING** — canonical `mass-spring-cloth`; `cloth-xpbd` (spec Appendix D.2.3
  descriptor + D.3 "used by") → corrigendum to `spec-amendments-proposed.md`
  (spec FROZEN §9.6; operator applies at phase boundary). NO plan edit.
- **D-TAG** — NO (phase-close-only; operator pushes `v0.3.0-phase-3` at task-10).

## 6. Gate map / scope confirmations

- **13 gates** (spec §3.5 v2.4); charter §7 specializes each.
- **No gate-14** — cloth is single-stack terminal (no cross-stack pair; absent
  from Phase 1/2; no downstream consumer per plan §3.1). RD-2D-Stack-C's gate-14
  exists only because it is a port with an other-stack twin.
- **No mutation target** — sim, not testkit surface (§6.0 item 12; mutation =
  task-1/2/9 territory).
- **USD cleanly OUT** — cloth is Stack C; spec §2.5 USD-export binds only Stack-E
  sims (3.3/3.5/3.6). No D-USD (unlike task-4 rigid-body, which is Stack E).
- **§Q LFS-touching** — new `.h5` fixture + canonical capture → §Q Stage-0
  bootstrap at execution; plan-drafting commits are docs-only (no §Q action here).

## 7. HARD RULE 2 / conflicts surfaced (not silently adapted)

- **D-VENDOR-SHA:** spec D.3 "Latest stable" (`2.2.0`/`aa62c44f`) vs §2.18
  master-HEAD (`d0894bdb`) — filed with both citations; operator reconciles.
- **D-ANCHOR:** two plan catenary section-cites web-verified WRONG/suspect — filed
  with the corrected sections; no plan edit (§0.3), corrected cites land in
  spec-ref + derivation; operator confirms.
- No conflict blocks plan-drafting. No surface is missing (common-cpp mature).

## 8. Next

Operator ratifies the charter + routes the 5 D-classes → Stage-0 execution
dispatch (charter §9 prompts). After task-5: task-6 (NCA D↔B), task-7 (PINN),
task-8 (3DGS-MPM), task-9 (common-warp maturation), task-10 (Phase-3 close,
operator-pushed `v0.3.0-phase-3`).
