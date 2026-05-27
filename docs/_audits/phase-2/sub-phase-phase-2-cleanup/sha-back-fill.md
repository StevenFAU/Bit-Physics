---
date: 2026-05-27T20-08-34Z
author: phase-2-cleanup-plan-drafting-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-plan-drafting-sha-backfill
stage: plan-drafting-sha-backfill
verdict: CONFIRMED
subject: >
  Plan-drafting SHA back-fill ledger (Convention #12). Records the 4-commit
  plan-drafting chain SHAs and the single self-referential token back-filled:
  the plan-drafting landing audit's § 1 commit-chain table row 3 (COMMIT 3's
  own SHA), back-filled in COMMIT 4. The landing audit's head_sha was pinned to
  a real prior commit (COMMIT 2, 4dac480) where its evidence resolves, so no
  head_sha placeholder existed (the clean approach used since lfs Stage-0). The
  probe report (tools/testkit/probes/) and charter (docs/phases/) carry no
  head_sha front-matter -> no back-fill, recorded for the chain at COMMIT 1
  (71483f17) / COMMIT 2 (4dac480). This ledger is the TERMINAL plan-drafting
  artifact; its own committing commit (COMMIT 4) is the recursion-stopper and is
  reported in the coordinator summary, NOT further committed. Separate commit;
  never --amend.
head_sha: 95a24d99d07de1758e5034b0d39669e6172e0f0a
head_sha_at_checkpoint: 95a24d99d07de1758e5034b0d39669e6172e0f0a
parent_audits:
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md
evidence_paths:
  - tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md
  - docs/phases/sub-phase-phase-2-cleanup.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Plan-drafting SHA back-fill ledger — sub-phase-phase-2-cleanup

Convention #12 (conventions § B.2): SHA back-fill is always a separate commit, never
`git --amend` of a published commit. This ledger records the full enumeration.

## Commit chain (final SHAs)

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | probe report | `tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md` | `71483f17e8bff824143d7bcdda97c66a09f329d6` |
| 2 | charter | `docs/phases/sub-phase-phase-2-cleanup.md` | `4dac480db90b2c7b07fe72b12f9739b83b63ee25` |
| 3 | plan-drafting landing audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md` | `95a24d99d07de1758e5034b0d39669e6172e0f0a` |
| 4 | this back-fill ledger | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

## Placeholder enumeration (every token back-filled)

| Token | File | Back-filled to | In commit |
|---|---|---|---|
| § 1 commit-chain table row 3 SHA cell ("back-filled in COMMIT 4") | plan-drafting landing audit | `95a24d99d07de1758e5034b0d39669e6172e0f0a` (COMMIT 3, its own committing commit) | COMMIT 4 |

No other placeholders existed:

- The **landing audit's `head_sha`** (`4dac480…`, COMMIT 2) is a real prior commit where its
  evidence (probe + charter) resolves — verified `verify_evidence` 4 pass / 0 fail. **Not**
  self-referential → no back-fill (the clean approach used since lfs Stage-0).
- The **probe report** (`tools/testkit/probes/reports/…`) is a probe report, not an audit; it
  carries no `head_sha` front-matter → nothing to back-fill. Recorded for the chain at COMMIT 1
  `71483f17e8bff824143d7bcdda97c66a09f329d6`.
- The **charter** (`docs/phases/…`) is a plan, not an audit; it carries `head_sha_at_draft:
  e1fc154…` (the session-start anchor, a stable FACT, not a self-reference) → nothing to
  back-fill. Recorded for the chain at COMMIT 2 `4dac480db90b2c7b07fe72b12f9739b83b63ee25`.
- The landing audit's `head_sha_at_checkpoint` (`4dac480…`, COMMIT 2) and `evidence_hashes`
  (probe `f090fde2…`, charter `59f50090…`) were real at write time → no back-fill.

The COMMIT-4 edit touches the `plan-drafting-landing-*.md` audit (the row-3 SHA cell), which is
not a `*.ledger.md` file, so the `audit-append-only.yml` gate permits it (it enforces
prefix-immutability only on `*.ledger.md`; spec `docs/architecture.md:1448`). The landing audit's
own `evidence_hashes` do not hash itself, so the back-fill edit changes no `verify_evidence`
outcome (it still resolves probe + charter at `head_sha 4dac480`; prior audits still PASS, no
regression). Separate commit (COMMIT 4); never `--amend`.

## Plan-drafting chain complete

Plan-drafting **SHIFTED-with-notes** (precondition-5 deviation + UNKNOWN-2; landing audit § 5).
Operator routes D1–D6 + confirms UNKNOWN-2 (PROCEED vs hard-STOP on the I7-test deviation) →
coordinator dispatches Stage 0. No `-phase-N` tag (this is a Phase-2-tail sub-phase; cleanup is
steady-state hygiene → no v-tag by default per charter § 7 Stage 2). No tag pushed by agent (I7).

## Stage 0 chain SHAs (appended at Stage 0 close; Convention #12)

Operator ratified all D-class routings (D1–D6) + PROCEED on UNKNOWN-2; Stage 0 locked them into
the charter, re-anchored citations (Convention M; no drift), and verified invariants.

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | charter Stage-0 amendment (D-class ratification) | `docs/phases/sub-phase-phase-2-cleanup.md` | `ee2d95270dced45aacffd0d1bfd4748ae7990374` |
| 2 | Stage-0 checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-0-checkpoint-2026-05-27T20-29-08Z.md` | `807042c5e12f06fb7e7e904e560209d29c7a2d91` |
| 3 | this back-fill (Stage 0 section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** The Stage-0 checkpoint's `head_sha` was pinned to
commit 1 `ee2d952` (where its evidence — charter + plan-drafting landing — resolves), so no
self-referential `<…_PENDING>` token existed (the clean approach used since lfs Stage-0). The
SHAs above are recorded for the chain. This file is a `sha-back-fill-*.md`, not a `*.ledger.md`,
so the `audit-append-only.yml` gate permits this append (it enforces prefix-immutability only on
`*.ledger.md`; spec `docs/architecture.md:1448`). Separate commit (COMMIT 3); never `--amend`.

**Stage 0 CONFIRMED-Stage-0.** D1–D6 LOCKED; UNKNOWN-2 resolved (PROCEED — PD-1 fix routed to
Stage 1.D alongside D3); UNKNOWN-1 carried to Cluster C; § 13 #29 moved to deferred-OUT. I1–I7
hold (I7 substantive; the over-strict proxy test is PD-1, not a violation); integrity baseline
`c19492ad…d22cb52` held; verify_evidence 4/0 + regression 24/0, 7/0. Cluster stages 1.A–1.G
dispatchable per charter § 4. No tag pushed by agent (I7).

## Stage 1.A chain SHAs (appended at Stage 1.A close; Convention #12)

Cluster A (citation & path drift) — K-2 (§ 2.13 golden-path drift, executed plans) + PD-2
(README `uv run` consistency). Two theme-commits (R-4) + checkpoint. phase-3-plan.md deferred
(D1 carve-out).

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | K-2 golden-path fix (D1) | `docs/phases/phase-1-plan.md`, `docs/phases/phase-2-cross-stack-replication.md` | `c58d4ab2a769fbff67ae05c3b306f2e458ebbebf` |
| 2 | PD-2 README uv-run | `packages/*/README.md` (11) | `e91a5eb31bfc497d2b924022662ef338bf6ff3ba` |
| 3 | Stage-1.A checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-a-checkpoint-2026-05-27T20-56-32Z.md` | `cc3f857e9c6d77185691dd7410dbb864fe3eff69` |
| 4 | this back-fill (Stage 1.A section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** The Stage-1.A checkpoint's `head_sha` was pinned to
`e91a5eb` (the last cluster commit, where all evidence — both plan files + a representative
README + the charter — resolves: `verify_evidence` 8 pass / 0 fail). No self-referential
`<…_PENDING>` token existed. The SHAs above are recorded for the chain. This file is a
`sha-back-fill-*.md`, not a `*.ledger.md`, so the `audit-append-only.yml` gate permits this
append (prefix-immutability is enforced only on `*.ledger.md`; spec `docs/architecture.md:1448`).
Separate commit; never `--amend`.

**Stage 1.A CONFIRMED-Stage-1-A.** K-2 (executed plans) RESOLVED; K-2 phase-3-plan.md DEFERRED
(D1); PD-2 RESOLVED (11 READMEs). I1–I7 hold; integrity baseline `c19492ad…d22cb52` held;
verify_evidence 8/0. No tag pushed by agent (I7).

## Stage 1.C chain SHAs (appended at Stage 1.C close; Convention #12)

Cluster C (CI / workflow / supply-chain hygiene) — **SHIFTED-with-notes** (scope re-shape, not an
execution failure; two operator-ratified STOP-and-surface events). One substantive commit (the
coupled #12 SHA-pin + #14 methodology theme; R-4) + checkpoint. The verify-close / stays-banked /
defer-OUT items are documentation-only dispositions (no source change → no commit).

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | #12 SHA-pin (3 actions) + #14 version-fetch methodology | `.github/workflows/*.yml` (12), `docs/dependencies.md` | `caafdc9d08899154581d39d9c98f06110fde96e1` |
| 2 | Stage-1.C checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-c-checkpoint-2026-05-27T22-06-35Z.md` | `1f4d946eb85f66e1a11a671a7001459dceb6bb51` |
| 3 | this back-fill (Stage 1.C section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** The Stage-1.C checkpoint's `head_sha` was pinned to
`caafdc9` (where the #12/#14 evidence resolves; `verify_evidence` 8 pass / 0 fail). No self-referential
token. Separate commit; never `--amend`. (Note: the checkpoint's first commit attempt was correctly
**aborted by the cat4 hook** — two workflow citations needed full repo-relative paths,
`.github/workflows/<f>.yml:NN`; fixed and re-committed at `1f4d946`. The recurring cat1/cat4 full-path
gotcha.)

**Stage 1.C SHIFTED-with-notes.** #12 (SHA-pin) + #14 (methodology) RESOLVED; #11/#13/#16 VERIFY-CLOSE;
#1 STAYS-BANKED (R-1); #10/#17/#28 DEFER-OUT (charter § 9; #17 = 93 mypy errors/9 files); K-3 CARRY
(UNKNOWN-1, post-reset follow-up). No scope absorbed. I1–I7 hold; integrity baseline `c19492ad…d22cb52`
held; verify_evidence 8/0. Banked lesson L-CLEANUP-1. No tag pushed by agent (I7).

## Stage 1.E chain SHAs (appended at Stage 1.E close; Convention #12)

Cluster E (working-tree & doc-truth hygiene) — **CONFIRMED-Stage-1-E**. Two theme-commits (R-4) +
checkpoint. #20/#24/#26 RESOLVED; #38 VERIFY-CLOSE; #27 DEFER (gate unmet).

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | #20 CHANGELOG byte-exact relocation | `CHANGELOG.md` | `3216b2e74e3634bf797a04653b52907396cbc8e0` |
| 2 | #24 gitignore + #26 doc-truth note | `.gitignore`, `docs/phases/sub-phase-common-cpp-bootstrap.md` | `eddd86e55a3d89ec05c9dcb1284abc17126f426f` |
| 3 | Stage-1.E checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-e-checkpoint-2026-05-27T22-20-04Z.md` | `9061d7034995e31b6eb8433cd5afae0c98558cdb` |
| 4 | this back-fill (Stage 1.E section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** Checkpoint `head_sha` pinned to `eddd86e` (where all evidence
resolves; `verify_evidence` 10 pass / 0 fail). Separate commit; never `--amend`.

**Stage 1.E CONFIRMED-Stage-1-E.** #20 (CHANGELOG split-location; byte-exact 7-section relocation),
#24 (working-tree clutter gitignored — captures preserved for D13/D14), #26 (project-state.md doc-truth)
RESOLVED; #38 VERIFY-CLOSE (hello_taichi.py exemplar consumed by RD2D); #27 DEFER (removal gate unmet).
#20 release-section workflow banked to charter § 9. I1–I7 hold; integrity baseline `c19492ad…d22cb52`
held; verify_evidence 10/0. No tag pushed by agent (I7).

## Stage 1.F chain SHAs (appended at Stage 1.F close; Convention #12)

Cluster F (verify-and-close) — **CONFIRMED-Stage-1-F**. **No substantive commits** (verification-only);
the checkpoint + this back-fill are the only artifacts.

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | Stage-1.F checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-f-checkpoint-2026-05-27T22-22-25Z.md` | `b8b43f2225e7111e827fbdfd50de08ed2a7be4ff` |
| 2 | this back-fill (Stage 1.F section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** Checkpoint `head_sha` pinned to `ede4887` (the 1.E back-fill;
where all resolution evidence resolves; `verify_evidence` 10 pass / 0 fail). Separate commit; never `--amend`.

**Stage 1.F CONFIRMED-Stage-1-F.** § 13 #4, #7, #15, #34, #9-landed CLOSED with evidence-of-resolution;
M0 confirmed no-op (branch not protected, 404). #9 residual stays deferred-OUT (charter § 9). I1–I7 hold;
integrity baseline `c19492ad…d22cb52` held; verify_evidence 10/0. No tag pushed by agent (I7).

## Stage 1.D chain SHAs (appended at Stage 1.D close; Convention #12)

Cluster D (branch-protection & tag governance) — **CONFIRMED-Stage-1-D**. Three theme-commits (R-4)
+ checkpoint. The § D.2 wording is drafted here (soft-dep feed to Cluster 1.B / K-5).

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | D3 § D.2 intermediate-tag conditions | `docs/conventions/sub-phase-conventions.md` | `6674bc6a72061c47ae9bce6e337f8d9f4330c1e8` |
| 2 | PD-1 I7 guard re-encoding (→ 16/0) | `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | `d861274a7d50fb933bfbb2b056745011b207645c` |
| 3 | D2 branch-protection live-state + M0 no-op | `docs/ops/branch-protection.md` | `3c9d926e7682f182523e6762322e0c84cbe493ef` |
| 4 | Stage-1.D checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-d-checkpoint-2026-05-27T22-28-49Z.md` | `cd9e52e06bc1c569a7813d47204b9c2065ce657a` |
| 5 | this back-fill (Stage 1.D section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** Checkpoint `head_sha` pinned to `3c9d926` (where all evidence
resolves; `verify_evidence` 6 pass / 0 fail). Separate commit; never `--amend`.

**Stage 1.D CONFIRMED-Stage-1-D.** D3 (§ D.2 intermediate-tag conditions), PD-1 (I7 guard re-encoded —
declarative operator-sanctioned-tags allowlist; **pytest 16/0**, the precondition-6 deviation now
RESOLVED), D2 (branch-protection live-state amendment), K-4/M0 (no-op), § 13 #41 (via D3) RESOLVED.
§ D.2 wording drafted (soft-dep feed to 1.B). No STOP (PD-1 not brittle). I1–I7 hold; integrity baseline
`c19492ad…d22cb52` held; verify_evidence 6/0. No tag pushed by agent (I7).

## Stage 1.B chain SHAs (appended at Stage 1.B close; Convention #12)

Cluster B (conventions / methodology reconciliation) — **CONFIRMED-Stage-1-B**. Two theme-commits (R-4)
+ checkpoint. K-5 (§ D.2) was satisfied at 1.D (soft-dep); 1.B cross-references without a second touch.

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | conventions reconciliation (§M, §L.10, §L.7, §L S1b-SME3) | `docs/conventions/sub-phase-conventions.md` | `416828f8a94d6399f0bf3efb8f05848cb9d1a3df` |
| 2 | methodology § 6 title + per-port gate-12 perf-row acceptance | `docs/conventions/cross-stack-equivalence-methodology.md`, `docs/phases/phase-2-cross-stack-replication.md` | `6ff65db0fd0cc4587cda83ab04b29e44286f794d` |
| 3 | Stage-1.B checkpoint audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-b-checkpoint-2026-05-27T22-40-20Z.md` | `e2fd285ef3bf65a3e6af57022f02b3e5fedec88a` |
| 4 | this back-fill (Stage 1.B section) | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

**No placeholder back-fill was needed.** Checkpoint `head_sha` pinned to `6ff65db` (where all evidence
resolves; `verify_evidence` 6 pass / 0 fail). Separate commit; never `--amend`.

**Stage 1.B CONFIRMED-Stage-1-B.** § 13 #19, #21, #22, #23, #30, #31, #32, #33, #35 RESOLVED (§ M
reconciled 65→242; new § L.10 coordinator-drift + baseline-digest formalizations; § L.7 title-scope;
methodology § 6 title; gate-12 perf-row Stage-1b acceptance); #5/#6 VERIFY-CLOSE (§ B.6 modes documented);
K-5 satisfied at 1.D; PD-3 closed; PD-4 deferred (cosmetic). I1–I7 hold; integrity baseline
`c19492ad…d22cb52` held; verify_evidence 6/0; pytest 16/0. No tag pushed by agent (I7).
