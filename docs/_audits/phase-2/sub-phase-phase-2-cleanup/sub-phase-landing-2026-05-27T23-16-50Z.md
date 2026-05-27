---
date: 2026-05-27T23-16-50Z
author: phase-2-cleanup-stage-2-landing-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-stage-2-landing
stage: stage-2-sub-phase-landing
verdict: CONFIRMED-sub-phase-landing
head_sha: abf077c31a642580c16de3a0ef9ae0ec5dbd7b8c
head_sha_at_checkpoint: abf077c31a642580c16de3a0ef9ae0ec5dbd7b8c
evidence_paths:
  - docs/phases/sub-phase-phase-2-cleanup.md
  - tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-0-checkpoint-2026-05-27T20-29-08Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-a-checkpoint-2026-05-27T20-56-32Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-c-checkpoint-2026-05-27T22-06-35Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-e-checkpoint-2026-05-27T22-20-04Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-f-checkpoint-2026-05-27T22-22-25Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-d-checkpoint-2026-05-27T22-28-49Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-b-checkpoint-2026-05-27T22-40-20Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-g-checkpoint-2026-05-27T22-51-18Z.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md
evidence_hashes:
  docs/phases/sub-phase-phase-2-cleanup.md: sha256:57c8306a12dc4424b4422f2b336cf72488e728c1ae76cd6046de3eeba8c84aa9
  tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md: sha256:f090fde24c3a091a59ace74dc249b5f3ddfb9b4332f1b458c7fa1e89a9e1da8c
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md: sha256:dd12772f8fee16bc3e044f5f1082425e47ce0e7c42d89dfb6c4c8bd07da5b0f8
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-0-checkpoint-2026-05-27T20-29-08Z.md: sha256:bec71a9b627c56e555edb72130b904bc5c40d0a181b4918e51b21ad8e09266a4
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-a-checkpoint-2026-05-27T20-56-32Z.md: sha256:70262edea5f005dffec76e2900216067f6e750e7ebcc3d5242120714bd08a030
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-c-checkpoint-2026-05-27T22-06-35Z.md: sha256:ab9fc24d1ddc2ab90bf3ff141d6a398243049667904de7b3a453b3b45318e3ca
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-e-checkpoint-2026-05-27T22-20-04Z.md: sha256:725c473c991987ac9539b4a9d4749d6417eff5ec7ca1c6de20e856d4abda8a54
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-f-checkpoint-2026-05-27T22-22-25Z.md: sha256:937bb27b3537b2b090ae4954cb77092045dba0f1420bedc5ac3d2ff8c269b5a2
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-d-checkpoint-2026-05-27T22-28-49Z.md: sha256:f67390b782d1c3c5575c03f207b717b5490628f66d9a2614b92cab516716301a
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-b-checkpoint-2026-05-27T22-40-20Z.md: sha256:7d3d21a4ca8483555980b4a8d16d7c948b86ea222b04dd7a899211f09b9876a5
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-g-checkpoint-2026-05-27T22-51-18Z.md: sha256:7a2033d7a11a45f3a8a2ad68f8947d1e655ee2a81e553e79b30cb950e33f8da6
  docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md: sha256:3ef3f05f7e2e08ed922e8cbd21d75377a035b0f2f8a035152303aa1eaf0cfcf5
deferred_items:
  - "#10 actionlint not installed — DEFER-OUT to an infra/CI-tooling sub-phase (1.C)"
  - "#17 mypy --strict Warp partial-stub errors (93 errors / 9 files) — DEFER-OUT to a typing/testing-improvements sub-phase (1.C)"
  - "#28 cpp-strict Mesa/LLVM-pin + exact-digest scoping — DEFER-OUT to a CI-determinism sub-phase (1.C)"
  - "#27 tests/sha256_util.hpp shim — DEFER (removal gate unmet; removable once common-cpp-bootstrap Stage-1a audits are historical) (1.E)"
  - "#3 cross-stack methodology FULL-consolidation — DEFER-OUT to a methodology-consolidation sibling sub-phase (1.G)"
  - "#18 D17 Phase-1-canonical re-characterization / 2D-reference — DEFER to a standalone operator-decision dispatch (1.G)"
  - "K-3 post-reset CI green-check — DEFER to a small post-reset follow-up dispatch (early June) (1.C)"
  - "PD-4 conventions lettered-section ordering (§P) — DEFER as cosmetic; revisit at a conventions-doc-restructure pass (1.B)"
  - "S9-PHASE2-1/2/3 phase-close-mechanics refinements — DEFER to Phase-3 plan-drafting Convention-M consumption (1.G)"
  - "K-2 phase-3-plan.md (7 occ) golden-path drift — DEFER to Phase-3 plan-drafting Convention-M re-anchor (D1 carve-out) (1.A)"
  - "#20-residual CHANGELOG release-section promotion workflow — DEFER to a release-management dispatch (1.E)"
  - "#9-residual Cat-3 evaluator shims + mutmut characterization (reconciles #25 + #40) — DEFER-OUT to a testing-improvements sibling sub-phase (1.F)"
ci_activation: []
top_level_deps_to_merge: []
---

# Sub-phase landing audit — sub-phase-phase-2-cleanup — CONFIRMED

**Verdict: CONFIRMED-sub-phase-landing.** This is the formal close of
`sub-phase-phase-2-cleanup` per the phase-2 § 2.12 closing-audit mechanism, scoped to a single
sub-phase. The hygiene work landed across the Stage-1 cluster arc (1.A → 1.C → 1.E → 1.F → 1.D
→ 1.B → 1.G); Stage 2 synthesizes, verifies, and closes. Every named invariant (I1–I7) is
re-verified PASS at HEAD `abf077c`; every D-class decision (D1–D6) and probe-finding (PD-1–PD-4)
carries a clean cumulative disposition consistent with the charter § 5 / Stage-0 amendment and
the cluster checkpoints at HEAD; the execution-arc lessons are banked with their structural
patterns named. No further charter amendment is required to close cleanly. **No v-tag** is
pushed at close (charter § 7 + the § D.2 amendment from Cluster 1.D: cleanup is steady-state
hygiene, not external-dependency-adding infrastructure — it meets none of the three
intermediate-tag conditions).

The sub-phase's load-bearing result: **the Phase-2 § 13 banked-for-cleanup inventory (41 items)
plus 8 operator-known-pre-queued items and 4 probe-discovered items — 53 distinct items — is
fully dispositioned**, with 11 candidate sibling sub-phases / operator-decision dispatches /
Phase-3 routings surfaced and banked for forward scheduling. No item is dropped. Phase 3
dispatch is now the next major scheduling decision (§ 10).

---

## § 1 — Sub-phase scope + narrative arc

(FACT — charter § 1.) `sub-phase-phase-2-cleanup` is a **basket**, not a coherent-architecture
sub-phase: it pays down the hygiene debt consolidated at Phase-2 close (citation drift,
convention amendments, deferred small follow-ups, doc-truth divergences) before Phase 3
dispatches. The unit of work is *the cleanup item*, grouped into seven clusters (A–G) by
file-set / type / risk. There is no new architecture, no new physics, no backend cutover; every
execution commit preserves invariants I1–I7, append-only audits, trunk-based commits, and the
no-agent-pushed-tags rule (I7).

**Item sources (FACT — charter § 1 / § 2):**
- Phase-2 § 13 consolidated banked-for-cleanup inventory (`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:316-363`) — **exactly 41 distinct items** (the operator "~41" estimate is exact).
- 8 operator-known-pre-queued items net-new beyond § 13 (probe § P2: K-2, K-3, K-4, K-5, K-6, K-7a, K-7b, K-7c).
- 4 probe-discovered items (probe § P3: PD-1, PD-2, PD-3, PD-4).
- **Total distinct items: 53.**

**Narrative arc (plan-drafting → Stage 0 → 7 clusters in execution order 1.A → 1.C → 1.E → 1.F → 1.D → 1.B → 1.G → Stage 2):**

- **Plan-drafting (SHIFTED-with-notes; `71483f1`/`4dac480`/`95a24d9`/`1f4e159`).** Probe (53-item enumeration) + charter + landing + back-fill. **SHIFTED-with-notes** on two grounds: the precondition-5 deviation (`pytest tools/testkit/lfs_migration/` was 15/1 because the operator legitimately pushed `v0.2.1-sub-phase-lfs-architecture`, an over-strict proxy test = PD-1, not a real I7 violation) and UNKNOWN-2 (PROCEED-vs-hard-STOP routing for that deviation). 53 items enumerated; ~6 already routed OUT at plan-drafting (§ 9).
- **Stage 0 (CONFIRMED-Stage-0; `ee2d952`/`807042c`/`94c1149`).** Operator ratified all D-class routings (D1–D6) into the charter amendment block; UNKNOWN-2 resolved (PROCEED — PD-1 fix routed to 1.D); UNKNOWN-1 (post-reset CI green-check) carried to Cluster C; § 13 #29 (borderline f32→f64 controls) explicitly joined the deferred-OUT set. D-class LOCKED; cluster stages dispatchable.
- **Stage 1.A (CONFIRMED; `c58d4ab`/`e91a5eb`/`cc3f857`/`1a312db`).** Cluster A (citation & path drift). K-2 § 2.13 golden-path drift fixed in the two executed plans; **phase-3-plan.md (7 occ) deferred** to Phase-3 plan-drafting (D1 carve-out, documented). PD-2: 11 package READMEs standardized to `uv run`.
- **Stage 1.C (SHIFTED-with-notes; `caafdc9`/`1f4d946`/`f4c1271`).** Cluster C (CI / workflow / supply-chain hygiene). **SHIFTED** as a scope re-shape (not an execution failure): of 9 clustered items, only #12 (SHA-pin 3 actions) + #14 (version-fetch methodology) were cleanup-shaped; #11/#13/#16 VERIFY-CLOSE; #1 STAYS-BANKED (R-1); #10/#17/#28 DEFER-OUT (sub-phase-sized); K-3 CARRY (post-reset). Two operator-ratified STOP-and-surface events. Banked lesson **L-CLEANUP-1**.
- **Stage 1.E (CONFIRMED; `3216b2e`/`eddd86e`/`9061d70`/`ede4887`).** Cluster E (working-tree & doc-truth hygiene). #20 (CHANGELOG byte-exact 7-section relocation to `[Unreleased]`), #24 (gitignore stray artifacts), #26 (`project-state.md` doc-truth note) RESOLVED; #38 VERIFY-CLOSE; #27 DEFER (gate unmet); #20-residual release-section workflow banked.
- **Stage 1.F (CONFIRMED; `b8b43f2`/`c4b75a8`).** Cluster F (verify-and-close). **No substantive commits** (verification-only): § 13 #4, #7, #15, #34, and the #9-landed portion CLOSED with evidence-of-resolution; M0 (mutation re-tier required-check removal) confirmed no-op (branch not protected, 404). #9-residual stays deferred-OUT.
- **Stage 1.D (CONFIRMED; `6674bc6`/`d861274`/`3c9d926`/`cd9e52e`/`7aedd16`).** Cluster D (branch-protection & tag governance). D3 (§ D.2 intermediate-tag conditions: default-NO + 3 exceptions + precedent), **PD-1 (I7 guard re-encoded — declarative operator-sanctioned-tags allowlist; pytest 15/1 → 16/0**, the precondition-6 deviation RESOLVED), D2 (branch-protection live-state amendment), K-4/M0 (no-op), § 13 #41 (via D3) RESOLVED.
- **Stage 1.B (CONFIRMED; `416828f`/`6ff65db`/`e2fd285`/`b82c35e`).** Cluster B (conventions / methodology reconciliation). § 13 #19, #21, #22, #23, #30, #31, #32, #33, #35 RESOLVED (§ M reconciled, running tally 242; new § L.10 coordinator-drift + baseline-digest formalizations; § L.7 title-scope; methodology § 6 title; gate-12 perf-row Stage-1b acceptance); #5/#6 VERIFY-CLOSE; K-5 satisfied at 1.D; PD-3 closed; PD-4 deferred (cosmetic).
- **Stage 1.G (SHIFTED-with-notes; `99226cf`/`4a0ad25`/`42c7df3`/`abf077c`) — FINAL Stage-1 cluster.** Cluster G (synthesis-report dispositions + methodology). D4 (per-package CODEOWNERS, latent), D5 (ADR-verdict↔Nygard intention-note in § L.11, no directory), D6 (differential-testing cross-ref, conventions + catalog § 50.1), #39 + S-P2AR1 + S-P2AR2 (§ L.12 banked ESTABLISHED precedents) RESOLVED; #2 VERIFY-CLOSE; #3 / #18 / S9-PHASE2-1/2/3 DEFER. **SHIFTED** because the last-cluster scope-creep surface (the methodology triage) forward-routed three items with operator-ratified rationale.
- **Stage 2 (this audit, CONFIRMED-sub-phase-landing).** Closing audit + cumulative disposition synthesis + back-fill.

---

## § 2 — Cumulative SHA ledger (the sub-phase chain, in order)

Every commit on the sub-phase's own chain (`v0.2.1-sub-phase-lfs-architecture..HEAD`, **excluding**
the two lfs-architecture Stage-2 tail commits `5bc2baf`/`e1fc154` that precede the cleanup
plan-drafting), in order, with the cluster verdict at landing. **33 commits.** The authoritative
ledger source is `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md`; this section
is a synthesis view. Peer chains (mutation re-tier, golden-path) are cited in § 9 and are **not**
part of this ledger.

### Plan-drafting (4 commits) — verdict: SHIFTED-with-notes

| # | SHA | Title |
|---|---|---|
| 1 | `71483f1` | test(probe): sub-phase-phase-2-cleanup plan-drafting enumeration |
| 2 | `4dac480` | docs(phase-2-cleanup): plan-drafting charter |
| 3 | `95a24d9` | docs(phase-2-cleanup): plan-drafting landing — SHIFTED-with-notes |
| 4 | `1f4e159` | chore(phase-2-cleanup): SHA back-fill plan-drafting chain (Convention #12) |

### Stage 0 (3 commits) — verdict: CONFIRMED-Stage-0

| # | SHA | Title |
|---|---|---|
| 1 | `ee2d952` | docs(phase-2-cleanup): Stage 0 — ratify operator D-class routings |
| 2 | `807042c` | docs(phase-2-cleanup): Stage 0 checkpoint — CONFIRMED-Stage-0 |
| 3 | `94c1149` | chore(phase-2-cleanup): SHA back-fill Stage 0 chain (Convention #12) |

### Stage 1.A (4 commits) — verdict: CONFIRMED

| # | SHA | Title |
|---|---|---|
| 1 | `c58d4ab` | docs(phase-2-cleanup): Stage 1.A — fix §2.13 golden-path drift in executed plans (D1) |
| 2 | `e91a5eb` | docs(phase-2-cleanup): Stage 1.A — standardize package README test invocations to uv run (PD-2) |
| 3 | `cc3f857` | docs(phase-2-cleanup): Stage 1.A checkpoint — CONFIRMED |
| 4 | `1a312db` | chore(phase-2-cleanup): SHA back-fill Stage 1.A chain (Convention #12) |

### Stage 1.C (3 commits) — verdict: SHIFTED-with-notes

| # | SHA | Title |
|---|---|---|
| 1 | `caafdc9` | ci(phase-2-cleanup): Stage 1.C — SHA-pin checkout/setup-node/pnpm + version-fetch methodology (§13 #12,#14) |
| 2 | `1f4d946` | docs(phase-2-cleanup): Stage 1.C checkpoint — SHIFTED-with-notes |
| 3 | `f4c1271` | chore(phase-2-cleanup): SHA back-fill Stage 1.C chain (Convention #12) |

### Stage 1.E (4 commits) — verdict: CONFIRMED

| # | SHA | Title |
|---|---|---|
| 1 | `3216b2e` | docs(phase-2-cleanup): Stage 1.E — relocate 7 misfiled Phase-2 CHANGELOG sections to [Unreleased] (§13 #20) |
| 2 | `eddd86e` | chore(phase-2-cleanup): Stage 1.E — gitignore stray working-tree artifacts + project-state.md doc-truth note (§13 #24,#26) |
| 3 | `9061d70` | docs(phase-2-cleanup): Stage 1.E checkpoint — CONFIRMED |
| 4 | `ede4887` | chore(phase-2-cleanup): SHA back-fill Stage 1.E chain (Convention #12) |

### Stage 1.F (2 commits) — verdict: CONFIRMED

| # | SHA | Title |
|---|---|---|
| 1 | `b8b43f2` | docs(phase-2-cleanup): Stage 1.F checkpoint — CONFIRMED |
| 2 | `c4b75a8` | chore(phase-2-cleanup): SHA back-fill Stage 1.F chain (Convention #12) |

### Stage 1.D (5 commits) — verdict: CONFIRMED

| # | SHA | Title |
|---|---|---|
| 1 | `6674bc6` | docs(phase-2-cleanup): Stage 1.D — §D.2 intermediate-tag conditions (D3) |
| 2 | `d861274` | test(phase-2-cleanup): Stage 1.D — re-encode I7 guard to forbid agent-pushed tags, not all tags (PD-1) |
| 3 | `3c9d926` | docs(phase-2-cleanup): Stage 1.D — amend branch-protection.md to live state + M0 no-op close (D2, K-6, K-4) |
| 4 | `cd9e52e` | docs(phase-2-cleanup): Stage 1.D checkpoint — CONFIRMED |
| 5 | `7aedd16` | chore(phase-2-cleanup): SHA back-fill Stage 1.D chain (Convention #12) |

### Stage 1.B (4 commits) — verdict: CONFIRMED

| # | SHA | Title |
|---|---|---|
| 1 | `416828f` | docs(phase-2-cleanup): Stage 1.B — conventions reconciliation §M/§L.10/§L.7/§L (§13 #19,#22,#23,#31,#32,#33,#35; PD-3) |
| 2 | `6ff65db` | docs(phase-2-cleanup): Stage 1.B — methodology §6 title + per-port gate-12 perf-row acceptance (§13 #21,#30) |
| 3 | `e2fd285` | docs(phase-2-cleanup): Stage 1.B checkpoint — CONFIRMED |
| 4 | `b82c35e` | chore(phase-2-cleanup): SHA back-fill Stage 1.B chain (Convention #12) |

### Stage 1.G (4 commits) — verdict: SHIFTED-with-notes

| # | SHA | Title |
|---|---|---|
| 1 | `99226cf` | chore(phase-2-cleanup): Stage 1.G — per-package CODEOWNERS scaffolding, latent (D4) |
| 2 | `4a0ad25` | docs(phase-2-cleanup): Stage 1.G — D5 ADR-alignment + D6 differential-testing cross-ref + banked precedents (§13 #39, S-P2AR1/2) |
| 3 | `42c7df3` | docs(phase-2-cleanup): Stage 1.G checkpoint — SHIFTED-with-notes |
| 4 | `abf077c` | chore(phase-2-cleanup): SHA back-fill Stage 1.G chain (Convention #12) |

### Stage 2 (this chain) — verdict: CONFIRMED-sub-phase-landing

| # | Artifact | Title |
|---|---|---|
| 1 | this landing audit | docs(phase-2-cleanup): sub-phase landing audit — CONFIRMED |
| 2 | CHANGELOG entry | docs(changelog): sub-phase-phase-2-cleanup landed (cleanup + 11 items forward-routed) |
| 3 | SHA back-fill | chore(phase-2-cleanup): SHA back-fill Stage 2 chain (Convention #12) |

The three Stage-2 commit SHAs are recorded authoritatively in `sha-back-fill.md` (the Stage-2
section appended by commit 3, per Convention #12). This landing audit's own `head_sha` is pinned
to `abf077c` (the Stage-1.G back-fill, where all 12 evidence files resolve), so no self-referential
`head_sha` placeholder exists and no post-commit back-fill of this file is required (the clean
approach used by every cluster checkpoint in this sub-phase). No `--amend` of any published commit.

---

## § 3 — Cumulative invariant verdicts (I1–I7) — verified at HEAD `abf077c`

| Invariant | Verification command (run at HEAD) | Status at sub-phase close |
|---|---|---|
| **I1** — LFS content-OID semantics | `git diff v0.2.0-phase-2 HEAD -- captures/** tests/fixtures/legacy-captures/** .gitattributes` (empty) + testkit `test_i1_content_oid` | **PASS** — 0 diff lines; cleanup touched no LFS pointer stub (docs / CI configs / conventions / CODEOWNERS / one test file only) |
| **I2** — Bit-identity replay | `python -m integrity.scripts.replay_prior_phase --prior-phase phase-1 --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`; sha256 of stdout; testkit `test_i2_replay_lock` | **MATCH** — `ok=True`, 8/8 gates PASS, digest `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (canonical, conventions § D.3) reproduced exactly |
| **I3** — Integrity baseline | `python -m integrity --all --mode strict` | **0 HARD_FAIL / 14 SOFT_WARN**; full-report digest `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` reproduced **byte-for-byte** (baseline HELD across the entire cluster arc; the 14 SOFT_WARN are the pre-existing held set) |
| **I4** — Append-only audits | `git diff --name-status v0.2.0-phase-2 HEAD -- docs/_audits/`; testkit `test_i4_append_only_lock` | **PASS** — 21 A / 0 M / 0 D (pure-additive); no `*.ledger.md` edited |
| **I5** — Worktree replay at prior tags | testkit `test_i5_worktree_replay` (offline pointer well-formedness + cached-byte match across `v0.0.0-phase-0` / `v0.1.0-phase-1` / `v0.2.0-phase-2`); inherits the lfs-architecture M4 R2 sweep 62/62 (run 26528423418) for the live-resolution leg | **PASS** — every prior-tag LFS pointer parses + resolves; pytest 16/0 |
| **I6** — Convention #12 (SHA back-fill) | `git log --oneline v0.2.0-phase-2..HEAD` subject scan; testkit `test_i6_convention_12` | **PASS** — 16 distinct separate back-fill commits in range (9 cleanup + lfs-architecture's + the mutation sibling); no `--amend` of a published commit |
| **I7** — No agent-pushed tags | `git tag --contains v0.2.0-phase-2` + `git for-each-ref` tagger check; testkit `test_i7_no_agent_tags` (PD-1 re-encoded) | **PASS** — only `v0.2.0-phase-2` (anchor) + `v0.2.1-sub-phase-lfs-architecture` (no `-phase-N` segment) point into range; both authored by the operator (Steven Cohen); the agent pushed no tag |

**Every invariant PASSES at HEAD `abf077c`.** No Hard-Rule-2 STOP fired at § P2. (Note: cleanup is
a documentation/hygiene sub-phase that changed **no** simulation source — the I2 replay digest and
I3 integrity baseline are therefore expected to hold byte-for-byte, and they do.)

---

## § 4 — Cumulative D-class + PD dispositions — consistent with charter § 5 / Stage-0 amendment at HEAD

Cited by reference to the cluster checkpoints (the authoritative per-D evidence). Stage 2
synthesizes; it does not recapitulate the per-D ratification text.

| D / PD | Question | Final disposition | Cluster | Audit citation |
|---|---|---|---|---|
| **D1** | § 2.13 golden-path drift scope | **RESOLVED:** the two executed plans (`phase-1-plan.md`, `phase-2-cross-stack-replication.md`) fixed; `phase-3-plan.md` (7 occ) deferred to Phase-3 plan-drafting Convention-M re-anchor (intentional carve-out, documented) | 1.A | `stage-1-a-checkpoint-2026-05-27T20-56-32Z.md` |
| **D2** | branch-protection live-vs-spec | **AMENDED:** `docs/ops/branch-protection.md` amended to match live state (rules DESIGNED-but-unenforced; `gh api …/protection` → 404); "implement-live-branch-protection" forward-routed as a candidate sub-phase if the contributor model grows beyond solo+agent | 1.D | `stage-1-d-checkpoint-2026-05-27T22-28-49Z.md` |
| **D3** | § D.2 intermediate-tag wording | **LANDED:** default-NO for hygiene sub-phases, except (a) adds external dependency, (b) durable architecture worth archaeology, (c) operator-judged historical significance; precedent `v0.2.1-sub-phase-lfs-architecture` (no `-phase-N`) | 1.D | `stage-1-d-checkpoint-2026-05-27T22-28-49Z.md` |
| **D4** | CODEOWNERS granularity | **LANDED:** per-package `.github/CODEOWNERS` (19 sim + 4 common + tooling); operator owner + agent-id sentinel comments; **latent** enforcement (not enforced — D2 404) | 1.G | `stage-1-g-checkpoint-2026-05-27T22-51-18Z.md` |
| **D5** | ADR scaffolding | **DEFERRED (directory):** verdict-states ↔ Nygard intention-note in conventions § L.11 (DEFERRED↔Proposed, CONFIRMED↔Accepted, SHIFTED↔Accepted-with-amendment, REFUTED↔Deprecated, DISCONFIRMED-AT-HEAD/REFRAMED↔Superseded); no ADR directory created | 1.G | `stage-1-g-checkpoint-2026-05-27T22-51-18Z.md` |
| **D6** | differential-testing terminology | **CROSS-REFERENCED:** conventions § L.11 + catalog § 50.1 reciprocal cross-refs; matched-pair cross-stack gates apply differential testing, RELATED to but distinct from the cross-algorithm sense; no file/class renames | 1.G | `stage-1-g-checkpoint-2026-05-27T22-51-18Z.md` |
| **PD-1** | I7 over-strict proxy test | **RE-ENCODED:** `test_no_tag_points_into_subphase_range` → `test_no_agent_pushed_tag_in_subphase_range`; declarative operator-sanctioned-tags allowlist; pytest 15/1 → **16/0** (precondition-6 deviation resolved) | 1.D | `stage-1-d-checkpoint-2026-05-27T22-28-49Z.md` |
| **PD-2** | README test-invocation consistency | **RESOLVED:** 11 package READMEs standardized to `uv run pytest …` | 1.A | `stage-1-a-checkpoint-2026-05-27T20-56-32Z.md` |
| **PD-3** | (conventions reconciliation finding) | **CLOSED** at Cluster B (reconciled within § M / § L theme) | 1.B | `stage-1-b-checkpoint-2026-05-27T22-40-20Z.md` |
| **PD-4** | conventions lettered-section ordering (§P) | **DEFERRED:** cosmetic; section-block-move risk outweighs alphabetical benefit; revisit at a conventions-doc-restructure pass | 1.B | `stage-1-b-checkpoint-2026-05-27T22-40-20Z.md` |

No D-class or PD disposition contradicts the charter § 5 / Stage-0 amendment at HEAD. No
Hard-Rule-2 STOP fired at § P3.

---

## § 5 — Banked lessons (structural patterns from execution)

The cluster arc surfaced one explicitly-named lesson and three structural patterns the Stage-1
report did not name explicitly but that recur across the checkpoints. Each is banked with the
cluster where it manifested, feeding forward into future basket-sub-phase planning.

1. **L-CLEANUP-1 — plan-drafting enumeration under-resolves sub-phase-shaped items.** (Cluster 1.C,
   checkpoint § 9.) "Plan-drafting enumeration sometimes under-resolves items that look
   cleanup-shaped at low resolution but reveal sub-phase complexity at execution-time probe."
   Cluster C: 3 of 8 clustered items (#10/#17/#28) proved sub-phase-sized on inspection (#17 alone
   = 93 mypy errors / 9 files). **Structural remedy:** the per-cluster Convention-M re-anchor
   already in the cadence catches it; future basket sub-phases should budget probe-depth for
   "M"-effort CI/typing items specifically.
   **Manifested:** 1.C (`stage-1-c-checkpoint`).

2. **Surface-rather-than-absorb discipline held across 5 STOP-and-surface events.** (Clusters 1.C ×2,
   1.E ×1, 1.G ×1, plus plan-drafting's UNKNOWN-2.) Every time an item revealed sub-phase scope or a
   coupled judgment, the stage **stopped and surfaced for operator ratification rather than absorbing
   scope** (dispatch Hard Rule 2). The five operator-ratified events: 1.C UNKNOWN-1/K-3 carry; 1.C
   Cluster-C scope re-shape (2-of-8 cleanup-shaped); 1.E #20 release-structure routing; 1.G
   methodology triage (#3/#18/S9-PHASE2). **Structural pattern: the surfacing discipline is
   load-bearing for basket sub-phases** — it is what keeps a hygiene basket from silently growing
   into an architecture sub-phase.
   **Manifested:** 1.C, 1.E, 1.G (and plan-drafting).

3. **"Bug-fix + adjacent decision = two separate decisions."** (Cluster 1.E #20.) The CHANGELOG
   misfiling was a mechanical bug (7 Phase-2 sections under the wrong release header) **distinct**
   from the release-management judgment of *when/how* `[Unreleased]` promotes to a named release
   section. The cluster fixed the bug (byte-exact relocation to `[Unreleased]`) and **forward-routed
   the workflow decision** rather than conflating them. **Structural pattern: separate the
   mechanical correction from the policy decision it touches**; resolve the former, route the latter.
   **Manifested:** 1.E (`stage-1-e-checkpoint`).

4. **Single-session multi-cluster execution is feasible with discipline intact.** (Whole Stage-1 arc.)
   All seven clusters executed in one session (26 commits across 1.A → 1.G), with the integrity
   baseline held byte-for-byte at every cluster boundary, pytest 16/0 from Cluster D onward, and
   verify_evidence GREEN at every checkpoint — no fatigue-driven discipline lapse, no skipped sweep.
   **Structural pattern: basket sub-phases with disjoint file-set clusters are single-session
   tractable** when each cluster carries its own re-anchor + checkpoint + back-fill discipline; the
   cluster boundary is the natural verification cadence.
   **Manifested:** whole arc (all 7 cluster checkpoints + `sha-back-fill.md`).

(Lessons 2–4 were observable in the cluster checkpoints but not named as standalone lessons in the
Stage-1 coordinator report; per the dispatch they are surfaced here in commit 1's § 5 — this is not
a STOP, the dispatch authorizes surfacing them at the landing.)

---

## § 6 — Cumulative deferred-OUT catalog (forward-routing material)

The Stage-1 arc surfaced **12 forward-routings** (11 deferred-OUT to siblings / operator dispatches /
Phase-N, plus 1 STAY-BANKED preserved in place). This is the primary forward-routing material the
sub-phase hands to whoever schedules sibling sub-phases. Each item: identifier · original cluster ·
reason · proposed routing · effort.

| # | Item | Cluster | Reason for deferral | Proposed routing | Effort |
|---|---|---|---|---|---|
| 1 | **#10** actionlint not installed | 1.C | Not installable/validatable in this sub-phase; tooling change | Infra / CI-tooling sub-phase | S–M |
| 2 | **#17** mypy `--strict` Warp partial-stub errors | 1.C | Sub-phase-sized: **93 errors / 9 files** in common-warp | Typing / testing-improvements sub-phase | M–L |
| 3 | **#28** cpp-strict Mesa/LLVM-pin + exact-digest scoping | 1.C | Design-bearing FMA substrate; unvalidatable pre-reset | CI-determinism sub-phase | M |
| 4 | **#27** `tests/sha256_util.hpp` shim | 1.E | Removal **gate unmet** — still cited in current common-cpp-bootstrap Stage-1a evidence_paths | Defer until those audits are historical (no sibling needed) | S |
| 5 | **#3** cross-stack methodology FULL-consolidation | 1.G | Sub-phase-sized: major doc-consolidation | Methodology-consolidation sibling sub-phase | M–L |
| 6 | **#18** D17 Phase-1-canonical re-characterization / 2D-reference | 1.G | Un-adjudicated **operator decision** (surfaced, not adjudicated) | Standalone small operator-decision dispatch | S (decision) |
| 7 | **K-3** post-reset CI green-check | 1.C | UNKNOWN-1 — pre-reset CI red is expected; green-check not observable until the ~May 31 / Jun 1 LFS-quota reset | Small post-reset follow-up dispatch (early June 2026) | S |
| 8 | **PD-4** conventions lettered-section ordering (§P) | 1.B | Cosmetic; block-move risk > alphabetical-ordering benefit | Conventions-doc-restructure pass | S |
| 9 | **S9-PHASE2-1/2/3** phase-close-mechanics refinements | 1.G | Phase-3+ phase-close-mechanics; partially overlaps #26 (RESOLVED at 1.E) | Phase-3 plan-drafting Convention-M consumption | S–M |
| 10 | **K-2** `phase-3-plan.md` (7 occ) golden-path drift | 1.A | D1 carve-out: unexecuted plan; Convention M re-anchors at its own dispatch | Phase-3 plan-drafting Convention-M re-anchor | S |
| 11 | **#20-residual** CHANGELOG release-section promotion workflow | 1.E | Release-management judgment distinct from the misfiling bug (fixed at 1.E) | Release-management dispatch (the "CHANGELOG release-section workflow" decision) | S–M |
| 12 | **#9-residual** Cat-3 evaluator shims + mutmut characterization | 1.F | Mutation/evaluator-authoring; **reconciles § 13 #25 + #40** (see § 7) | Testing-improvements sibling sub-phase | M–L |
| (banked) | **#1** LBM `sim_runner_diagnostic` cosmetic descriptor | 1.C | Append-only-sealed Phase-1 code (R-1); analytic ICs; locked by #16's regression test | **STAYS-BANKED** (operator-routing-only; no sibling) | — |

**Reconciliation vs the Stage-1 report's 11-item headline (FACT).** The Stage-1 coordinator report
headlined 11 forward-routings; the full execution-arc catalog is **12 routed-OUT + 1 STAY-BANKED**.
The two beyond the headline — **#10 K-2 phase-3-plan.md** (routed at 1.A) and **#12 #9-residual**
(routed at 1.F) — were properly routed **at the cluster level** (their checkpoints document the
deferral); they were merely absent from the report's headline count. The dispatch explicitly
anticipated this ("probe may surface additional items if any"). **No cluster checkpoint missed a
routing** → not a Hard-Rule-2 STOP; the catalog is now complete at 13 entries.

**Pre-execution routings (charter § 9, banked at plan-drafting — context, not new).** Five § 13
items were routed OUT *before* the cluster arc and are not re-counted in the 12 above: **#8**
(mid-Phase-1 capture regeneration → sibling w/ append-only protocol), **#36** (multi-material MPM
extension → Phase 3+), **#37** (Phase-1 open items B2–B6/B11/B16 + DFSPH generator → Phase-1-backlog
sub-phase), **#40** (MPM `mls_mpm.py` mutation completion → testing-improvements, grouped with
#9-residual), **#29** (D16 f32→f64 float-controls → operator: sibling).

---

## § 7 — Final discipline summary (53-item reconciliation)

Cleanup has no cost-axis (no R2 storage, no bandwidth — contrast `sub-phase-lfs-architecture`). The
summary axis is **discipline-tracking**: did all 53 enumerated items reach a clean disposition with
nothing dropped? **They did — the count reconciles to exactly 53.**

| Disposition | Count | Items |
|---|---|---|
| **RESOLVED** at execution (source change) | **26** | §13: #12,#14,#19,#20,#21,#22,#23,#24,#26,#30,#31,#32,#33,#35,#39,#41 (16); K: K-2,K-4,K-5,K-6,K-7a,K-7b,K-7c (7); PD: PD-1,PD-2,PD-3 (3) |
| **VERIFY-CLOSED** (already resolved upstream) | **12** | §13: #2,#4,#5,#6,#7,#9(landed),#11,#13,#15,#16,#34,#38 |
| **DEFERRED-OUT** (execution arc — § 6) | **8** | §13: #3,#10,#17,#18,#27 (5); K-3; PD-4; + #9-residual & K-2-phase3 are residual-portions of items counted above (RESOLVED/VERIFY-CLOSED), routed forward |
| **DEFERRED-OUT** (plan-drafting, charter § 9) | **5** | §13: #8,#29,#36,#37,#40 |
| **STAY-BANKED** (R-1) | **1** | §13: #1 |
| **RECONCILED** (label subsumed) | **1** | §13: #25 (see note) |
| **TOTAL** | **53** | 41 §13 + 8 K + 4 PD = 53 ✓ |

Note on split-disposition items: **K-2** (RESOLVED for the two executed plans; phase-3 portion
forward-routed, § 6 #10) and **#20** (RESOLVED bug-fix; release-section workflow forward-routed,
§ 6 #11) and **#9** (VERIFY-CLOSED landed portion; residual forward-routed, § 6 #12) each count
**once** under their primary execution disposition; their forward-routed residuals appear in the
§ 6 catalog as routing material, not as separate enumerated items.

**The #25 reconciliation finding (FACT — surfaced at Stage 2).** § 13 **#25** ("Cat-3 evaluator
shims / sibling subdirs") is the one § 13 number **not assigned to any cluster** in the charter § 3
catalog and **not cited by its own number** in the § 9 plan-drafting deferred-OUT table or any
cluster checkpoint. Its *substance* (Cat-3 evaluator shims) is co-extensive with the § 9 grouping
"#40 + #9-residual — … + Cat-3 evaluator shims + mutmut characterization → Testing-improvements
sub-phase" and with the 1.F checkpoint's #9-residual routing. **Disposition: #25's work is routed
forward** (testing-improvements sibling sub-phase, § 6 #12); only its `#25` label was subsumed into
the #9/#40 grouping at plan-drafting. **Zero work is dropped.** This is a documented enumeration
drift (the dispatch § P6 anticipates "or close, with any drift documented"), not a Hard-Rule-2 STOP:
the § P5 STOP condition scopes to *cluster-checkpoint arc misses*, and #25 was a plan-drafting-level
non-clustering whose substance is routed — not an arc miss. Stage 2 formally reconciles #25 → the
testing-improvements routing.

Discipline held throughout: integrity baseline `c19492ad…d22cb52` byte-for-byte at every cluster
boundary; pytest `tools/testkit/lfs_migration/` 15/1 → **16/0** at Cluster D (PD-1) and maintained;
verify_evidence GREEN on every cluster checkpoint; I1–I7 hold; no agent-pushed tag (I7); 5
STOP-and-surface events, all operator-ratified, no scope absorbed.

---

## § 8 — Verification sweeps confirming PASS state at HEAD

All run at HEAD `abf077c`:

- **verify_evidence — full sub-phase chain (no regression).** Every prior sub-phase audit STILL
  PASSES: plan-drafting-landing **4/0**; stage-0-checkpoint **4/0**; stage-1-a-checkpoint **8/0**;
  stage-1-c-checkpoint **8/0**; stage-1-e-checkpoint **10/0**; stage-1-f-checkpoint **10/0**;
  stage-1-d-checkpoint **6/0**; stage-1-b-checkpoint **6/0**; stage-1-g-checkpoint **6/0**.
  **Total: 9 sub-phase audits, all PASS, 0 fail.**
- **verify_evidence — prior sub-phase chain (no regression).** The `sub-phase-lfs-architecture`
  landing + its chain still PASS (no cleanup commit touched them; they are append-only-sealed).
- **Integrity baseline (I3).** `integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**;
  full-report digest `c19492add530…d22cb52` reproduced **byte-for-byte** (baseline HELD).
- **Bit-identity replay (I2).** `replay_prior_phase --prior-phase phase-1` (8 gates) → `ok=True`,
  8/8 PASS; stdout digest `9399fc33…718909f34` (canonical MATCH).
- **Testkit lock surface.** `pytest tools/testkit/lfs_migration/` → **16 passed** (I1–I7 +
  cost-axis registry + per-job R2-config; PD-1 fix maintained).
- **I1 pointer-byte identity.** `git diff v0.2.0-phase-2 HEAD` over all LFS paths + `.gitattributes`
  = empty (0 lines).
- **I4 append-only.** 21 A / 0 M / 0 D over `docs/_audits/` in range; no `*.ledger.md` edited.

No sweep regressed. No Hard-Rule-2 STOP fired.

---

## § 9 — Relationship to peer chains (cited, NOT in the cumulative ledger)

Two peer chains from earlier in this session arc are **separate work with separate provenance**;
their SHAs are cited for completeness but are **not** part of § 2's cumulative ledger (per the
closing-audit scoping).

- **Mutation-testing re-tier sibling chain (`cd21148` → `8a3d998` → `e97b23b` → `5a5e18b`).** Resolved
  the `sub-phase-lfs-architecture` Stage-0 mutation-testing re-tier HOLD (catalog § 41.4 places
  mutation/fuzz at T4 weekly). LANDED; the coupled live branch-protection update is a no-op in
  practice (no live branch-protection rules; the same 404 D2 confirmed). Audit trail kept coupled to
  the lfs sub-phase's `sha-back-fill` ledger.
- **Operator golden-path fix (`51e0ee1`).** `docs(spec): correct § 2.13 golden module path`
  (`tools/testkit/golden/`). Operator-authored during the lfs Stage-1b backlog push; not authored by
  this sub-phase. (Distinct from the cleanup D1 / K-2 golden-**path** drift in the *executed plans*,
  fixed at 1.A.)

Neither chain altered any LFS pointer stub, any cleanup item disposition, or any sub-phase invariant.

---

## § 10 — Forward routing

- **The deferred-OUT catalog (§ 6) is the primary forward-routing material** — 12 routed-OUT
  (11 deferred + 1 banked) candidate sibling sub-phases / operator-decision dispatches / Phase-3
  consumptions, plus 5 pre-execution charter-§ 9 routings. Hand this catalog to whoever schedules
  sibling sub-phases.
- **Comprehensive Phase-2-tail cleanup is now complete.** `sub-phase-lfs-architecture` (R2/LFS
  infrastructure) + `sub-phase-phase-2-cleanup` (this basket) together close the Phase-2 tail.
- **Phase 3 dispatch is the next major scheduling decision.** Phase 3 plan-drafting will consume the
  Phase-3-routed deferrals (K-2 phase-3-plan.md golden-path re-anchor; S9-PHASE2-1/2/3
  phase-close-mechanics) via its own Convention-M re-anchor. Per conventions § D.4, Phase-3 pre-flight
  replays against `v0.1.0-phase-1` — sub-phases do not join the cross-phase replay chain, so neither
  Phase-2-tail sub-phase enters the Phase-3 replay resolver.
- **Phase 4 readiness** is unaffected by cleanup (it was confirmed at the lfs sub-phase landing,
  D9 — content-addressing is schema-agnostic).

---

## § 11 — No operator-action-pending (no v-tag at close)

Per charter § 7 + the § D.2 amendment LANDED at Cluster 1.D (D3), **no v-tag is pushed at this
sub-phase's close.** Cleanup is steady-state hygiene: it adds no external dependency, marks no
durable architecture worth git-archaeology, and the operator routed no historical-significance tag —
it meets **none** of the three intermediate-tag conditions, so the § D.2 default (NO) governs. This
is the first sub-phase to exercise the § D.2 default-NO branch the sub-phase itself authored.

The sub-phase closes with **three commits**: (1) this landing audit, (2) the CHANGELOG entry under
`[Unreleased]`, (3) the Stage-2 SHA back-fill. Once the operator pushes this 3-commit Stage-2 chain
to `origin/main`, `sub-phase-phase-2-cleanup` is **formally and publicly closed**. No tag, no
further charter amendment.

## Conventions honored

Convention #8 (every claim grep-/command-/evidence-verified — the I2 replay digest, I3 baseline
digest, I1/I4/I6/I7 git checks, and the 53-item reconciliation were all reproduced at HEAD, not
paraphrased from the dispatch; the dispatch's `--check-all` flag was corrected to the actual
`--all --mode strict` CLI; the #25 enumeration drift was surfaced rather than papered over);
Convention M (re-anchored against live HEAD `abf077c` before writing; cluster-checkpoint citations
verified at HEAD); Convention A (this landing audit is a net-new file; the back-fill commit lands
after it); Convention #12 (SHA back-fill is the separate commit 3, never `--amend`); cat-1 intra-repo
full-path citations; `evidence_paths` a list / `evidence_hashes` a YAML mapping (the verify_evidence
contract); four-state verdicts; FACT/INFERENCE tagging; no tag pushed by the agent (I7).
