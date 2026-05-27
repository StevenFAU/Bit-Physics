---
date: 2026-05-27T12-57-19Z
author: lfs-architecture-stage-1b-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lfs-architecture-stage-1b-m2-proof
stage: stage-1b-m2-proof
verdict: CONFIRMED
head_sha: 9816a57928775027235c180f6d019a53f84a5979
head_sha_at_checkpoint: 9816a57928775027235c180f6d019a53f84a5979
evidence_paths:
  - .github/workflows/r2-roundtrip-proof.yml
  - tools/lfs/setup-lfs-s3.sh
evidence_hashes:
  .github/workflows/r2-roundtrip-proof.yml: sha256:ca79075b0d10b81b773d807aae5e56a09306bb2cbe6f0b71c41e2a34a45ec32a
  tools/lfs/setup-lfs-s3.sh: sha256:56637b17351bfb7571dc6f7e31cf56a9f88900e2dbed0c4f3d3cef7e8c9147a0
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# R2 round-trip M2 proof — sub-phase-lfs-architecture Stage 1b

**Verdict: CONFIRMED.** The `lfs-s3` custom-transfer agent reaches Cloudflare R2 with the
repo's `R2_*` secrets and round-trips a git-LFS object **by content-OID**, byte-exact, through a
full push → drop-local-cache → fetch cycle. This is the M2 gate (charter § 6 M2); it gates the
rest of Stage 1b.

## § 1 — Live CI run (the proof)

- **Workflow:** `.github/workflows/r2-roundtrip-proof.yml` (`workflow_dispatch` + path-filtered
  push; see § 3).
- **Run:** https://github.com/StevenFAU/Bit-Physics/actions/runs/26512325545 (job `78079658494`).
- **Conclusion:** `success` (1m26s). Triggered on `head_sha` `9816a57`.
- **Runner git-lfs:** `git-lfs/3.7.1` (linux amd64, go 1.24.4).

## § 2 — Evidence (verbatim key lines, secrets masked by GitHub as `***`)

```
lfs-s3 ready: /home/runner/.local/bin/lfs-s3 | endpoint=https://***.r2.cloudflarestorage.com bucket=*** region=auto
test object: m2-26512325545.bin  oid=bd22f87b2cc19105ace352e9b5da0394c1b5ea53aebc26d5ef8a4ff5259cab87  sha256=bd22f87b2cc19105ace352e9b5da0394c1b5ea53aebc26d5ef8a4ff5259cab87
--- upload LFS object to R2 via lfs-s3 ---
Uploading LFS objects: 100% (1/1), 4.1 KB | 0 B/s, done.
--- drop every local copy of the object ---
--- fetch object back from R2 via lfs-s3 ---
sha_before=bd22f87b2cc19105ace352e9b5da0394c1b5ea53aebc26d5ef8a4ff5259cab87
sha_after =bd22f87b2cc19105ace352e9b5da0394c1b5ea53aebc26d5ef8a4ff5259cab87
pointer_oid=bd22f87b2cc19105ace352e9b5da0394c1b5ea53aebc26d5ef8a4ff5259cab87
M2 ROUND-TRIP: PASS (content-OID preserved through R2)
```

`sha256(content before upload) == sha256(content after fetch) == pointer OID` — the agent stores
and retrieves by content-OID, so a backend migration that preserves pointer bytes is transparent to
I1 (charter § 7 I1). The local cache (`.git/lfs/objects`) was deleted before the fetch, so the
fetch genuinely retrieved the bytes from R2 (not a local hit).

## § 3 — First-run note (registration workaround, not an R2 issue)

(FACT) The first attempt to trigger the `workflow_dispatch`-only workflow failed: GitHub did not
register the brand-new workflow for dispatch for >7 min (file confirmed on `origin/main`, Actions
enabled, `main` default, yet absent from the `actions/workflows` API; `gh workflow run` 404'd). A
**path-filtered `push` trigger** scoped to the proof's own files (commit `bf968fe`) forced
immediate registration + an automatic run, keeping the workflow manually dispatchable. The first
run then surfaced a **harness bug** (local branch was `master`, so `git lfs push origin main` hit
"Invalid ref argument: main"); note that the same run had already shown `Uploading LFS objects:
100% (1/1) … done` — i.e. **R2 connectivity + credentials + upload were proven even in the failed
run**. Commit `9816a57` fixed the branch (`git init -b main`); the corrected run (§ 1) is a clean
end-to-end PASS. Neither issue was an R2/credential failure.

## § 4 — What M2 establishes for the rest of Stage 1b

- R2 + `lfs-s3` + the operator secrets work end-to-end → commit 4 may route the LFS-fetching
  workflows through R2 via the per-job `tools/lfs/setup-lfs-s3.sh` (charter § 6 M1 amendment).
- The committed repo remains GitHub-LFS-default (no root `.lfsconfig`); R2 is per-job only (D4
  fallback intact). The committed-`.lfsconfig` cutover stays deferred to the operator-gated M5.
- The 4 KiB test object remains in R2 (negligible; not a canonical capture). No committed
  capture/LFS object was touched; I1 pointer bytes unchanged.

## Conventions honored

Convention #8 (verbatim CI evidence; the first-run failure is reported, not hidden — it proved
upload even while failing on a harness bug); `evidence_hashes` as a YAML mapping; cat-4 full-path
citations; no committed credentials (secrets masked by GitHub; read from env by `lfs-s3`). No tag
pushed (I7).
