---
date: 2026-05-26T23-53-24Z
author: lfs-architecture-stage-0-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lfs-architecture-stage-0
stage: stage-0-checkpoint
verdict: CONFIRMED-Stage-0
head_sha: ee9aabb721e9ad198d46c0c5a4bf22f6d0d4c31a
head_sha_at_checkpoint: ee9aabb721e9ad198d46c0c5a4bf22f6d0d4c31a
evidence_paths:
  - docs/planning/bit-physics-master-catalog.md
  - docs/planning/README.md
  - docs/phases/sub-phase-lfs-architecture.md
  - tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md
evidence_hashes:
  docs/planning/bit-physics-master-catalog.md: sha256:361efbd6e18f9664252a692975a03c18dbe4528a858eca86196db910cc445cc9
  docs/planning/README.md: sha256:93e4defeb260916d0b3bb7453daa3b473bdfd3b8d00d4095a4b612d584c68fa9
  docs/phases/sub-phase-lfs-architecture.md: sha256:4597c3ce6909726612637cd634859328683585ba7c509951a53c14ff3898695d
  tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md: sha256:68c6bd42f592cafc5bcb92de628f9daaf74005d4d8f0e146bf2591c127f01bb3
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Stage 0 checkpoint — sub-phase-lfs-architecture

**Verdict: CONFIRMED-Stage-0.** Preconditions for Stage 1a are verified. The catalog is vendored
(UNKNOWN-1 resolved), all in-flight citations re-anchored, D-class routings ratified, anchors
re-checked clean. One rider — the mutation-testing re-tier — is **HELD (SHIFTED-with-notes)** and
routed to the operator; it is not a blocker for Stage 1a (§ 7).

## § 1 — Vendoring (commit 1 `0ae3c57f695e6df18630f445a6ac2b4a8afb8f48`)

(FACT) Source `/home/otacon/Downloads/bit-physics-master-catalog.md` (operator-confirmed) vendored
byte-identical to `docs/planning/bit-physics-master-catalog.md`:

- source sha256 = vendored sha256 = committed-blob sha256 = `361efbd6e18f9664252a692975a03c18dbe4528a858eca86196db910cc445cc9` (MATCH; no hook/EOL mutation — source was clean: 0 trailing-WS lines, final newline, no CRLF).
- 5,252 lines / 364,052 bytes. **0** backtick `path:line` citations (cat4 clean); `integrity --all` is **0 HARD_FAIL** with it tracked. Added `docs/planning/README.md` (directory purpose + inaugural entry). Convention A honored (new-files-first).

(Note — citation correction, Convention #8) The dispatch suggested the README cite catalog "§ 8.3"
for the "planning artifact, not a phase plan" framing; that phrase is actually in the catalog
**preamble at line 8** (`docs/planning/bit-physics-master-catalog.md:8`); § 8.3 is "Cadence". The
README cites the accurate line.

## § 2 — Citation re-anchor (commit 2 `d2df754bb5220fc055e23753ac56b921101caeb3`)

(FACT) All 9 literal `[CATALOG — not in repo]` tags replaced with full-path in-repo citations:

| Old tag | New citation | Files (count) |
|---|---|---|
| `[CATALOG — not in repo]` (meta/posture + tier) | `docs/planning/bit-physics-master-catalog.md:3427` § 41 / re-anchored prose | probe ×1, charter ×2, landing ×1 |
| `[CATALOG — not in repo, § 41.4]` | `docs/planning/bit-physics-master-catalog.md:3489` § 41.4 | probe ×1 |
| `[CATALOG — not in repo, § 35]` | `docs/planning/bit-physics-master-catalog.md:3256` § 35 | probe ×1 |
| `[CATALOG — not in repo, L3381]` | `docs/planning/bit-physics-master-catalog.md:3381` | probe ×1 |
| `[CATALOG — not in repo, § 41 + § 38]` | `…:3427` § 41 + `…:3325` § 38 | charter ×1 |

`grep "CATALOG — not in repo"` across the three in-flight artifacts → **0 matches**. Citation forms
+ provenance only; substantive findings (P1 inventory, tier map, D-leans) untouched. cat1/cat4
**0 HARD_FAIL** on all three; `verify_evidence` on the plan-drafting landing audit **still GREEN**
(4 pass / 0 fail at `head_sha c771d70` — its evidence pins to the pre-re-anchor commit, so it is
unaffected).

## § 3 — Anchor re-check (R1) — HEAD `7215a09` → vendoring chain

(FACT) HEAD at Stage-0 session start was `7215a09` (plan-drafting commit 6); no drift since
plan-drafting. Re-verified findings:

| Finding | Plan-drafting state | HEAD state | Status |
|---|---|---|---|
| P1 LFS inventory | 31 pointers / 26 OIDs / 4.852 GiB physical | `git lfs ls-files --long` → 31 | MATCH |
| P3 workflow count | 10 | `ls .github/workflows/*.yml` → 10 | MATCH |
| P4 verify_evidence (3 audits) | 9/0, 48/0, 13/0 | re-run → 9/0, 48/0, 13/0 | MATCH |
| P7 integrity baseline (I3) | 0 HARD_FAIL / 14 SOFT_WARN | `integrity --all --mode strict` → 0 HF / 14 SW | MATCH |
| P7 replay (I2) | phase-1→`v0.1.0-phase-1` `ok=True` | re-run post-vendoring → `ok=True`, 8/8 | MATCH |

No SHIFTED/DRIFTED rows. The only HEAD change is the Stage-0 chain itself (vendoring + re-anchor +
amendment), which does not alter any probe finding.

## § 4 — Live LFS billing dashboard (R2)

**UNKNOWN-R2 — not provided.** The operator has not pasted the live GitHub LFS
storage-used / bandwidth-used figures from the repo's billing settings. Not fabricated. The
charter § 11 projection stands on inventory-derived figures (4.852 GiB physical < 10 GiB free
storage). **Carried to Stage 1a** as an open input; does not block (per dispatch).

## § 5 — D-class ratification (R3)

(FACT — operator routing, locked into charter § 0 amendment block, commit 3)

| D | Routing | Source |
|---|---|---|
| D1 backend | **R2 via `lfs-s3`** — LOCKED | operator |
| D2 tier count | **5-tier vocab; T1/T2 active, T3–T5 staged** — LOCKED | operator |
| D5 outage | **T1/T2 SOFT_WARN, T3+ HARD_FAIL** — LOCKED | operator |
| D6 path-filter | **per-workflow now; shared filter deferred** — LOCKED | operator |
| D3/D4/D7/D8/D9 | plan-drafting leans **accepted** (no inversion at re-anchor) | inherited |

Charter § 8 lean text stands; the § 0 amendment block records the locks.

## § 6 — Tolerance-budget carryover (R4)

(FACT) `git diff v0.2.0-phase-2 HEAD -- tools/testkit/equivalence/tolerance-budget.toml` → empty.
The budget is unchanged since the phase tag; this is an infrastructure-only sub-phase with **no
tolerance amendments**. No carryover edit needed; recorded explicitly. No file change in commit 3.

## § 7 — Mutation-testing re-tier (R5) — **HELD, routed to operator (SHIFTED-with-notes)**

(FACT) `.github/workflows/mutation-testing.yml` at HEAD: triggers `push: branches:[main]` +
`pull_request`; **no schedule, no `workflow_dispatch`**; `actions/checkout@v6` with **no LFS**;
single job `bash tools/testkit/mutation/run-mutation.sh --baseline` over testkit + integrity.
Catalog `docs/planning/bit-physics-master-catalog.md:3489` § 41.4 places mutation/fuzz at **T4
(weekly)**. The intended re-tier: weekly cron + `workflow_dispatch` + push-to-`main` filtered to
`tools/testkit/mutation/**` / `tools/integrity/**`.

**Downstream-consumer probe (R5):** no other workflow reads mutation output
(`grep mutation .github/workflows/*` → only `mutation-testing.yml`); **no downstream break.**

**STOP-class finding (why HELD):** `mutation-testing.yml` is enumerated under "Required workflows
that must run on `main`" at `docs/ops/branch-protection.md:49-65` (HARD_FAIL-when-they-regress;
active post-Block-9). Re-tiering it to conditional/scheduled triggers risks breaking it as a
**required status check** — a required check that does not run on a given push blocks that
push/merge. Per the Stage-0 dispatch P7 STOP rule ("surface … and STOP before changing the
workflow"), the workflow is **NOT changed**. The re-tier is correct in principle but needs a
**coupled change**: de-list mutation-testing from the required-must-run set in
`docs/ops/branch-protection.md` **and** update the live branch-protection config (operator
action). Routed to operator; folded into a Stage-1a rider or a follow-up once routed.

## § 8 — Charter amendments (commit 3 `ee9aabb721e9ad198d46c0c5a4bf22f6d0d4c31a`)

(FACT) A dated **Stage-0 amendment block** was inserted at the top of
`docs/phases/sub-phase-lfs-architecture.md` (immediately after the title posture blockquote,
before § 0), preserving prior text below. It ratifies D1/D2/D5/D6 (locked) + D3/D4/D7/D8/D9
(leans accepted); records UNKNOWN-1/3 RESOLVED, UNKNOWN-2 open, UNKNOWN-4 operator-pending; and
records the mutation-testing re-tier HOLD. The § 12 UNKNOWN-1 line and § 0 posture note were
re-anchored to the vendored path in commit 2.

## § 9 — Stage 1a entry preconditions confirmed

- HEAD advanced to the Stage-0 chain (vendor → re-anchor → amendment); HEAD at this checkpoint =
  `ee9aabb…` (commit 3).
- I1 (`verify_evidence` offline content-OID): plan-drafting landing audit GREEN; the 3 pinned
  Phase-2 audits 9/0 · 48/0 · 13/0.
- I2 (replay) `ok=True`; I3 (integrity) 0 HARD_FAIL — both re-verified post-vendoring.
- D1 backend LOCKED (R2 via lfs-s3) → Stage 1a/1b can scaffold against a known target.
- Catalog in-repo → tier citations (§ 41 / § 45) resolve for Stage 1a's tier-tagged test surfaces.
- Selective-fetch design (charter § 4.2) ready to scaffold RED in Stage 1a.

## § 10 — UNKNOWNs flagged for Stage 1a

- **UNKNOWN-2 (live LFS dashboard):** still unpasted — attach to anchor § 11 numbers.
- **UNKNOWN-4 (R2 bucket + scoped token):** operator action; § 6 M0 pending. Stage 1a (RED tests)
  does not need credentials; Stage 1b (M2 test-object proof) does.
- **R5 mutation-testing re-tier:** awaiting operator routing of the coupled branch-protection
  de-listing before the workflow can be re-tiered.

## Conventions honored

Convention #8 (no fabrications; dashboard UNKNOWN not invented; § 8.3 citation corrected to the
true line); Convention M (re-anchored against live HEAD before edits); Convention A (vendor =
new-files-first); Cat-1 full-path citations; `evidence_hashes` as a YAML **mapping** (the gotcha
also fixed repo-wide at `71dd892`); Hard Rule 2 (R5 surfaced + STOPped, not unilaterally routed);
Convention #12 (SHA back-fill is the separate commit 5). No tag pushed (I7).
