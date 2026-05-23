---
date: 2026-05-23
author: conventions-refactor-post-phase-1-sub-phase-agent
artifact: stage
artifact_id: sub-phase-conventions-refactor-post-phase-1-stage-0
stage: 0-pre-flight
subject: "Conventions Refactor (Post-Phase-1) sub-phase Stage 0 pre-flight — doc-only refactor; Task 0.4 SKIPPED with rationale; conventions doc stabilises for spec-Phase-2 entry"
verdict-state: PASS
head_sha: af3a5aec0185a1abff007435da4eef4f4ef8325e
head_sha_at_checkpoint: af3a5aec0185a1abff007435da4eef4f4ef8325e
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-1/sub-phase-mutation-script-hotfix/repair-2026-05-22T02-57-31Z.md
  - docs/_audits/phase-1/sub-phase-conventions-consolidation/landing-2026-05-22T03-25-55Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
evidence_paths:
  - docs/phases/sub-phase-conventions-refactor-post-phase-1.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-replay-2026-05-23T12-27-48Z.txt
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-evidence-reverify-2026-05-23T12-27-48Z.txt
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-section-baseline-2026-05-23T12-27-48Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:004d70117e01b3824a8b54e4c34963969ad0a4188b87f7acbca01dea9600a3e6
  docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-replay-2026-05-23T12-27-48Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-evidence-reverify-2026-05-23T12-27-48Z.txt: sha256:22b7193713eb8738d94abd086ac74633cb125270d56dc9eba281d9534c634ce0
  docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-section-baseline-2026-05-23T12-27-48Z.txt: sha256:c1512413c225b0376f944292bb86f68c45890ffdd6d82fe0a03d8b51cf3a28d5
---

# Conventions Refactor (Post-Phase-1) Sub-Phase — Stage 0 Checkpoint

## 1. Scope (per plan § 4.1)

Doc-only refactor sub-phase. Stage 0 deliverable: cross-phase replay
+ tolerance-budget carryover + Phase 1 evidence sha256 reverify +
conventions-doc reverify with affected-section baseline. **Task 0.4
explicitly SKIPPED** per plan § 1.3 (no canonical capture; no
implementation perf surface; conventions doc § N Task 0.4 not
applicable).

Operator routing at dispatch (applied as authoritative):

- **Item 1 (Scope):** 8 items A–H CONFIRMED. Out-of-scope items
  (`common-py` adoption, testing-improvements work, mid-Phase-1
  capture regeneration) stay excluded.
- **Item 2 routing:**
  - 2(a) Item B placement: new § P top-level (between § L and § M).
  - 2(b) Item E remediation-options: list three concrete options in
    new § B.6.
  - 2(c) Item A empirical-band framing: `[0.5×, 3×]` safety-margin.
  - 2(d) Item C placement: extend § I.3 inline.
  - 2(e) Stage 1 commit shape: lean single-commit; two-commit
    fallback at agent's discretion at compose time.
- **Item 3 (`v0.1.10` tag):** no intermediate tag. Next tag event is
  `v0.2.0-phase-2` at spec-Phase-2 dispatch.

## 2. Task results

### 2.1 Task 0.0 — Cross-phase replay against `v0.1.0-phase-1`

(FACT — `stage-0-replay-2026-05-23T12-27-48Z.txt` sha256
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

Invocation:
```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Result: **PASS** — exit 0; 8/8 gates PASS; `summary:
prior_phase=v0.1.0-phase-1 ok=True`.

**Replay-output sha256 byte-identical to bit-identity invariant
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`**
established at conventions doc § D.3.

This is the **16th invocation** of the bit-identity invariant
(per MPM landing § 10.3): 6 per-sim sub-phase Stage 0s (closed-form
+ agent-based + RD-3D + sph-water + eulerian-smoke + LBM) + MPM
Stage 0 (15th) + 4 hotfix V validations (replay-tool, numba-
integration, mutation-script, conventions-consolidation V4) + 3
LFS-migration replay verifications. Invariant continues unbroken.

### 2.2 Task 0.1 — Tolerance-budget carryover

(FACT — commit `a44a64b` `chore(conventions-refactor-post-phase-1-
stage0-tolerance): Task 0.1 carryover ...`.)

`tools/testkit/equivalence/tolerance-budget.toml`:
- `[phase].phase = "sub-phase-conventions-refactor-post-phase-1"`
- `[phase].opened_at = "2026-05-23T12:27:48Z"`
- **NO `[budgets.*]` widening** per plan § 4.1 Task 0.1.

Mirrors `sub-phase-conventions-consolidation` Stage 0 shape verbatim.

### 2.3 Task 0.2 — Phase 1 evidence sha256 reverify

(FACT — `stage-0-evidence-reverify-2026-05-23T12-27-48Z.txt` sha256
`22b7193713eb8738d94abd086ac74633cb125270d56dc9eba281d9534c634ce0`.)

All 9 per-sim Phase 1 RED evidence sha256s **byte-identical** to
MPM landing § 6.2 baseline:

| Sim | Phase 1 RED evidence sha256 | Status |
|---|---|---|
| strange-attractors | `c4f72e25…04cac63` | unchanged ✓ |
| mandelbulb-explorer | `d4a89d3e…b37e2ca0` | unchanged ✓ |
| boids-3d | `7d59ffdb…f6e39b7b` | unchanged ✓ |
| physarum | `8ee52dc7…8c043855` | unchanged ✓ |
| reaction-diffusion-3d | `b3165ab1…b2514b96` | unchanged ✓ |
| sph-water | `82fb91bc…40cf12b1f` | unchanged ✓ |
| eulerian-smoke | `c961dd22…14879f23a1` | unchanged ✓ |
| lattice-boltzmann-d3q19 | `c78de8be…b4b6ef3cd` | unchanged ✓ |
| mpm-multimaterial | `a57251a1…81bb9edf94` | unchanged ✓ |

Plus the post-implementation "implemented" evidence files (all 9
sims) at their landing sha256s, and the legacy `reaction-diffusion-
2d-ref-2026-05-19T15-43-23Z.txt` from Phase 1. All accounted for.

### 2.4 Task 0.3 — Conventions doc reverify + section baseline

(FACT — `stage-0-section-baseline-2026-05-23T12-27-48Z.txt` sha256
`c1512413c225b0376f944292bb86f68c45890ffdd6d82fe0a03d8b51cf3a28d5`.)

**Full-doc sha256 at HEAD:**
`004d70117e01b3824a8b54e4c34963969ad0a4188b87f7acbca01dea9600a3e6`
— **byte-identical** to the value recorded in the conventions-
consolidation landing audit `evidence_hashes` row for
`docs/conventions/sub-phase-conventions.md`. Document content
unchanged since `34c7d34` (conventions-consolidation landing).

**Affected-section content sha256 (pre-Stage-1 baseline):**

| Section | Line span | content_sha256 | Item |
|---|---:|---|---|
| § B.2 | 72-87 | `b5b5911d…1177d6eb` | F |
| § B.3 | 88-105 | `95365044…ef808226` | E (front-matter row footnote) |
| § I.3 | 386-389 | `9e4514ae…5101fc1e` | C |
| § J.3 | 424-438 | `b5605797…df30fb4c` | D |
| § N | 631-678 | `248b510d…6e49058b2` | A |
| § L | 495-532 | `37f8bd93…23d91d6966` | B (anchor before new § P) |
| § M | 533-628 | `80032f2b…0deaffb95ceb3` | B (anchor after new § P) |

**Section-anchor confirmation at HEAD:**
- § L at line 495; § M at line 533. New § P (Item B) lands between
  them per operator routing 2(a). § M shifts down post-insertion.
- § J at line 402; existing § J.5 ends at line ~448. New § J.6
  (Item G) and § J.7 (Item H) land after § J.5 before § K (line
  449). No existing-section content displaced.
- § B.5 at line 136; § B ends before § C at line 142. New § B.6
  (Item E) lands after § B.5 before § C. No existing-section
  content displaced.

**Capture-cadence-section absence confirmed.** `grep -n -i
"cadence\|capture cadence\|every-50\|every-100"` returns only §
A.2 "Three-stage cadence" (sub-phase cadence, not capture cadence)
and § N example mention of "capture downsampling cadence" as a
routing-option enumeration. No dedicated capture-cadence section
exists. Item B is confirmed ADD, not edit, consistent with plan
§ 2.B.

**Re-anchoring note (per plan § 4.1 Task 0.3):** The plan's
target-line-spans for the 4 affected existing sub-sections (§ B.2,
§ I.3, § J.3, § N) are accurate within ±2 lines (plan written
against the same `004d7011…600a3e6` HEAD; no commits to the
conventions doc between plan-drafting at `402e5c4` and Stage 0
dispatch at HEAD `a44a64b`). No re-anchoring shift required for
Stage 1.

### 2.5 Task 0.4 — SKIPPED

(Per plan § 1.3.) **Doc-only refactor; no canonical capture; no
implementation perf surface; conventions doc § N Task 0.4
(canonical-descriptor scope-analysis) targets sub-phases producing
canonical captures.** This sub-phase produces zero capture artifacts
and exercises zero implementation perf surface. § N Task 0.4 is
explicitly inapplicable.

Stage 0 records the skip with rationale per plan § 4.1.

## 3. Cumulative-shift inheritance

(FACT — MPM landing § 8.3.) **85 cumulative shifts** entering this
sub-phase from the per-sim Phase 1 arc:

- 21 (Phase 1 baseline) + 11 (closed-form) + 10 (agent-based) +
  6 (RD-3D) + 13 (sph-water) + 8 (eulerian-smoke) + 9 (LBM) +
  7 (MPM) = **85**.

No new shifts surfaced during Stage 0. Stage 0 is mechanical
pre-flight; the only new state is: (a) tolerance-budget carryover
(commit `a44a64b`); (b) the Stage 0 audit artifacts.

Hotfix sub-phases (replay-tool, numba-integration, mutation-script,
conventions-consolidation, git-lfs-migration) are audit-chained as
siblings, not children, and their shifts are NOT counted into the
per-sim cumulative per conventions doc § O.

## 4. Stage 0 commits (pre-back-fill)

| # | SHA | Subject |
|---|---|---|
| 1 | `a44a64b` | `chore(conventions-refactor-post-phase-1-stage0-tolerance): Task 0.1 carryover to sub-phase-conventions-refactor-post-phase-1` |
| 2 | `(this commit)` | `chore(conventions-refactor-post-phase-1-stage0-checkpoint): Stage 0 close + pre-flight artifacts` |
| 3 | `(back-fill commit)` | `chore(conventions-refactor-post-phase-1-stage0-sha-backfill): back-fill checkpoint head_sha per Convention #12` |

## 5. Ready for Stage 1 dispatch

Pre-flight artifacts captured. Conventions doc baseline established.
Stage 1 entry conditions met:

- ✓ Bit-identity invariant held (Task 0.0).
- ✓ Tolerance-budget carryover landed (Task 0.1).
- ✓ All 9 sims' Phase 1 RED evidence sha256s byte-identical (Task 0.2).
- ✓ Conventions doc full-doc + per-section baselines captured
  (Task 0.3).
- ✓ Task 0.4 SKIPPED with documented rationale.

**Stage 1 dispatch is operator-routable in a fresh session against
the plan at `docs/phases/sub-phase-conventions-refactor-post-
phase-1.md` § 4.2.** Stage 1 implements the 8 refactor items A–H
in a single sub-bundle commit (or two-commit fallback at agent's
discretion at compose time per operator routing 2(e)).

Stage 0 verdict: **PASS**.
