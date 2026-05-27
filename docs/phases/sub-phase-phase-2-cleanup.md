---
date: 2026-05-27
author: phase-2-cleanup-plan-drafting-agent
sub_phase: sub-phase-phase-2-cleanup
phase: phase-2-tail
head_sha_at_draft: e1fc154ba026e8079740b86e7b0f8ffdb8e8f15b
version: charter-v1 (plan-drafting)
posture: >
  Basket hygiene sub-phase landing as a Phase-2-tail item after
  sub-phase-lfs-architecture (v0.2.1-sub-phase-lfs-architecture). NOT a coherent-
  architecture sub-phase: a basket of accumulated hygiene items — citation drift,
  convention amendments, deferred small follow-ups, doc-truth divergences — paid down
  before Phase 3 dispatches. Enumeration / categorization / ordering / surfacing-for-
  routing, NOT architectural design. Every execution commit preserves invariants
  I1-I7 (sub-phase-lfs-architecture), append-only audits, trunk-based, no agent-pushed
  tags (I7). DRAFT ONLY — Stages 0 / 1.A-1.G / 2 execute under operator-ratified
  D-class routings.
---

# Sub-phase: Phase-2 cleanup (basket) — CHARTER

> **This is a plan, not an execution.** Plan-drafting **SHIFTED-with-notes** means the
> probe + charter are sound and ready for Stage 0 dispatch *with two notes* (the
> precondition-5 deviation and UNKNOWN-2; see § 8). It does **not** mean any cleanup item
> is resolved. Every concrete claim is tagged FACT / INFERENCE and cites full repo-relative
> `path:line`. The exhaustive enumeration tables live in the probe report
> `tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md`; this charter
> summarizes and routes.

## § 1 — Scope and posture

**(FACT)** This sub-phase is a **basket**, not a coherent architecture. It pays down the
hygiene debt consolidated at Phase-2 close before Phase 3 dispatches. There is no unifying
architectural intent; the unit of work is *the cleanup item*, grouped into clusters by
file-set / type / risk.

**Item sources (FACT):**
- The Phase-2 § 13 consolidated banked-for-cleanup inventory —
  `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:316-363`, **41 distinct items**
  (operator "~41" estimate is **exact**; no STOP).
- 8 operator known-pre-queued items net-new beyond § 13 (probe § P2: K-2…K-6, K-7a/b/c).
- 4 probe-discovered items (probe § P3: PD-1…PD-4).
- **Total distinct items: 53**, of which ~6 are routed OUT (§ 9).

**Posture (FACT — non-negotiable):** Convention #8 (no fabrications; grep-verify every
claim); Convention M (re-anchor citations against HEAD before edit); append-only audits
(NEVER edit a published `docs/_audits/**` file — § 6 R-1); trunk-based commits to `main`;
I7 (no agent-pushed tags). Structurally lower-risk than an architecture sub-phase: no new
architecture, no new physics, no backend cutover.

## § 2 — Probe results synthesis

| Bucket | Count | Source |
|---|---|---|
| Phase-2 § 13 inventory | 41 | `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:316-363` |
| — of which RESOLVED upstream (verify-and-close) | 4 | § 13 #4, #7, #15, #34 |
| — of which routed OUT (sibling-sized) | ~6 | § 13 #8, #36, #37, #40, #9-residual, #29 (borderline) |
| Operator known-pre-queued (net-new) | 8 | probe § P2 |
| Probe-discovered (net-new) | 4 | probe § P3 |
| **Total distinct** | **53** | — |
| Clusters | 7 (A–G) | probe § P4 |
| D-class decisions | 6 (D1–D6) | § 5 |
| UNKNOWNs for Stage 0 | 2 | § 8 |
| Hard Rule 2 STOPs at plan-drafting | 0 | § 8 (precondition-5 → PROCEED) |

Full per-item tables (description, source, kind, effort, state, cluster) are in the probe
report § P1 / § P2 / § P3. Items probed-and-cleared (NOT items — e.g. `docs/common/numba.md`
exists; `solution_verification/` is an intentional scaffold; `mutation-testing.yml` matches
catalog § 41.4 T4) are listed in probe § P3.

## § 3 — Cluster catalog

Seven clusters, each → one execution stage. **Cluster F is verify-and-close** (near-zero
work). Items cited by their probe-report identifiers.

| Cluster | Theme | Items | Stage | Primary file-set | D-class |
|---|---|---|---|---|---|
| **A** | Citation & path drift | K-2 (§ 2.13 golden-path, 19 occ), PD-2 (README `python3`) | 1.A | `docs/phases/phase-{1,2,3}-plan.md`, `packages/*/README.md` | **D1** |
| **B** | Conventions / methodology doc reconciliation | § 13 #5,#6,#19,#21,#22,#23,#30,#31,#32,#33,#35; PD-3,PD-4; K-5 wording | 1.B | `docs/conventions/sub-phase-conventions.md`, `docs/methodology/*` | **D3** |
| **C** | CI / workflow / supply-chain hygiene | § 13 #1,#10,#11,#12,#13,#14,#16,#17,#28; K-3 (post-reset check) | 1.C | `.github/workflows/*`, `.pre-commit-config.yaml` | — (UNKNOWN-1) |
| **D** | Branch-protection & tag governance | K-6 (drift), K-4 (M0 no-op), PD-1 (I7 test), § 13 #41 | 1.D | `docs/ops/branch-protection.md`, `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | **D2** |
| **E** | Working-tree & doc-truth hygiene | § 13 #20,#24,#26,#27,#38 | 1.E | `.gitignore`, `CHANGELOG.md`, `captures/`, `common/common-cpp/tests/` | — |
| **F** | Verify-and-close (already-resolved) | § 13 #4,#7,#15,#34, #9-landed | 1.F | (verification only) | — |
| **G** | Methodology / synthesis-report dispositions | K-7a (CODEOWNERS), K-7b (ADR), K-7c (diff-testing), § 13 #2,#3,#18,#39; S9-PHASE2-x | 1.G | `docs/architecture.md`, `docs/methodology/*`, new `CODEOWNERS` | **D4, D5, D6** |

## § 4 — Cluster execution order and dependency graph

```
            (Stage 0 ratifies D-class routings)
                          │
        ┌─────────┬───────┼───────┬─────────┬─────────┐
        ▼         ▼       ▼        ▼         ▼         ▼
      1.F       1.C     1.E      1.A       1.B ◄──── 1.D
   (close)   (CI/wf)  (tree)  (cite/D1)  (conv) │  (branch/tag)
                                                 │     │
                                  K-5 (§ D.2 wording) ─┘
                                  PD-1 (I7 test) couples to K-5
                          │
                    (Stage 2 landing)
```

**(FACT/INFERENCE)** No hard ordering among 1.A / 1.C / 1.E / 1.F — disjoint file sets,
runnable in any order. **Soft dependency 1.D → 1.B:** K-5 (§ D.2 wording, in 1.B) and PD-1
(I7-test fix, in 1.D) are two faces of one finding; **lean: 1.D first**, then 1.B encodes the
ratified wording, avoiding a second touch of § D.2. **1.G last** (heaviest D-class load;
running last surfaces scope-creep before landing). Stage 0 precedes all; Stage 2 follows all.
The agent at each cluster stage decides commit boundaries within the stage (Convention #12;
one commit per cluster-theme is the lean, **not** one per occurrence — § 6 R-4).

## § 5 — D-class decisions (operator routing required)

Each carries a default lean + rationale + decision-by stage. None may be unilaterally inverted
by an execution stage.

### D1 — § 2.13 golden-path drift scope
- **Question:** fix executed plans (`phase-1-plan.md`, `phase-2-cross-stack-replication.md`)
  only? also the **unexecuted** `phase-3-plan.md` (7 occ)? or leave phase-3 for its own
  plan-drafting to re-anchor at Phase-3 dispatch?
- **Lean:** fix the two executed plans now (12 occ); **leave `phase-3-plan.md` for Phase-3
  plan-drafting** (prior routing; Convention M re-anchors unexecuted plans at their dispatch — § 6 R-2).
- **Decision-by:** Stage 0 (then Stage 1.A executes).

### D2 — Branch-protection live-vs-spec drift
- **Question:** live state is **nothing configured** (`gh api …/branches/main/protection` → 404;
  `…/tags/protection` → 404). Implement the live rules to match `docs/ops/branch-protection.md`,
  OR amend the doc to match live state?
- **Lean:** the doc's own closing rule (`docs/ops/branch-protection.md:99-102`) says "synced
  GitHub state wins; the doc is amended" → **amend doc**. BUT force-push / deletion / tag
  protection are real security posture the operator may prefer to **apply**. **Operator routes**
  (agent can only perform the doc edit; GitHub-settings changes are operator-only). M0 (K-4)
  closes as a confirmed no-op either way (no required checks exist to remove).
- **Decision-by:** Stage 0.

### D3 — § D.2 amendment wording (intermediate-tag conditions)
- **Question:** § D.2 (`docs/conventions/sub-phase-conventions.md:245-249`) already frames an
  optional non-phase point-release tag as "a banked operator decision," lean **NO**. What wording
  clarifies *when* a tag IS appropriate?
- **Lean (agent draft for operator ratification):** "Lean remains NO, **except** infrastructure
  sub-phases that add an external dependency (e.g. R2 / LFS backend) where a point-release handle
  aids rollback and citation; precedent `v0.2.1-sub-phase-lfs-architecture` (no `-phase-N` segment;
  satisfies I7 / spec § 7.12)." Couples to PD-1 (the I7 test must permit operator non-phase tags).
- **Decision-by:** Stage 0 → Stage 1.B / 1.D.

### D4 — CODEOWNERS agent-id sentinel granularity (synthesis item 5)
- **Question:** per-package, per-sim, or per-stack?
- **Lean:** **per-package** (matches the 23-member workspace + `packages/*` boundary); agent-id
  sentinels as comment markers, **not** enforced reviewers (no live branch protection — D2).
- **Decision-by:** Stage 0 → Stage 1.G.

### D5 — ADR alignment (synthesis item 6)
- **Question:** introduce an ADR directory now, or defer the scaffolding and only cross-reference?
- **Lean:** **defer the directory**; add a doc cross-reference mapping the four-state verdicts
  (`docs/architecture.md:1442,1476`: CONFIRMED/SHIFTED/REFUTED/DEFERRED) ↔ Nygard ADR states.
  Standing up an ADR corpus is sibling-sized.
- **Decision-by:** Stage 0 → Stage 1.G.

### D6 — Differential-testing terminology (synthesis item 8)
- **Question:** cross-reference in docs only, or rename test files / classes?
- **Lean:** **cross-reference only** (dispatch: "cross-reference, don't rename mechanically"); add
  a glossary note linking "matched-pair gate" (gate-14 shape-(a) bit-exact,
  `docs/conventions/sub-phase-conventions.md:766-790`) ↔ "differential testing."
- **Decision-by:** Stage 0 → Stage 1.G.

## § 6 — Risk register

- **R-1 (published-audit append-only).** NEVER edit a published `docs/_audits/**` file. § 13 #8
  (capture regen) and #20 (CHANGELOG reorg) are nearest the line — #8 routed OUT (§ 9); #20
  touches `CHANGELOG.md` (not an audit) so is safe. **A stage that must edit a published audit → STOP.**
- **R-2 (unexecuted phase plans).** `phase-3-plan.md` is unexecuted; prior routing = its own
  plan-drafting re-anchors at Phase-3 dispatch. Do not touch without D1 routing.
- **R-3 (oversized items).** § 9 items must not be absorbed. If a Cluster-G item (esp. § 13 #29
  f64 controls, #2/#3 methodology consolidation) grows code-bearing, STOP and route.
- **R-4 (citation re-anchoring at scale).** K-2 = 19 occ across ≥2 files. One commit per
  cluster-theme, not one per occurrence; re-anchor against HEAD before edit (Convention M).
- **R-5 (integrity baseline + cat1/cat4).** Probe report lives under `tools/testkit/probes/`
  (cat1.intra-repo full-path scan); charter + audits under `docs/` (cat4 draft-time). Run
  `integrity --all --mode strict` + `verify_evidence` before each commit; baseline
  `c19492ad…d22cb52` (0 HARD_FAIL / 14 SOFT_WARN) must hold (regress → STOP).
- **R-6 (CI red is expected pre-reset).** `cpp-strict`/`python-strict` red until the
  May 31/Jun 1 LFS-quota reset (UNKNOWN-1). Do not claim a green Cluster-C verification before
  the reset; do not mistake pre-reset red for a cleanup regression.

## § 7 — Stage decomposition

Non-standard basket cadence: plan-drafting (this session, 4 commits) → Stage 0 (anchor re-check
+ D-class ratification) → Stages 1.A–1.G (one per cluster, any order per § 4) → Stage 2 (landing).

### Stage 0 — anchor re-check + D-class ratification (~3 commits)
- **Entry preconditions:** HEAD = this plan-drafting chain or successor; tag
  `v0.2.1-sub-phase-lfs-architecture` on origin; integrity baseline held; verify_evidence on
  this plan-drafting landing PASS.
- **Probe shape:** lightweight — re-anchor citations against HEAD (Convention M); resolve
  UNKNOWN-2 (operator confirms PROCEED vs hard-STOP on the I7-test deviation); record post-reset
  CI state if the reset has passed, else carry UNKNOWN-1.
- **Deliverables:** ratify D1–D6 routings into the charter (amendment block, lfs-charter
  precedent); Stage-0 checkpoint audit.
- **Acceptance:** all D-class routed or explicitly deferred; invariants I1–I7 hold; baseline held.
- **Failure response:** if a routing reveals an item is sibling-sized → STOP, route to § 9.
- **Exit state:** D-class LOCKED; cluster stages dispatchable.

### Stages 1.A – 1.G — cluster execution (one stage per cluster)
- **Entry preconditions:** Stage 0 exit; the cluster's D-class (if any) LOCKED; baseline held.
- **Probe shape:** lightweight per item — re-verify the item still holds at HEAD before editing
  (items may have been resolved by an interleaving operator push).
- **Deliverables:** the cluster's items resolved; per-cluster checkpoint audit; commit
  boundaries chosen by the stage (one commit per theme is the lean — R-4).
- **Acceptance:** each item resolved (or explicitly re-deferred with rationale); invariants hold;
  integrity baseline `c19492ad…d22cb52` holds; verify_evidence PASS; for Cluster C, no green-check
  claimed before the reset (R-6).
- **Failure response:** an item that turns out larger than cleanup-shaped → **STOP**, surface,
  route to § 9 (do NOT absorb). An item requiring a published-audit edit → **STOP** (R-1).
- **Exit state:** cluster items closed; cumulative shift count updated.

### Stage 2 — landing audit + cumulative close (~3 commits)
- **Entry preconditions:** all dispatched cluster stages exited; baseline held.
- **Probe shape:** invariant verification sweep (I1–I7), D-class disposition table, integrity +
  verify_evidence + append-only sweeps (lfs-architecture Stage-2 shape).
- **Deliverables:** sub-phase landing audit; D-class disposition table; banked lessons
  (cleanup-specific); SHA back-fill.
- **Acceptance:** invariants hold; integrity baseline held; verify_evidence on all sub-phase
  audits PASS + prior audits no-regression; § M cumulative count reconciled (if Cluster B touched it).
- **Failure response:** STOP on any invariant / baseline regression.
- **Exit state:** sub-phase landed. **No v-tag** by default (cleanup is steady-state hygiene, not
  external-dependency-adding infrastructure). Revisit at Stage 2 only if a D-class surfaces a
  tagging reason; the tag, if any, is operator-pushed (I7).

## § 8 — Open questions / forward-routing

- **UNKNOWN-1 (post-reset CI green-check).** Today (2026-05-27) is before the May 31/Jun 1
  LFS-quota reset; `cpp-strict` + `python-strict` are red (expected). Stage 0/Cluster C verifies
  the green-check **after** the reset and documents it; if still red post-reset, that is diagnostic
  for R2 routing → separate small dispatch (known item 3).
- **UNKNOWN-2 (precondition-5 deviation disposition).** `pytest tools/testkit/lfs_migration/` is
  15 passed / 1 failed: `test_i7_no_agent_tags.py::test_no_tag_points_into_subphase_range` is red
  because the operator legitimately pushed `v0.2.1-sub-phase-lfs-architecture` (no `-phase-N`
  segment; I7 substantively HOLDS — `docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md:451-454`).
  Plan-drafting verdict is **SHIFTED-with-notes** on this basis. **Stage 0 confirms PROCEED** (fix
  the over-strict test in Cluster D / PD-1) **vs operator-elects hard-STOP.** Full analysis: probe § 0.1.
- **Forward-routing:** § 9 items routed to sibling sub-phases / Phase 3+. Any spec amendment
  (e.g. a tagging-policy clause into spec § 7) is operator-approved + separate-commit only.
- **No intermediate tag** for this sub-phase by default (§ 7 Stage 2; conventions § D.2 lean).

## § 9 — Items deferred OUT of cleanup (candidate sibling sub-phases)

**(FACT/INFERENCE)** These surfaced as sub-phase-sized in their own right. Surfaced for operator
routing; **not absorbed** (dispatch Hard Rule 2 — "do NOT absorb"). Detail: probe § P3.X.

| Item | Why too big | Routing lean |
|---|---|---|
| § 13 #36 — multi-material MPM extension | Real feature + physics + new invariants | Sibling sub-phase / Phase 3+ |
| § 13 #37 — Phase-1 open items B2–B6/B11/B16 + DFSPH generator | Multi-item Phase-1 implementation backlog | Dedicated Phase-1-backlog sub-phase |
| § 13 #8 — mid-Phase-1 capture regeneration | Large; risks published-audit-anchored hashes (R-1) | Sibling sub-phase w/ append-only protocol |
| § 13 #40 + #9-residual — MPM `mls_mpm.py` mutation completion + Cat-3 evaluator shims + mutmut characterization | Mutation-test authoring | **Testing-improvements sub-phase** |
| § 13 #29 (borderline) — D16 f32→f64 float-controls | Code change to `assert_deterministic_float_controls()` + Q-CPP2; design-bearing | Operator: cleanup Cluster G *or* sibling |

> **Flag (not a STOP).** The Phase-2 § 13 inventory is **exactly 41** items — matches the
> operator's "~41" estimate; no discrepancy to surface.
