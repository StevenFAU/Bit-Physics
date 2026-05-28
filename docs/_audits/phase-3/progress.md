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
