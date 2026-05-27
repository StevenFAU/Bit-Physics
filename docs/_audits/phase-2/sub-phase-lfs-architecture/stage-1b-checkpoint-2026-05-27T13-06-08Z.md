---
date: 2026-05-27T13-06-08Z
author: lfs-architecture-stage-1b-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lfs-architecture-stage-1b
stage: stage-1b-checkpoint
verdict: CONFIRMED-Stage-1b-GREEN
head_sha: d361fff2582960b8db84040714537869591224fd
head_sha_at_checkpoint: d361fff2582960b8db84040714537869591224fd
evidence_paths:
  - docs/phases/sub-phase-lfs-architecture.md
  - tools/lfs/setup-lfs-s3.sh
  - .github/workflows/r2-roundtrip-proof.yml
  - .github/workflows/python-strict.yml
  - .github/workflows/cpp-strict.yml
  - docs/_audits/phase-2/sub-phase-lfs-architecture/r2-roundtrip-proof-2026-05-27T12-57-19Z.md
evidence_hashes:
  docs/phases/sub-phase-lfs-architecture.md: sha256:922fb17af9bfa97eb10b965c848a54ff74a392deaa06f1e879c1d5f04be4ab6e
  tools/lfs/setup-lfs-s3.sh: sha256:56637b17351bfb7571dc6f7e31cf56a9f88900e2dbed0c4f3d3cef7e8c9147a0
  .github/workflows/r2-roundtrip-proof.yml: sha256:ca79075b0d10b81b773d807aae5e56a09306bb2cbe6f0b71c41e2a34a45ec32a
  .github/workflows/python-strict.yml: sha256:11672e9670a744c5711c4f92df00176d7b73b7f7cf134bf64fcd5b467919aa93
  .github/workflows/cpp-strict.yml: sha256:2ac93fb14e661d4d6f96e7d92e441d4d9c2ea1004508c079026df15c2b688f72
  docs/_audits/phase-2/sub-phase-lfs-architecture/r2-roundtrip-proof-2026-05-27T12-57-19Z.md: sha256:625f2ab1aadf46384f6001ad3f557dc4ec8d70884c9073ae4cfb799783245f8d
deferred_items:
  - M3 bulk upload of existing objects to R2 (credential + bandwidth-throttle gated)
  - M4 bulk OID sweep from R2 (depends on M3)
  - M5 committed-.lfsconfig cutover (operator-gated)
ci_activation: []
top_level_deps_to_merge: []
---

# Stage 1b checkpoint — sub-phase-lfs-architecture (R2 integration, RED→GREEN)

**Verdict: CONFIRMED-Stage-1b-GREEN.** M1 (per-job lfs-s3 config) + M2 (live R2 round-trip proof)
landed; the selective-fetch cutover (charter § 4.2) set both LFS-fetching workflows to `lfs: false`;
the Stage-1a RED surface is fully GREEN (16/0). All invariants I1–I7 hold through the migration. The
R2 *backend population* track (M3 bulk upload / M4 sweep / M5 committed-`.lfsconfig` cutover) is
**deferred** — it is gated on credentials + the exhausted GitHub-LFS bandwidth quota (§ 10).

## § 1 — Anchor re-check (P1)

Session opened at HEAD `eb4b5f3` (Stage 1a close). The operator's golden-path fix `51e0ee1`
(`docs/architecture.md` § 2.13) was on local `main` above `eb4b5f3` and was pushed as part of the
operator-authorized backlog push (it was explicitly named in the routing). All preconditions PASS:

| Anchor | Expected | At session | Status |
|---|---|---|---|
| HEAD successor of Stage 1a | `eb4b5f3`+ | `eb4b5f3` → built on `51e0ee1` | OK |
| Integrity (I3) | 0 HARD_FAIL | 0 HF / 14 SW | MATCH |
| verify_evidence Stage 1a checkpoint | 6/0 | 6/0 (`897143297f08`) | MATCH |
| Stage-1a surface | 13 passed, 3 xfailed | 13 passed, 3 xfailed | MATCH |
| 4 R2 secrets present | by name | `R2_ACCESS_KEY_ID/SECRET_ACCESS_KEY/ACCOUNT_ID/BUCKET_NAME` (`gh secret list`) | MATCH |
| Charter D-class + § 11 | present | present | MATCH |

**Backlog push (operator-authorized):** the 21-commit chain (Stage 0 + Stage 1a + golden-path fix +
mutation re-tier) was pushed `fd21445..51e0ee1` then advanced through the Stage-1b commits. Branch
ref only — **no tag pushed** (I7). The push red-failed `python-strict` + `cpp-strict` on the GitHub
LFS bandwidth throttle, exactly as the operator predicted (dissolves at the quota reset / R2 routing).

## § 2 — lfs-s3 integration (P2)

(WEB-FETCH 2026-05-27, `github.com/nicolas-graves/lfs-s3`) `lfs-s3` **v0.2.2** (released 2026-04-21;
not stalled). Activates via `lfs.standalonetransferagent lfs-s3` + `lfs.customtransfer.lfs-s3.path`;
reads `S3_BUCKET` / `AWS_S3_ENDPOINT` / `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
from the environment (credentials never enter git config/args). Install: release tags are
**un-prefixed** (`0.2.2`, not `v0.2.2`) so `go install …@vX.Y.Z` does not apply — the linux release
asset `lfs-s3-linux` is downloaded. git-lfs compat tested 3.3.0–3.4.0; the CI runner has
git-lfs 3.7.1 (above the tested ceiling) — the M2 proof exercised it end-to-end with no issue. No
backend switch was needed; `lfs-s3` matches charter § 5.

## § 3 — Per-job config (P3; ratified mechanism substitution)

No committed root `.lfsconfig`. `tools/lfs/setup-lfs-s3.sh` is sourced by a CI job that needs R2; it
installs the agent and registers it as the standalone transfer agent **for that checkout only**,
exporting `AWS_S3_ENDPOINT=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` + `AWS_REGION=auto`.
Rationale (operator-ratified, charter Stage-1b amendment): `lfs.standalonetransferagent` routes ALL
transfers through the agent, so a committed root `.lfsconfig` would impose it on local dev + the 8
non-LFS workflows = the M5 cutover, not the additive M1. The committed `.lfsconfig` is deferred to
§ 6 M5. D4 (GitHub-LFS fallback) is intact: a checkout without R2 config resolves via GitHub LFS.

## § 4 — Workflow LFS-posture audit (P4)

(FACT) After commit 4, **0 of 11 workflows set `lfs: true`** (`grep "lfs: true" .github/workflows/`
→ none).

| Workflow | LFS before | LFS after | Captures needed | R2 secrets |
|---|---|---|---|---|
| `python-strict` | `lfs: true` | `lfs: false` + targeted `git lfs pull --include="tests/fixtures/legacy-captures/**"` | corpus only | — (GitHub LFS path; D4) |
| `cpp-strict` | `lfs: true` | `lfs: false` | none | — |
| `r2-roundtrip-proof` (new) | — | `lfs: false` | none (throwaway) | all 4 (M2 proof) |
| other 8 | none | none | none | — |

Selective fetch (charter § 4.2) drops the dominant per-run term ~20× (python-strict ~4.85 GiB →
~447 MiB; cpp-strict ~4.85 GiB → 0) — backend-independent. No workflow outside `{python-strict,
cpp-strict}` needed LFS (no § P4 STOP). The corpus pull uses **GitHub LFS** (D4 path); routing it
through R2 (zero egress) is the M5 cutover, after M3 populates R2 (§ 10).

## § 5 — M2 proof result

CONFIRMED. `lfs-s3` reached R2 with the repo secrets and round-tripped a git-LFS object by
content-OID (push → drop local cache → fetch → sha256): `sha_before == sha_after == pointer_oid ==
bd22f87b…259cab87`. Run https://github.com/StevenFAU/Bit-Physics/actions/runs/26512325545 (success).
Full evidence + the first-run registration/harness-bug notes:
`docs/_audits/phase-2/sub-phase-lfs-architecture/r2-roundtrip-proof-2026-05-27T12-57-19Z.md`
(verify_evidence 4/0).

## § 6 — Invariants I1–I7 through the migration

| Inv | Check | Result |
|---|---|---|
| I1 | pointer-stub bytes unchanged `eb4b5f3..HEAD`; `test_i1_content_oid` | `git diff` over all LFS paths = empty; 4 passed |
| I2 | phase-1 canonical replay | `ok=True` 8/8 |
| I3 | `integrity --all --mode strict` | 0 HARD_FAIL / 14 SOFT_WARN |
| I4 | append-only workflow + ledger prefix | GREEN (`test_i4_*`) |
| I5 | prior-tag (phase-0/1/2) LFS resolvability | GREEN (`test_i5_*`); GitHub LFS retained (D4) so historical tags resolve as before |
| I6 | back-fill commits separate + doc-only | GREEN (`test_i6_*`) |
| I7 | no tag points into `v0.2.0-phase-2..HEAD` | GREEN; backlog push was branch-only, no tag |

No implementation commit altered a pointer stub (I1 verified after each). The migration touched
only `.lfsconfig`-equivalent config (per-job script), workflows, docs, and tests.

## § 7 — RED→GREEN transition

`pytest tools/testkit/lfs_migration/` → **16 passed, 0 xfailed, 0 failed**. The three Stage-1a RED
tests are GREEN; their `xfail(strict=True)` markers were removed (commit 5). `test_lfsconfig_points_to_r2`
was re-pointed to `test_per_job_r2_transfer_agent_configured` to assert the ratified per-job
mechanism (the committed-`.lfsconfig` assertion became the M5 target); `r2-roundtrip-proof.yml` was
added to the cost-axis requirement registry (`"none"`).

## § 8 — Charter amendments

The Stage-1b amendment (commit 1) is already in the charter: a dated top block + § 6 M1/M5 inline
notes recording the per-job mechanism substitution (no committed root `.lfsconfig` at M1; deferred
to M5). No further charter amendment at this checkpoint. Charter sha256
`76db6139…` (Stage 1a) → `922fb17a…` (Stage 1b amendment).

## § 9 — Stage 1c entry preconditions

- M1 + M2 landed; selective-fetch live; surface 16/0; I1–I7 hold.
- R2 + lfs-s3 + secrets proven end-to-end (M2) — the integration is validated.
- Per-job mechanism + helper (`tools/lfs/setup-lfs-s3.sh`) in place for any R2-routed fetch.

## § 10 — UNKNOWNs / deferred for Stage 1c / operator

- **M3 (bulk upload existing objects → R2) — DEFERRED, gated.** Populating R2 needs R2 credentials
  AND the object bytes in one place. The agent cannot read the secrets (CI-only); a CI-based M3
  must pull the objects from GitHub LFS first, but the **bandwidth quota is exhausted/throttled
  until the ~2026-05-31 reset** — a chicken-and-egg (the throttle we are fixing blocks the
  CI-based migration). Cleanest path: operator runs M3 locally (objects already present; `git lfs
  push` all objects to R2 via the agent with creds), OR a CI M3 after the quota reset. Until M3,
  R2 holds only the M2 test object; the corpus/canonical captures remain GitHub-LFS-resolved.
- **M4 (bulk OID sweep from R2)** — depends on M3.
- **M5 (committed-`.lfsconfig` cutover, routing fetches to R2)** — operator-gated (D3); the bandwidth
  relief in the interim comes from selective fetch (§ 4) + the eventual M3+M5 R2 routing.
- **git-lfs 3.7.1 vs lfs-s3 tested ceiling 3.4.0** — no issue observed at M2; banked.
- **r2-roundtrip-proof push trigger** — a path-filtered push trigger was added (commit `bf968fe`)
  to work around GitHub's slow first-time registration of a `workflow_dispatch`-only workflow; it
  is scoped to the proof's own files and remains manually dispatchable.

## § 11 — CORRECTION (post-checkpoint, commit 8): cpp-strict DOES need a capture

(FACT, surfaced by the live CI run on the push) The § 4 claim "cpp-strict … captures needed: none"
is **FALSIFIED**. The first CI run with `cpp-strict` at `lfs: false` failed: the RD-2D-Stack-C
ctests `rd2d_stack_c_tests` + `rd2d_stack_c_gate14` (the gate-14 cross-stack witness,
`packages/reaction-diffusion-2d-stack-c/tests/python/test_gate14_cross_stack.py`) read the committed
canonical capture `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5`
→ with `lfs: false` and no pull, that file is the pointer stub → `HighFive` "Not an HDF5 file" →
SIGABRT. The probe / charter § 4.1 ("cpp-strict needs zero committed captures") was **wrong** (it
predated / missed the RD-2D-Stack-C ctests).

**Fix (commit 8, still selective):** `cpp-strict` keeps `lfs: false` + adds a targeted
`git lfs pull --include="captures/reaction-diffusion-2d-ref/**"` after the build (≫ smaller than a
full fetch). Cost-axis registry `cpp-strict: none → reference-capture`; the cost-axis
`_sets_lfs_true` matcher was hardened to an exact-line check (a comment mentioning `lfs: true` must
not flag a workflow). Charter § 4.2 cpp-strict bullet corrected. Surface still **16/0**; I1 intact
(no pointer touched).

**CI status note:** both `python-strict` (corpus pull) and `cpp-strict` (reference-capture pull)
now fail on the **GitHub LFS budget throttle** ("This repository exceeded its LFS budget"), NOT a
config defect — the operator-acknowledged state until the ~2026-05-31 quota reset (and dissolved by
the M5 R2-routing once M3 populates R2). The **verdict CONFIRMED-Stage-1b-GREEN stands**: the
selective-fetch design is correct (each workflow pulls only its narrow set), all invariants hold,
the RED surface is GREEN. (verify_evidence on this checkpoint pins charter@`d361fff` = `922fb17a…`,
unaffected by the commit-8 charter correction.)

## Conventions honored

Convention #8 (web-fetched lfs-s3 facts; M2 evidence verbatim incl. the first-run failures; M3/M4
honestly deferred with rationale, not faked; the cpp-strict probe error surfaced + corrected, not
hidden); Convention M (re-anchored at HEAD); per-job mechanism
ratified by operator before edits; `evidence_hashes` as a YAML mapping; cat-4 full-path citations;
no committed credentials; Convention #12 (SHA back-fill is the separate commit 7). No tag pushed (I7).
