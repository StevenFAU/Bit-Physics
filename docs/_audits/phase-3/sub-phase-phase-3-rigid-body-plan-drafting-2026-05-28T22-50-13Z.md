---
date: 2026-05-28
author: phase-3 rigid-body-pedagogical plan-drafting (Claude Code)
subject: plan-drafting landing audit — sub-phase-phase-3-rigid-body (task-4); first Stack-E sim of Phase 3
verdict: SHIFTED (charter ready for Stage 0 WITH four operator-pending D-classes)
head_sha: TO-BACKFILL
prior_sub_phase_landed_at: 2da281a
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:
  docs/phases/sub-phase-phase-3-rigid-body.md: at-head
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-probe-2026-05-28T22-50-13Z.md: at-head
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md: at-head
  docs/_audits/phase-3/progress.md: at-head
  docs/phases/phase-3-plan.md: at-head
  docs/architecture.md: at-head
  docs/conventions/sub-phase-conventions.md: at-head
evidence_paths:
  - docs/phases/sub-phase-phase-3-rigid-body.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-probe-2026-05-28T22-50-13Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md
  - docs/_audits/phase-3/progress.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
d_class_surfaced:
  - D-ALGO (OPEN — operator) — spec §5.8 "maximal-coordinate" vs plan §6.4 "ABA" (Featherstone Ch.7 = reduced-coordinate). Lean ABA per §6.4-authoritative + Ch.7 coherence; surface §5.8 corrigendum.
  - D-ANCHOR (OPEN — operator) — plan §6.4 Anchor 2 "Goldstein 3rd ed. §4.3" is a WRONG citation (§4.3 = transformation-matrix algebra). Corrected to DLMF §19.2 + §22.19(i) and/or Landau & Lifshitz §11.
  - D-TOL (OPEN — operator) — §S.3 single-stack golden_tolerance landing (lean) vs the dispatch's "propose a cross_stack budget cap". No schema extension; no §2.6 budget amendment.
  - D-USD (OPEN — operator) — spec §2.5 "every Stack E sim ships USD export" vs plan §6.4 silence + zero Stack-E precedent + unbuilt common-warp USD surface. Lean DEFER to task-9 / dedicated infra sub-phase.
  - D-LAYOUT (RESOLVED — operator-locked) — packages/articulated-pedagogical/ per §0.3.
  - D-DET (RESOLVED-IN-CHARTER) — bit-exact / same-stack-same-hw via Warp deterministic mode; MEASURE 1b.
  - D-CI (RESOLVED-IN-CHARTER) — python-strict.yml test-rigid-body-pedagogical (build-py.yml absent).
  - D-CAPTURE-API (RESOLVED-IN-CHARTER) — common-warp batch Capture+write_capture (not incremental).
  - D-PBT (RESOLVED-IN-CHARTER) — energy_drift_bounded + momentum_conservation.
  - D-TAG (RESOLVED — operator-locked NO).
---

# Plan-drafting landing audit — task-4 rigid-body-pedagogical

## Verdict

**SHIFTED** — the charter (`docs/phases/sub-phase-phase-3-rigid-body.md`) is ready
for the Stage-0 execution dispatch *with four operator-pending D-classes*
(D-ALGO, D-ANCHOR, D-TOL, D-USD). First Stack-E (Warp) sim of Phase 3.

## Cadence (this session)

ACTION #1 `preflight-phase.py 3` exited 1 → drift audit filed + STOP → operator
ratified preconditions MET (stale-tooling false-positive) → RESUME. Plan-drafting
commit chain (trunk-based to `main`, no PR, no tag — D-TAG NO):
1. preflight-drift audit (`7d52ce1`) + YAML corrigendum (`dc92aec`).
2. probe report (`07e6c02`).
3. charter (`7005e43`).
4. this landing audit + progress.md entry.
5. Convention-#12 SHA back-fill.

## Anchor state (§R measure-don't-copy)

Verified via `uv run python -m integrity --all --mode strict` (canonical; the
preflight's bare `python3 -m integrity` resolves to a stale GPU-Sims install —
F1 of the drift audit): **invariant 0 HARD_FAIL / 14 SOFT_WARN**; measured digest
`6096fa35cc2aa35c…90c7e1ac` (same bytes as at `2da281a` — clean docs add no
audit-log lines). The plan-drafting files introduced a transient 15th SOFT_WARN
(malformed YAML in the drift audit's `findings:` block, backtick-leading scalars);
fixed in `dc92aec`; count restored to 14 before this audit. I1–I7 not re-swept
(plan-drafting; no code change). STOP-D not fired (invariant intact).

## Substantive findings (the charter is the detail; this is the index)

- **D-ALGO** — `docs/architecture.md:1175` mandates *maximal-coordinate*;
  `docs/phases/phase-3-plan.md:1567`/`:1613`/`:1625` mandate *ABA* (Featherstone
  Ch. 7 = the O(n) **reduced/generalized-coordinate** algorithm; maximal-coord is
  Ch. 8). §5.8's prose is internally inconsistent with its own Featherstone cite.
  Lean: ABA. **Operator routes.**
- **D-ANCHOR** — `docs/phases/phase-3-plan.md:1605` cites Goldstein 3rd ed. §4.3
  for the elliptic-integral pendulum; §4.3 is "Formal Properties of the
  Transformation Matrix" — a **factually wrong** anchor. Goldstein has no exact-
  pendulum-period section. Corrected anchor set: Marion&Thornton §3.2 (small-angle,
  already correct) + DLMF §19.2/§22.19(i) (+ optional Landau & Lifshitz §11) for
  large-angle/Jacobi. RK4-ref labeled numerical baseline (not analytic). **Operator
  routes** (incl. whether to file a plan corrigendum).
- **D-TOL** — the dispatch (PROBE item 4) + `docs/phases/phase-3-plan.md:1608`
  ask to propose a `[budgets.rigid-body.cross_stack]` cap. But §S.3
  (`docs/conventions/sub-phase-conventions.md:1530-1540`) **names**
  `articulated-pedagogical` as a single-stack golden-table sim → lands under the
  existing `golden_tolerance` schema branch (already enumerates its three keys);
  single-stack sims add **no** cross_stack budget (common-3dgs/ising precedent).
  Lean: `[golden_tolerance.rigid-body.articulated-pedagogical]`, no budget
  amendment. **Surfaced per Hard-Rule-2 "file both citations"** — operator either
  ratifies the §S.3 landing (recommended) or overrides §S.
- **D-USD** — `docs/architecture.md:1349` mandates USD export for every Stack E
  sim, but common-warp's USD surface is unbuilt (`docs/architecture.md:974`
  spec-only), no Stack-E sim ships it, and plan §6.4 omits it. Lean: DEFER (route
  to task-9 / infra sub-phase; Convention-I rule-of-three). **Operator routes.**
- **common-warp consumability** — runtime/determinism/capture PRESENT and
  sufficient; spatial-algebra/quaternion/integrator/CLI ABSENT but are the sim's
  own §6.4-E physics deliverable, NOT missing shared infra. **No Hard-Rule-2
  missing-surface block.**

## Stale plan/dispatch anchors pre-resolved (§0.3)

- "NEW top-level rigid-body/ folder" / "mirror hybrid-pg/ volumetric-grid/
  particle-fluid/" → those dirs do not exist; `packages/articulated-pedagogical/`
  (D-LAYOUT, operator-locked).
- ".github/workflows/build-py.yml" → absent; `python-strict.yml` (D-CI).
- "BASE BRANCH / YOUR BRANCH / MERGE PROTOCOL §4.3" → trunk-based (plan v8
  amendment `docs/phases/phase-3-plan.md:46`).

## Gate map / scope

13-gate map specialized in charter §7. **No gate-14** (single-stack, no cross-
stack equivalence). **No mutation target** (sim, not testkit surface — §6.0 item
12). One new `.h5` fixture → LFS-touching → §Q bootstrap is Stage-0 first action.

## Orientation

Phase-3 remaining after task-4: task-5 mass-spring-cloth (Stack C) → task-6
neural-ca (D+B) → task-7 PINN-Poisson (Stack E + PyTorch) → task-8 3DGS-MPM
(Stack E) → task-9 common-warp maturation (inventories this sub-phase's consumer
site + USD-export candidate) → task-10 landing/close (operator-pushed
`v0.3.0-phase-3`). Banked cleanup candidates open: SIBLING-FIXTURE-LFS;
integrity-meta-test-ci-wiring (`docs/architecture.md:768`).

## Next

Operator ratifies the charter (routes D-ALGO/D-ANCHOR/D-TOL/D-USD), then issues
the Stage-0 execution dispatch (charter §9 prompts). NO tag.
