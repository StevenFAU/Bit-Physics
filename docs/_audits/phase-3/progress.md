# Phase 3 — progress bridge (append-only)

> State-bridging surface per `docs/phases/phase-3-plan.md:628-659` (§3.5) + §9.4, adapted from
> the v8 single-agent per-task schema to the matured **per-sub-phase cadence** (plan-drafting →
> Stage 0 → 1a/1b/1c → Stage 2). One entry per stage/sub-phase, in order. Append-only; never edit
> a prior entry. The v8 schema's "Branch merged at SHA / PR" rows are trunk-based-superseded
> (`docs/phases/phase-3-plan.md:46`) → "Landed at SHA" (no PR). Initialized at the first sub-phase
> plan-drafting.

## sub-phase-phase-3-common-3dgs — plan-drafting — 2026-05-28

- **Stage:** plan-drafting (first Phase-3 sub-phase; re-frames v8 execution into the sub-phase cadence).
- **Landed at SHA:** commit chain `191df72` (K-2) → `598de5a` (probe) → `b6230663` (charter + audit + this file) → SHA-back-fill (COMMIT 4). Trunk-based to `main`; no PR; no tag (I7).
- **Verdict:** SHIFTED (plan ready for Stage 0 *with* two operator-pending Stage-0 gates + execution-model re-frame).
- **Artifacts:** charter `docs/phases/sub-phase-phase-3-common-3dgs.md`; probe `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md`; audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md`.
- **First sub-phase = task-1 common-3dgs** (§4.1 default; dependency-graph re-anchor confirms, no different-choice STOP).
- **Next stage should know:**
  - **Stage 0 is GATED by two operator-pending preconditions:** (a) Inria gaussian-splatting SHA must be pinned in §2 of `phase-3-plan.md` (all 5 external SHAs PENDING); (b) pre-dispatch-review `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md` must be filed. Do NOT vendor without the pinned SHA (Convention #8); do NOT dispatch without the review.
  - D-A (task-1-vs-task-2 sequencing), D-B (catalog stack-drift, per-sim), D-C (render determinism class), D-D (capture-writer), D-E (intermediate tag v0.2.2-sub-phase-phase-3-common-3dgs, lean YES) await operator routing — charter § 5.
  - §6.1 task prompt uses stale API names (`GaussianSet`/`forward_splat`) + branch ceremony — §3.2.1 `GaussianSplatModel`/`render` + trunk-based govern (charter §1.3).
  - K-2 fixed in `phase-3-plan.md` (7→0 stale golden-paths). S9-PHASE2-1/2/3 encoded into the Stage-2 landing-audit template (charter § 4).
- **Banked / forward:** Phase-4 pre-dispatch review is a separate operator track. Catalog Lenia B/E-vs-D drift routes at task-3/lenia plan-drafting.

## sub-phase-phase-3-common-3dgs — Stage 0 — 2026-05-28 — BLOCKED (STOP-B)

- **Stage:** Stage 0 (pre-flight + anchor re-check + external-SHA pin) — **halted at FIRST ACTION**.
- **Landed at SHA:** blocker audit committed to `main` (no PR; no tag, I7). HEAD at session start `da176e3` (== `origin/main`; plan-drafting chain tip, no successor — Convention M).
- **Verdict:** BLOCKED. **STOP-B** — Phase-3 pre-dispatch-review ABSENT (`docs/_audits/phase-3/pre-dispatch-review-*.md` does not exist; v9 amendment `docs/phases/phase-3-plan.md:34`).
- **Artifacts:** `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md`.
- **What did NOT run:** anchor probe (integrity Cat 1–5 / I1–I7 / verify_evidence sweeps), cross-phase replay `--prior-phase phase-2`, external-SHA pinning. No `phase-3-plan.md` §2 edit; no vendoring.
- **Operator action to unblock:** run the Phase-3 phase-plan-review session; land `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md` (spec § 7.4 Convention E-addendum). STOP-A (Inria + 4 other SHAs) is resolved by the agent at Stage-0 resumption per the coordinator-ratified delegation (2026-05-28) — NOT a separate operator commit.
- **On resumption:** fresh Stage-0 session re-runs FIRST ACTION (STOP-B → PASS), then full anchor probe + replay + 5-upstream SHA pinning per the original dispatch.

## sub-phase-phase-3-common-3dgs — Stage 0 — 2026-05-28 — CONFIRMED (supersedes BLOCKED)

- **Stage:** Stage 0 (pre-flight + anchor re-check + external-SHA pin) — **COMPLETE**. Resumed dispatch with **STOP-B removed** (operator-ratified 2026-05-28: pre-dispatch-review overhead retired; charter ratification substitutes).
- **Landed at SHA:** chain `c7c562e` (§2.18 SHA pins) → Stage-0 audit commit → SHA back-fill. Trunk-based to `main`; no PR; no tag (I7). HEAD at session start `e8c8d16` (== `origin/main`; BLOCKED chain tip, no successor — Convention M).
- **Verdict:** CONFIRMED. Anchor probe clean (integrity `c19492ad…d22cb52` byte-identical 0 HARD_FAIL / 14 SOFT_WARN; I1–I7 hold; verify_evidence 7/7 audits 0-fail; I7 test 16/16). Replay `--prior-phase phase-2` → `ok=True` 8/8. No STOP fired.
- **Artifacts:** Stage-0 audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md` (supersedes the BLOCKED audit, which stays append-only); §2.18 added to `docs/phases/phase-3-plan.md`.
- **5 external SHAs pinned (§2.18; all web-fetched + verified, Convention #8):** Inria gaussian-splatting `54c035f7` (main HEAD, no tags; **NON-COMMERCIAL license — first non-permissive upstream, binds task-8 + Phase-4 WU-C**); PhysGaussian `8339ed6a` (main HEAD; **NO LICENSE — cite-only here, task-8 must resolve**); Bender PBD `d0894bdb` (master HEAD; MIT); PhysicsNeMo `766e485a` (release v2.1.0; Apache-2.0); Chakazul/Lenia `adfc5429` (master HEAD; MIT). All security-advisory clean. No STOP-A.
- **Banked for operator (LFS):** R2 credentials absent in agent sessions + GitHub-LFS budget exhausted → the phase-2 replay worktree smudge failed; recovered by repopulating the local git-lfs object cache from verified working-tree content (OID==sha256, byte-identical). Future replays/worktree checkouts depend on this local-cache path until a backend is restored.
- **Next stage = Stage 1a (scaffold + RED).** Inherits: Inria SHA `54c035f7` (vendor `references/3DGS-reference/` at 1b, non-commercial clause binds); §3.2.1 API names (`GaussianSplatModel`/`render`/`Camera`/`load_ply`/`save_ply`); D-C (default bit-exact/same-stack-same-hw registry row at 1a, measure 1b); D-D (probe-discovered smoke-sim pattern; common-py PNG writer default).
