# `tools/lfs/` — Cloudflare R2 LFS transfer-agent tooling

Operational tooling for routing git-LFS object transfers to **Cloudflare R2** via
the [`lfs-s3`](https://github.com/nicolas-graves/lfs-s3) custom-transfer agent.
Landed by `sub-phase-lfs-architecture` Stage 1b. Authoritative design:
`docs/phases/sub-phase-lfs-architecture.md` §§ 5–6 (+ the Stage-1b amendment block).

## The trusted-config (per-job / opt-in) model — the end state

`lfs-s3` activates **only** by setting `lfs.standalonetransferagent lfs-s3`. By
git-lfs security design, that key (and `lfs.customtransfer.*.path`) is honored
**only from the user's trusted `.git/config`** — git-lfs **ignores it from an
in-repo `.lfsconfig`** (it can execute arbitrary binaries on clone). So there is
**no committed-config way** to make R2 the default backend; R2 is **opt-in via
trusted `.git/config`**. (M5 re-characterization — see the charter
**AMENDMENT — Stage 1c / M5** block; verified on git-lfs 3.4.1 + 3.7.1.)

This is the steady state, and it is the more robust one:

- **CI** opts in per job: a workflow that needs R2 sources `setup-lfs-s3.sh`, which
  installs the agent + writes `git config --local` for **that checkout only**. The
  bandwidth-load-bearing workflows (`python-strict`, `cpp-strict`) fetch from R2 this
  way — which is what relieves the throttled GitHub-LFS bandwidth.
- **Local dev** opts in with a one-command bootstrap (below).
- **Anyone who has not opted in** resolves LFS via GitHub LFS exactly as before —
  this is **D4, now steady-state fallback** (not a transitional phase). Objects
  remain in GitHub LFS; turning it off entirely (M6 → "R2 only") is deferred
  indefinitely. Fresh clones therefore work **without** R2 credentials.

## `setup-lfs-s3.sh`

`source` it (do not execute — it exports env + configures the local repo):

```bash
source tools/lfs/setup-lfs-s3.sh
git lfs pull --include="tests/fixtures/legacy-captures/**"
```

Required env (CI sets these from repo secrets; lfs-s3 reads the `AWS_*`/`S3_*`
vars directly, so credentials never enter git config or process args):

| Env var | Source |
|---|---|
| `R2_ACCOUNT_ID` | `secrets.R2_ACCOUNT_ID` (builds the S3 endpoint) |
| `AWS_ACCESS_KEY_ID` | `secrets.R2_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `secrets.R2_SECRET_ACCESS_KEY` |
| `S3_BUCKET` | `secrets.R2_BUCKET_NAME` |
| `AWS_REGION` | optional, default `auto` |

The S3 endpoint is constructed at runtime as
`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.

## Local developer setup (opt into R2)

R2 routing is **optional** locally — without it your clone uses GitHub LFS (the
steady-state fallback), so a plain `git clone` works with no R2 credentials. To
route LFS through R2 (faster, off the throttled GitHub-LFS bandwidth), opt in once
per clone with your **own scoped** R2 token (never the CI secrets):

```bash
# 1. install the pinned agent (once per machine)
curl -fsSL https://github.com/nicolas-graves/lfs-s3/releases/download/0.2.2/lfs-s3-linux \
  -o ~/.local/bin/lfs-s3 && chmod +x ~/.local/bin/lfs-s3
# 2. export your R2 token + opt this clone in (writes trusted .git/config)
export R2_ACCOUNT_ID=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... S3_BUCKET=...
source tools/lfs/setup-lfs-s3.sh
```

`setup-lfs-s3.sh` writes `lfs.standalonetransferagent`/`customtransfer.lfs-s3.path`
into this clone's `.git/config` (the *trusted* config git-lfs honors) and exports
the endpoint/region. A committed `.lfsconfig` **cannot** do this — git-lfs ignores
those keys from in-repo config — so this one-time, per-clone step is the supported
path.

## `r2-bulk-upload.sh` — M3 bulk upload (charter § 6 M3)

Uploads the **in-use** LFS objects to R2 via `lfs-s3`, then verifies every object
round-trips back from R2 (`sha256 == OID`). "In use" = the union of objects
referenced by `HEAD` and each prior phase tag (`v0.0.0-phase-0`, `v0.1.0-phase-1`,
`v0.2.0-phase-2`) — **the same set the M4 sweep walks**, so the upload surface and
the verification surface are identical.

It pushes via `git lfs push --object-id <remote> --stdin` over the exact OID list,
**not** `git lfs push --all`: an all-refs walk drags in referenced-by-nothing
historical degenerates (e.g. an empty-file OID from a long-since-fixed `.gitattributes`
glob mismatch) that no inspected ref needs and that aren't in the local cache. This
refines charter § 6 M3's planning-time `git lfs push --all` to the ref-union scope
(see the **AMENDMENT — Stage 1c** block in the charter; operator-ratified).

```bash
# Dry-run (no credentials, no transfer — prints the work-list + JSON manifest):
tools/lfs/r2-bulk-upload.sh --dry-run

# Real upload + full round-trip verify (needs the same R2 env as setup-lfs-s3.sh):
export R2_ACCOUNT_ID=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... S3_BUCKET=...
tools/lfs/r2-bulk-upload.sh 2>&1 | tee /tmp/m3-upload-$(date -u +%Y%m%dT%H%M%SZ).log
```

It `source`s `setup-lfs-s3.sh` for the real upload, so it inherits the **same env
contract** (`R2_ACCOUNT_ID` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` +
`S3_BUCKET`; `AWS_REGION` optional). The dry-run path needs **no** credentials.

- **Idempotent.** Objects are content-addressed (R2 key = OID), so a re-run re-PUTs
  identical bytes — no "already present" query needed (`lfs-s3` exposes none).
- **Verifies every object, not a sample.** Post-upload it re-fetches each object
  from R2 into a *temporary* `lfs.storage` dir (canonical `.git/lfs/objects`
  untouched) and asserts `sha256 == OID`. Any mismatch/absence ⇒ exit 1 (STOP).
- **JSON manifest** (`--manifest <path>`, default `/tmp/m3-bulk-upload-<UTC>.json`):
  per-object `{oid, path, size, push_status, roundtrip_sha256}` — the structured
  M3 evidence pasted into the M3 audit.

## Migration ordering (M3 → M4 → M5)

1. **M3 — CONFIRMED.** `r2-bulk-upload.sh` put every in-use object in R2 (26 OIDs,
   all PASS round-trip). Evidence: `docs/_audits/.../m3-bulk-upload-*.md`.
2. **M4 — CONFIRMED.** `r2-sweep-proof.yml` proved every LFS pointer at `HEAD` + each
   prior phase tag resolves *from R2* (62/62 PASS). Evidence: `.../m4-r2-sweep-proof-*.md`.
3. **M5 — re-characterized (no committed cutover).** A committed `.lfsconfig` cannot
   flip the default (git-lfs ignores the agent keys from in-repo config). R2 stays
   **opt-in via trusted `.git/config`** (CI per-job; local one-command bootstrap above).
   **D4 (GitHub-LFS fallback) is steady-state**, not ended; M6 ("R2 only") stays
   deferred. The CI bandwidth goal is already met by the per-job model.

Each step gated the next; a failure at any step was a HARD RULE 2 STOP (no auto-recover).

## Proof

`.github/workflows/r2-roundtrip-proof.yml` (M2) is a `workflow_dispatch` proof
that the agent reaches R2 with the repo secrets and round-trips an object by
content-OID. Evidence: `docs/_audits/phase-2/sub-phase-lfs-architecture/`.
