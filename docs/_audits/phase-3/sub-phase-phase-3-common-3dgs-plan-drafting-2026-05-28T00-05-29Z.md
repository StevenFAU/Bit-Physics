---
date: 2026-05-28T00-05-29Z
author: phase-3 plan-drafting (Claude Code)
subject: Phase 3 first sub-phase plan-drafting — common-3dgs
verdict: SHIFTED
head_sha: b6230663b1d674a8114179a4ebf3338bfaf013ca
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  probe: docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md
  charter: docs/phases/sub-phase-phase-3-common-3dgs.md
evidence_hashes:
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md: sha256:571cf15e5749699dff8099ffb82bb8c99f76ceb67fd24722b094189111d830f3
  docs/phases/sub-phase-phase-3-common-3dgs.md: sha256:baacf95280042684ae38b9336b0a00cab8d582b7eb4514d71bb5c9cdd224f1e4
banked_consumed:
  - K-2 (phase-3-plan.md golden-path drift, 7 occurrences grep-verified, cleanup-banking D1)
  - S9-PHASE2-1/2/3 (phase-close-mechanics refinements, cleanup-banking, encoded into Stage-2 template)
d_class_surfaced:
  - D-A first-sub-phase sequencing task-1 vs task-2 (lean — hold task-1 per §4.1)
  - D-B catalog↔plan stack-assignment drift (lean — per-sim at dispatch; catalog not edited; does not gate common-3dgs)
  - D-C common-3dgs render determinism class §3.2.5 (lean — measure; default bit-exact/same-stack-same-hw)
  - D-D neural-rendered capture-writer §3.2.3 (lean — follow discovered smoke-sim pattern)
  - D-E intermediate tag v0.2.2-sub-phase-phase-3-common-3dgs (lean — YES; §D.2 (a)+(b); operator-pushed)
---

# Plan-drafting landing audit — sub-phase-phase-3-common-3dgs

**Verdict: SHIFTED.** The plan is ready for Stage 0 dispatch *with two operator-pending
Stage-0 gates and an execution-model re-frame*. SHIFTED — not CONFIRMED — because (1) Stage-0
dispatch is gated by two operator-pending preconditions (Inria gaussian-splatting SHA pin;
pre-dispatch-review), (2) the v8 single-agent-sequential execution model (phase-3-plan §4–§9)
is re-framed into the matured per-sub-phase cadence, and (3) multiple D-class routings + §6.1
internal drift are surfaced. It does **NOT** mean common-3dgs exists. No HARD RULE 2 STOP
fired against plan-drafting itself; the SHA-pin STOP is filed as a Stage-0-dispatch blocker.

## § 1 — Commit chain (this plan-drafting session)

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | K-2 golden-path fix | `docs/phases/phase-3-plan.md` | `191df7209866c6b178265b7dcc4bc05099f7abd9` |
| 2 | probe report | `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md` | `598de5a81ab1403f5906ecb526d01e54ee35d61b` |
| 3 | charter + this audit + progress.md init | `docs/phases/sub-phase-phase-3-common-3dgs.md` + this file + `docs/_audits/phase-3/progress.md` | `b6230663b1d674a8114179a4ebf3338bfaf013ca` (this commit; head_sha back-filled here in COMMIT 4 per Convention #12) |
| 4 | SHA back-fill | this audit (`head_sha` + commit-3 row) | terminal artifact (coordinator summary) |

Probe sha256 `571cf15e…30f3`; charter sha256 `baacf952…f1e4` — both recorded in front-matter
`evidence_hashes` and verifiable by `verify_evidence` at this audit's back-filled `head_sha`
(= commit-3 SHA, where probe + charter both exist).

## § 2 — Anchor-probe state checks (FACT)

All re-run at HEAD `44cc8cb` (== the cleanup Stage-2 back-fill; `git rev-parse HEAD` ==
`git rev-parse origin/main`; no successor commit — Convention M, HEAD wins):

| Check | Result |
|---|---|
| Tags `v0.0.0-phase-0` / `v0.1.0-phase-1` / `v0.2.0-phase-2` / `v0.2.1-sub-phase-lfs-architecture` | all resolve (`727ffb9b` / `99085650` / `fd214456` / `8f4dea30`) |
| Integrity Cat 1–5 sweep | **0 HARD_FAIL / 14 SOFT_WARN**; full-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline |
| I2 bit-identity replay (`--prior-phase phase-1`) | `ok=True`, 8/8 gates PASS |
| verify_evidence — phase-0 landing | 20 pass / 0 fail |
| verify_evidence — phase-1 landing | 36 pass / 0 fail |
| verify_evidence — phase-2 landing | 7 pass / 0 fail |
| verify_evidence — lfs-architecture sub-phase landing | 24 pass / 0 fail |
| verify_evidence — phase-2-cleanup sub-phase landing | 24 pass / 0 fail |
| I7 invariant test (`pytest tools/testkit/lfs_migration/`) | 16 passed |
| K-2 occurrence count (`grep -c` in phase-3-plan.md) | **7** (matches coordinator banking; no STOP) |

**Invariants I1–I7 hold at HEAD.** I3 (integrity baseline) byte-identical; I2 (replay) ok=True;
I1 (verify_evidence) no-regression on all 5 prior landings; I4 (append-only) — no published
audit edited; I6 (Convention #12) — back-fill is commit 4; I7 (no agent-pushed tags) — test
16/16 + this session pushes no tag.

## § 3 — First-sub-phase determination (dependency-graph re-anchor)

The §3.1 deliverable map (`docs/phases/phase-3-plan.md:263-276`) has two co-equal hard-blocking
infrastructure roots — task-1 common-3dgs (blocks task-8) and task-2 render-similarity (blocks
task-6 + task-8). Neither depends on the other; the graph is indifferent between them. §4.1
(`docs/phases/phase-3-plan.md:681-712`) breaks the tie toward **task-1 common-3dgs** by
"dependencies first" + listing order. The re-anchor produces **no different conclusion** → the
HARD RULE 2 "first-choice-differs" STOP does **not** fire; task-1 common-3dgs is the first
sub-phase. The task-1-vs-task-2 ordering carries a material asymmetry (task-1's Stage 0 is
SHA-gated, task-2's is not) surfaced as **D-A** for operator routing — not improvised.

## § 4 — Stage-0 gates (operator-pending; do NOT block this plan-drafting)

Per the dispatch, these gate the first sub-phase's **Stage-0 dispatch**, not plan-drafting:

- **GATE STOP-A — Inria gaussian-splatting SHA PENDING.** The v8 block
  (`docs/phases/phase-3-plan.md:52-57`) requires the owner to pin five external SHAs in §2;
  grep of §2 (`docs/phases/phase-3-plan.md:180-255`) finds **zero hex SHAs** (§2.3 `:194`, §2.4
  `:198` say "at pinned SHA" with no value). common-3dgs Stage 0 vendors `references/3DGS-reference/`
  at the Inria SHA — **operator pins it in §2 (separate operator-approved commit) before
  Stage-0 vendoring**; Convention #8 forbids fabricating it. The other four SHAs (PhysGaussian,
  Bender, PhysicsNeMo, Lenia-ref) gate later sims.
- **GATE STOP-B — pre-dispatch-review ABSENT.** `docs/_audits/phase-3/pre-dispatch-review-*.md`
  does not exist; the v9 PHASE-PLAN-REVIEW amendment (`docs/phases/phase-3-plan.md:34`) requires
  it before the first dispatch (first-of-kind components). **Operator files it before Stage-0
  dispatch.**

## § 5 — D-class surfaced (default leans; operator routes)

See charter § 5 for full rationale. D-A sequencing (lean hold task-1); D-B catalog stack-drift
(lean per-sim; Lenia B/E-vs-D `docs/planning/bit-physics-master-catalog.md:4683` vs
`docs/phases/phase-3-plan.md:155` is the exemplar; catalog not edited; does not gate common-3dgs);
D-C render determinism class (lean measure, default bit-exact/same-stack-same-hw); D-D
neural-rendered capture-writer (lean follow discovered pattern); D-E intermediate tag
`v0.2.2-sub-phase-phase-3-common-3dgs` (lean YES, §D.2 (a) external dep + (b) durable arch;
operator-pushed, I7 allowlist extension required).

## § 6 — Banked items consumed (Convention M)

- **K-2** (cleanup-banking D1, `docs/phases/sub-phase-phase-2-cleanup.md:48,176-179`): the 7
  stale `tools/testkit/code_verification/golden/` occurrences in `phase-3-plan.md` (count
  grep-verified = 7) canonicalized to `tools/testkit/golden/` in **commit 1** (`191df72`),
  surgical path-segment-only, mirroring cleanup Stage-1.A's executed-plan fix (`c58d4ab`).
- **S9-PHASE2-1/2/3** (cleanup-banking, `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-g-checkpoint-2026-05-27T22-51-18Z.md:56`):
  phase-close-mechanics refinements **encoded into the charter's Stage-2 landing-audit template**
  (charter § 4) — (1) independent-sub-phase consolidation model is native to the matured cadence;
  (2) supernumerary-tolerant spec-§11.4-vs-execution reconciliation; (3) no `project-state.md` /
  `check_append_only` anchors (CHANGELOG + per-stage audits for status; `git diff --name-status`
  for append-only). Lineage from `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:73,101,171`.

## § 7 — §6.1 internal drift surfaced (re-framed, not edited into phase-3-plan.md)

Probe §4 / charter §1.3: §6.1's stale API names (`GaussianSet`/`forward_splat`,
`docs/phases/phase-3-plan.md:1032,1037`) are superseded by §3.2.1 (`GaussianSplatModel`/`render`,
`docs/phases/phase-3-plan.md:284-301`, v4/v8 amendment-2 `:63`); §6.1's branch/PR ceremony
(`:1021-1023,1104-1110`) is superseded by the v8 trunk-based amendment (`:46`) + the matured
cadence. The charter follows the governing forms; `phase-3-plan.md` is NOT edited beyond the
K-2 fix (D1's narrow carve-out — the unexecuted plan's per-sim re-anchoring happens at each
sim's own dispatch).

## § 8 — Forward-routing

- **Operator-pending (gate Stage-0 dispatch):** STOP-A (Inria SHA pin in §2), STOP-B
  (pre-dispatch-review), D-A (task-1 vs task-2). None block this plan-drafting.
- **Phase-4 pre-dispatch review** — separate operator-pending track; not this session.
- **Subsequent Phase-3 sub-phases** re-framed under this cadence at their own plan-drafting;
  §4.1 (`docs/phases/phase-3-plan.md:681-701`) is the default order; D-B re-anchored per-sim.
- **No tag from this session** (plan-drafting is not a landing; I7).
